<template>
  <canvas
    ref="canvasRef"
    class="fixed inset-0 w-full h-full pointer-events-none z-0"
    :style="{ opacity: 0.1 }"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createBallSprite } from '~/utils/ballRenderer'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let worker: Worker | null = null
let workerURL: string | null = null
let ro: ResizeObserver | null = null

// --- Tunables shared with worker (keep in sync) ---
const PARAMS = {
  BALL_COUNT: 30, // Reduced for better performance
  MIN_RADIUS: 14,
  MAX_RADIUS: 26,
  DRAG: 0.996, // per-60fps tick
  NOISE: 0.035, // Brownian accel
  MAX_SPEED: 5.2,
  MIN_SPEED: 0.25,
  SCROLL_GAIN: 0.0016, // scroll delta -> kick
  WHEEL_GAIN: 0.0009, // wheel delta -> kick
  SWIRL: 0.06, // add curl so kicks feel swishy
}

// --- Collision tunables (shared with worker) ---
const COLLISION = {
  ENABLED: true,
  RESTITUTION: 0.9, // bounciness (0..1)
  FRICTION: 0.08, // tangential friction-ish
  POS_CORRECT: 0.8, // how strongly to separate on overlap (0..1)
  ITERATIONS: 2, // solver passes per frame
}

// Fallback state (when OffscreenCanvas isn’t supported)
let fbCtx: CanvasRenderingContext2D | null = null
let fbRAF: number | null = null
let fbW = 0,
  fbH = 0,
  fbDPR = 1
let fbVisible = true
let fbLast = 0
let fbKickX = 0,
  fbKickY = 0
let fbBalls: {
  n: number
  x: number
  y: number
  vx: number
  vy: number
  r: number
  m: number
  im: number
}[] = []
let fbSprites: HTMLCanvasElement[] = []

// Fallback collision grid variables
let fbGS = 0,
  fbInvGS = 0

function fbUpdateGridScale() {
  fbGS = Math.max(1, Math.floor(PARAMS.MAX_RADIUS * 2))
  fbInvGS = 1 / fbGS
}

const fbEPS = 1e-6

function fbGridKey(cx: number, cy: number) {
  return ((cx & 0xffff) << 16) | (cy & 0xffff)
}

function fbBuildGrid(balls: typeof fbBalls) {
  const grid = new Map<number, number[]>()
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i]
    const cx = (b.x * fbInvGS) | 0
    const cy = (b.y * fbInvGS) | 0
    const k = fbGridKey(cx, cy)
    let arr = grid.get(k)
    if (!arr) {
      arr = []
      grid.set(k, arr)
    }
    arr.push(i)
  }
  return grid
}

function fbResolveCollisions(balls: typeof fbBalls) {
  if (!COLLISION.ENABLED) return
  const {
    RESTITUTION: e,
    FRICTION: mu,
    POS_CORRECT: pc,
    ITERATIONS: iters,
  } = COLLISION
  const grid = fbBuildGrid(balls)

  for (let iter = 0; iter < iters; iter++) {
    for (let i = 0; i < balls.length; i++) {
      const A = balls[i]
      const cx = (A.x * fbInvGS) | 0
      const cy = (A.y * fbInvGS) | 0

      for (let ny = -1; ny <= 1; ny++) {
        for (let nx = -1; nx <= 1; nx++) {
          const k = fbGridKey(cx + nx, cy + ny)
          const bucket = grid.get(k)
          if (!bucket) continue

          for (let idx = 0; idx < bucket.length; idx++) {
            const j = bucket[idx]
            if (j <= i) continue
            const B = balls[j]

            const dx = B.x - A.x
            const dy = B.y - A.y
            const rSum = A.r + B.r
            const d2 = dx * dx + dy * dy
            if (d2 >= rSum * rSum) continue

            const dist = Math.sqrt(d2) || fbEPS
            const nxn = dx / dist,
              nyn = dy / dist
            const penetration = rSum - dist

            const imSum = A.im + B.im
            if (imSum > 0) {
              const corr = (penetration * pc) / imSum
              const cxp = nxn * corr,
                cyp = nyn * corr
              A.x -= cxp * A.im
              A.y -= cyp * A.im
              B.x += cxp * B.im
              B.y += cyp * B.im
            }

            const rvx = B.vx - A.vx
            const rvy = B.vy - A.vy
            const vn = rvx * nxn + rvy * nyn
            if (vn > 0) continue

            const jImpulse = (-(1 + e) * vn) / (A.im + B.im)
            const jx = jImpulse * nxn,
              jy = jImpulse * nyn
            A.vx -= jx * A.im
            A.vy -= jy * A.im
            B.vx += jx * B.im
            B.vy += jy * B.im

            let tx = rvx - vn * nxn
            let ty = rvy - vn * nyn
            const tlen = Math.hypot(tx, ty)
            if (tlen > fbEPS) {
              tx /= tlen
              ty /= tlen
              const jt = -((rvx * tx + rvy * ty) / (A.im + B.im))
              const jtClamped = Math.max(
                -mu * jImpulse,
                Math.min(mu * jImpulse, jt)
              )
              const jtx = jtClamped * tx,
                jty = jtClamped * ty
              A.vx -= jtx * A.im
              A.vy -= jty * A.im
              B.vx += jtx * B.im
              B.vy += jty * B.im
            }
          }
        }
      }
    }
  }
}

/* =========================
   Inline Worker (Blob URL)
   ========================= */
function createInlineWorker(): Worker {
  const workerFn = () => {
    // Worker scope
    type InitMsg = {
      type: 'init'
      canvas: OffscreenCanvas
      width: number
      height: number
      dpr: number
      params: typeof PARAMS & { COLLISION: typeof COLLISION }
    }
    type ResizeMsg = {
      type: 'resize'
      width: number
      height: number
      dpr: number
    }
    type KickMsg = {
      type: 'kick'
      dx: number
      dy: number
      src: 'scroll' | 'wheel'
    }
    type VisMsg = { type: 'visibility'; visible: boolean }
    type DisposeMsg = { type: 'dispose' }

    let ctx: OffscreenCanvasRenderingContext2D | null = null
    let W = 0,
      H = 0,
      DPR = 1
    let running = true
    let last = 0

    let P = {
      BALL_COUNT: 30,
      MIN_RADIUS: 14,
      MAX_RADIUS: 26,
      DRAG: 0.996,
      NOISE: 0.035,
      MAX_SPEED: 5.2,
      MIN_SPEED: 0.25,
      SCROLL_GAIN: 0.0016,
      WHEEL_GAIN: 0.0009,
      SWIRL: 0.06,
      COLLISION: {
        ENABLED: true,
        RESTITUTION: 0.9,
        FRICTION: 0.08,
        POS_CORRECT: 0.8,
        ITERATIONS: 2,
      },
    }

    type Ball = {
      n: number
      x: number
      y: number
      vx: number
      vy: number
      r: number
      m: number
      im: number
    }
    let balls: Ball[] = []
    let sprites: ImageBitmap[] = []
    let kickX = 0,
      kickY = 0

    const BALL_PALETTE = {
      midnight: '#0A192F',
      gold: { light: '#FFF1A8', base: '#FFD700', dark: '#B8860B' },
      ivory: '#FFFFF0',
      mutedNavy: '#2C3E50',
      steel: { light: '#3B4B60', mid: '#2C3E50', dark: '#1B2734' },
    }

    function clamp(v: number, min: number, max: number): number {
      return Math.max(min, Math.min(max, v))
    }

    function renderBall(
      ctx: OffscreenCanvasRenderingContext2D,
      cx: number,
      cy: number,
      r: number,
      number: number,
      isGolden: boolean = false
    ): void {
      // Determine colors based on golden state
      const baseLight = isGolden
        ? BALL_PALETTE.gold.light
        : BALL_PALETTE.steel.light
      const baseMid = isGolden ? BALL_PALETTE.gold.base : BALL_PALETTE.mutedNavy
      const baseDark = isGolden
        ? BALL_PALETTE.gold.dark
        : BALL_PALETTE.steel.dark

      ctx.imageSmoothingEnabled = true
      if ('imageSmoothingQuality' in ctx) {
        ctx.imageSmoothingQuality = 'high'
      }

      // 1) Base
      const body = ctx.createRadialGradient(
        cx - r * 0.35,
        cy - r * 0.35,
        r * 0.1,
        cx,
        cy,
        r
      )
      body.addColorStop(0, baseLight)
      body.addColorStop(0.55, baseMid)
      body.addColorStop(1, baseDark)
      ctx.fillStyle = body
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()

      // 2) Simple shadow (faster than AO)
      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.beginPath()
      ctx.arc(cx + r * 0.1, cy + r * 0.1, r * 0.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // 3) Simple highlight (faster than complex gradients)
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.beginPath()
      ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // 4) Rim stroke
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'
      ctx.lineWidth = clamp(r * 0.04, 2, 4)
      ctx.beginPath()
      ctx.arc(cx, cy, r - ctx.lineWidth * 0.6, -0.15 * Math.PI, 0.35 * Math.PI)
      ctx.stroke()

      // 5) Simple text rendering (much faster)
      const text = String(number)
      const fontSize = r * 0.6
      ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const baseText = isGolden ? BALL_PALETTE.midnight : BALL_PALETTE.ivory

      // Simple text with shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillText(text, cx + 1, cy + 1)

      ctx.fillStyle = baseText
      ctx.fillText(text, cx, cy)
    }

    // ===== Collision grid (uniform spatial hash) =====
    let GS = 0,
      invGS = 0 // cell size & reciprocal

    function updateGridScale() {
      GS = Math.max(1, Math.floor(P.MAX_RADIUS * 2))
      invGS = 1 / GS
    }

    // A tiny epsilon to avoid divide-by-zero
    const EPS = 1e-6

    function gridKey(cx: number, cy: number) {
      // pack two 16-bit ints into one 32-bit key
      return ((cx & 0xffff) << 16) | (cy & 0xffff)
    }

    function buildGrid(balls: Ball[]) {
      const grid = new Map<number, number[]>()
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i]
        const cx = (b.x * invGS) | 0
        const cy = (b.y * invGS) | 0
        const k = gridKey(cx, cy)
        let arr = grid.get(k)
        if (!arr) {
          arr = []
          grid.set(k, arr)
        }
        arr.push(i)
      }
      return grid
    }

    function resolveCollisions(balls: Ball[]) {
      if (!P.COLLISION?.ENABLED) return
      const {
        RESTITUTION: e,
        FRICTION: mu,
        POS_CORRECT: pc,
        ITERATIONS: iters,
      } = P.COLLISION
      const grid = buildGrid(balls)

      for (let iter = 0; iter < iters; iter++) {
        for (let i = 0; i < balls.length; i++) {
          const A = balls[i]
          const cx = (A.x * invGS) | 0
          const cy = (A.y * invGS) | 0

          // Check this cell + 8 neighbors
          for (let ny = -1; ny <= 1; ny++) {
            for (let nx = -1; nx <= 1; nx++) {
              const k = gridKey(cx + nx, cy + ny)
              const bucket = grid.get(k)
              if (!bucket) continue

              for (let idx = 0; idx < bucket.length; idx++) {
                const j = bucket[idx]
                if (j <= i) continue // avoid double work
                const B = balls[j]

                const dx = B.x - A.x
                const dy = B.y - A.y
                const rSum = A.r + B.r
                const d2 = dx * dx + dy * dy
                if (d2 >= rSum * rSum) continue

                // Narrow-phase
                const dist = Math.sqrt(d2) || EPS
                const nxn = dx / dist,
                  nyn = dy / dist // collision normal
                const penetration = rSum - dist

                // Positional correction (split by inverse mass)
                const imSum = A.im + B.im
                if (imSum > 0) {
                  const corr = (penetration * pc) / imSum
                  const cxp = nxn * corr,
                    cyp = nyn * corr
                  A.x -= cxp * A.im
                  A.y -= cyp * A.im
                  B.x += cxp * B.im
                  B.y += cyp * B.im
                }

                // Relative velocity
                const rvx = B.vx - A.vx
                const rvy = B.vy - A.vy
                const vn = rvx * nxn + rvy * nyn
                // If separating already, only positional correction above
                if (vn > 0) continue

                // Normal impulse
                const jImpulse = (-(1 + e) * vn) / (A.im + B.im)
                const jx = jImpulse * nxn,
                  jy = jImpulse * nyn
                A.vx -= jx * A.im
                A.vy -= jy * A.im
                B.vx += jx * B.im
                B.vy += jy * B.im

                // Tangential (simple Coulomb-like friction)
                let tx = rvx - vn * nxn
                let ty = rvy - vn * nyn
                const tlen = Math.hypot(tx, ty)
                if (tlen > EPS) {
                  tx /= tlen
                  ty /= tlen
                  // max friction proportional to normal impulse
                  const jt = -((rvx * tx + rvy * ty) / (A.im + B.im))
                  // Clamp by μ * |j|
                  const jtClamped = Math.max(
                    -mu * jImpulse,
                    Math.min(mu * jImpulse, jt)
                  )
                  const jtx = jtClamped * tx,
                    jty = jtClamped * ty
                  A.vx -= jtx * A.im
                  A.vy -= jty * A.im
                  B.vx += jtx * B.im
                  B.vy += jty * B.im
                }
              }
            }
          }
        }
      }
    }

    function drawBallSpriteCanvas(
      num: number,
      r: number,
      dpr: number
    ): OffscreenCanvas {
      const off = new OffscreenCanvas(
        Math.round(r * 2 * dpr),
        Math.round(r * 2 * dpr)
      )
      const g = off.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const cx = r,
        cy = r
      const golden = num % 3 === 0

      renderBall(g, cx, cy, r, num, golden)
      return off
    }

    async function rebuildSprites() {
      const promises: Promise<ImageBitmap>[] = []
      for (const b of balls) {
        const off = drawBallSpriteCanvas(b.n, b.r, DPR)
        promises.push(createImageBitmap(off))
      }
      sprites = await Promise.all(promises)
    }

    function initBalls() {
      balls = []
      for (let i = 1; i <= P.BALL_COUNT; i++) {
        const r = P.MIN_RADIUS + Math.random() * (P.MAX_RADIUS - P.MIN_RADIUS)
        const m = r * r // area-ish; feels good for circles
        const im = 1 / m
        balls.push({
          n: i,
          r,
          m,
          im,
          x: r + Math.random() * (W - 2 * r),
          y: r + Math.random() * (H - 2 * r),
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
        })
      }
    }

    function integrate(dt: number) {
      // decay kicks
      const kickDecayPow = Math.pow(0.88, dt)
      kickX *= kickDecayPow
      kickY *= kickDecayPow
      const dragPow = Math.pow(P.DRAG, dt)
      const noiseScale = Math.sqrt(dt) * P.NOISE
      const cx = W * 0.5,
        cy = H * 0.5

      for (const b of balls) {
        // Brownian + scroll field + swirl
        b.vx +=
          (Math.random() * 2 - 1) * noiseScale +
          (kickX + (-(b.y - cy) / H) * kickY * P.SWIRL) * dt
        b.vy +=
          (Math.random() * 2 - 1) * noiseScale +
          (kickY + ((b.x - cx) / W) * kickX * P.SWIRL) * dt
        b.vx *= dragPow
        b.vy *= dragPow
        b.x += b.vx * dt
        b.y += b.vy * dt
        // walls
        if (b.x - b.r < 0) {
          b.x = b.r
          b.vx = Math.abs(b.vx)
        }
        if (b.x + b.r > W) {
          b.x = W - b.r
          b.vx = -Math.abs(b.vx)
        }
        if (b.y - b.r < 0) {
          b.y = b.r
          b.vy = Math.abs(b.vy)
        }
        if (b.y + b.r > H) {
          b.y = H - b.r
          b.vy = -Math.abs(b.vy)
        }
        // speed clamp
        const s = Math.hypot(b.vx, b.vy)
        if (s > P.MAX_SPEED) {
          const k = P.MAX_SPEED / s
          b.vx *= k
          b.vy *= k
        } else if (s < P.MIN_SPEED) {
          const a = Math.random() * Math.PI * 2
          b.vx += Math.cos(a) * P.MIN_SPEED * 0.5
          b.vy += Math.sin(a) * P.MIN_SPEED * 0.5
        }
      }

      // Resolve collisions last (after positions updated)
      resolveCollisions(balls)
    }

    function render() {
      if (!ctx) return
      ctx.clearRect(0, 0, W, H)
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i]
        const s = sprites[i]
        if (b && s) {
          ctx.drawImage(
            s,
            0,
            0,
            s.width,
            s.height,
            b.x - b.r,
            b.y - b.r,
            b.r * 2,
            b.r * 2
          )
        }
      }
    }

    function loop(now: number) {
      if (!running) return
      const dt = Math.min((now - last) / 16.67, 2)
      last = now
      integrate(dt)
      render()
      // rAF in workers isn’t universal; emulate ~60fps
      // Throttle to 30fps for better performance
      setTimeout(() => loop(performance.now()), 33)
    }

    self.onmessage = async (
      ev: MessageEvent<InitMsg | ResizeMsg | KickMsg | VisMsg | DisposeMsg>
    ) => {
      const msg = ev.data
      if (msg.type === 'init') {
        P = { ...P, ...msg.params }
        W = msg.width
        H = msg.height
        DPR = msg.dpr
        ctx = msg.canvas.getContext('2d', {
          alpha: true,
          desynchronized: true,
          colorSpace: 'display-p3',
        }) as OffscreenCanvasRenderingContext2D
        const c = ctx.canvas as OffscreenCanvas
        c.width = Math.round(W * DPR)
        c.height = Math.round(H * DPR)
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
        ctx.imageSmoothingEnabled = true
        if ('imageSmoothingQuality' in ctx) {
          ctx.imageSmoothingQuality = 'high'
        }

        updateGridScale()
        initBalls()
        await rebuildSprites()
        running = true
        last = performance.now()
        loop(last)
      } else if (msg.type === 'resize') {
        W = msg.width
        H = msg.height
        DPR = msg.dpr
        const c = ctx!.canvas as OffscreenCanvas
        c.width = Math.round(W * DPR)
        c.height = Math.round(H * DPR)
        ctx!.setTransform(DPR, 0, 0, DPR, 0, 0)
        // keep inside + rebuild for crisp DPR text
        for (const b of balls) {
          b.x = Math.max(b.r, Math.min(W - b.r, b.x))
          b.y = Math.max(b.r, Math.min(H - b.r, b.y))
        }
        updateGridScale()
        await rebuildSprites()
      } else if (msg.type === 'kick') {
        const gain = msg.src === 'scroll' ? P.SCROLL_GAIN : P.WHEEL_GAIN
        kickX += msg.dx * gain
        kickY += msg.dy * gain
      } else if (msg.type === 'visibility') {
        running = msg.visible
        if (running) {
          last = performance.now()
          loop(last)
        }
      } else if (msg.type === 'dispose') {
        running = false
        // Clean up ImageBitmap objects to prevent memory leaks
        for (const sprite of sprites) {
          if (sprite && 'close' in sprite) {
            sprite.close()
          }
        }
        sprites = []
        self.close()
      }
    }
  } // end workerFn

  const src = `(${workerFn.toString()})()`
  const blob = new Blob([src], { type: 'application/javascript' })
  const url = URL.createObjectURL(blob)
  workerURL = url
  return new Worker(url, { name: 'balls-worker' })
}

/* =========================
   Main thread glue
   ========================= */
// Removed unused _measure function

let lastSX = 0,
  lastSY = 0
let pendingKicks: { dx: number; dy: number; src: 'scroll' | 'wheel' }[] = []
let kickTimer: number | null = null

const flushKicks = () => {
  if (pendingKicks.length === 0) return

  // Batch all kicks into a single message
  const totalDx = pendingKicks.reduce((sum, kick) => sum + kick.dx, 0)
  const totalDy = pendingKicks.reduce((sum, kick) => sum + kick.dy, 0)

  if (worker) {
    worker.postMessage({
      type: 'kick',
      dx: totalDx,
      dy: totalDy,
      src: 'scroll',
    })
  } else {
    fbKickX += totalDx * PARAMS.SCROLL_GAIN
    fbKickY += totalDy * PARAMS.SCROLL_GAIN
  }

  pendingKicks = []
  kickTimer = null
}

const onScroll = () => {
  const sx = window.scrollX || document.documentElement.scrollLeft || 0
  const sy = window.scrollY || document.documentElement.scrollTop || 0
  const dx = sx - lastSX
  const dy = sy - lastSY
  lastSX = sx
  lastSY = sy

  pendingKicks.push({ dx, dy, src: 'scroll' })

  if (!kickTimer) {
    kickTimer = requestAnimationFrame(flushKicks)
  }
}
const onWheel = (e: WheelEvent) => {
  pendingKicks.push({ dx: e.deltaX, dy: e.deltaY, src: 'wheel' })

  if (!kickTimer) {
    kickTimer = requestAnimationFrame(flushKicks)
  }
}

/* ===== Fallback (no OffscreenCanvas) ===== */
function fbSprite(num: number, r: number, dpr: number) {
  return createBallSprite(num, r, dpr, num % 3 === 0)
}

function fbInit(_el: HTMLCanvasElement) {
  fbBalls = []
  fbUpdateGridScale()
  for (let i = 1; i <= PARAMS.BALL_COUNT; i++) {
    const r =
      PARAMS.MIN_RADIUS +
      Math.random() * (PARAMS.MAX_RADIUS - PARAMS.MIN_RADIUS)
    const m = r * r
    const im = 1 / m
    fbBalls.push({
      n: i,
      r,
      m,
      im,
      x: r + Math.random() * (fbW - 2 * r),
      y: r + Math.random() * (fbH - 2 * r),
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
    })
  }
  fbSprites = fbBalls.map((b) => fbSprite(b.n, b.r, fbDPR))
}

function fbMeasure(el: HTMLCanvasElement) {
  const rect = el.getBoundingClientRect()
  fbW = Math.max(10, rect.width)
  fbH = Math.max(10, rect.height)
  fbDPR = Math.min(window.devicePixelRatio || 1, 2)
  el.width = Math.round(fbW * fbDPR)
  el.height = Math.round(fbH * fbDPR)
  fbCtx!.setTransform(fbDPR, 0, 0, fbDPR, 0, 0)
  fbUpdateGridScale()
}

function fbTick(t = 0) {
  if (!fbCtx) {
    fbRAF = requestAnimationFrame(fbTick)
    return
  }
  if (!fbVisible) {
    fbRAF = requestAnimationFrame(fbTick)
    return
  }
  const dt = Math.min((t - fbLast) / 16.67, 2)
  fbLast = t
  // decay kicks
  fbKickX *= Math.pow(0.88, dt)
  fbKickY *= Math.pow(0.88, dt)
  const dragPow = Math.pow(PARAMS.DRAG, dt)
  const noiseScale = Math.sqrt(dt) * PARAMS.NOISE
  const cx = fbW * 0.5,
    cy = fbH * 0.5
  for (const b of fbBalls) {
    b.vx +=
      (Math.random() * 2 - 1) * noiseScale +
      (fbKickX + (-(b.y - cy) / fbH) * fbKickY * PARAMS.SWIRL) * dt
    b.vy +=
      (Math.random() * 2 - 1) * noiseScale +
      (fbKickY + ((b.x - cx) / fbW) * fbKickX * PARAMS.SWIRL) * dt
    b.vx *= dragPow
    b.vy *= dragPow
    b.x += b.vx * dt
    b.y += b.vy * dt
    if (b.x - b.r < 0) {
      b.x = b.r
      b.vx = Math.abs(b.vx)
    }
    if (b.x + b.r > fbW) {
      b.x = fbW - b.r
      b.vx = -Math.abs(b.vx)
    }
    if (b.y - b.r < 0) {
      b.y = b.r
      b.vy = Math.abs(b.vy)
    }
    if (b.y + b.r > fbH) {
      b.y = fbH - b.r
      b.vy = -Math.abs(b.vy)
    }
    const s = Math.hypot(b.vx, b.vy)
    if (s > PARAMS.MAX_SPEED) {
      const k = PARAMS.MAX_SPEED / s
      b.vx *= k
      b.vy *= k
    } else if (s < PARAMS.MIN_SPEED) {
      const a = Math.random() * Math.PI * 2
      b.vx += Math.cos(a) * PARAMS.MIN_SPEED * 0.5
      b.vy += Math.sin(a) * PARAMS.MIN_SPEED * 0.5
    }
  }

  // Resolve collisions
  fbResolveCollisions(fbBalls)

  fbCtx.clearRect(0, 0, fbW, fbH)
  for (let i = 0; i < fbBalls.length; i++) {
    const b = fbBalls[i]
    const s = fbSprites[i]
    if (s && fbCtx) {
      fbCtx.drawImage(
        s,
        0,
        0,
        s.width,
        s.height,
        b.x - b.r,
        b.y - b.r,
        b.r * 2,
        b.r * 2
      )
    }
  }
  fbRAF = requestAnimationFrame(fbTick)
}

/* ===== Mount ===== */
onMounted(() => {
  const el = canvasRef.value
  if (!el) return
  const supportsOffscreen: boolean =
    'transferControlToOffscreen' in HTMLCanvasElement.prototype

  if (supportsOffscreen) {
    // Measure once before transfer
    const rect = el.getBoundingClientRect()
    const initW = Math.max(10, rect.width)
    const initH = Math.max(10, rect.height)
    const initDPR = Math.min(window.devicePixelRatio || 1, 2)

    // Transfer control — never touch el.width/height after this
    const off = (
      el as HTMLCanvasElement & {
        transferControlToOffscreen(): OffscreenCanvas
      }
    ).transferControlToOffscreen()
    worker = createInlineWorker()
    worker.postMessage(
      {
        type: 'init',
        canvas: off as OffscreenCanvas,
        width: initW,
        height: initH,
        dpr: initDPR,
        params: { ...PARAMS, COLLISION },
      },
      [off]
    )

    // ResizeObserver to send CSS size/DPR to worker
    ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      const W = Math.max(10, r.width)
      const H = Math.max(10, r.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      worker?.postMessage({ type: 'resize', width: W, height: H, dpr })
    })
    ro.observe(el)

    // Scroll/wheel/visibility → worker
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: true })
    document.addEventListener('visibilitychange', () => {
      worker?.postMessage({ type: 'visibility', visible: !document.hidden })
    })

    // Pause when not visible in viewport
    const io = new IntersectionObserver(
      (entries) => {
        const on = entries[0]?.isIntersecting ?? true
        worker?.postMessage({ type: 'visibility', visible: on })
      },
      { threshold: 0.05 }
    )
    io.observe(el)
    ;(el as HTMLCanvasElement & { _io?: IntersectionObserver })._io = io
  } else {
    // Fallback: classic canvas on main thread (still sprite cached)
    fbCtx = el.getContext('2d', {
      alpha: true,
      desynchronized: true,
      colorSpace: 'display-p3',
    })
    if (!fbCtx) return
    fbMeasure(el)
    fbInit(el)
    fbRAF = requestAnimationFrame((t) => {
      fbLast = t
      fbTick(t)
    })

    ro = new ResizeObserver(() => fbMeasure(el))
    ro.observe(el)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: true })
    document.addEventListener('visibilitychange', () => {
      fbVisible = !document.hidden
    })

    const io = new IntersectionObserver(
      (entries) => {
        fbVisible = entries[0]?.isIntersecting ?? true
      },
      { threshold: 0.05 }
    )
    io.observe(el)
    ;(el as HTMLCanvasElement & { _io?: IntersectionObserver })._io = io
  }
})

onUnmounted(() => {
  // Clean up pending timer
  if (kickTimer) {
    cancelAnimationFrame(kickTimer)
    kickTimer = null
  }

  if (worker) {
    worker.postMessage({ type: 'dispose' })
    worker.terminate()
    worker = null
  }
  if (workerURL) {
    URL.revokeObjectURL(workerURL)
    workerURL = null
  }
  if (ro) {
    ro.disconnect()
    ro = null
  }
  const el = canvasRef.value
  if (el && (el as HTMLCanvasElement & { _io?: IntersectionObserver })._io) {
    ;(
      el as HTMLCanvasElement & { _io?: IntersectionObserver }
    )._io?.disconnect()
  }
  if (fbRAF) cancelAnimationFrame(fbRAF)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('wheel', onWheel)
})
</script>
