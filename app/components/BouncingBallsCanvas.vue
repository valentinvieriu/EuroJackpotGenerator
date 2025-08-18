<template>
  <canvas
    ref="canvasRef"
    class="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-40"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createBallSprite } from '~/utils/ballRenderer'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let worker: Worker | null = null
let ro: ResizeObserver | null = null

// --- Tunables shared with worker (keep in sync) ---
const PARAMS = {
  BALL_COUNT: 22, // Lower for mobile; still lively
  MIN_RADIUS: 16, // Slightly larger = fewer elements, better pop
  MAX_RADIUS: 28,
  DRAG: 0.998, // Smoother motion
  NOISE: 0.025, // Less random accel -> less CPU
  MAX_SPEED: 4.8,
  MIN_SPEED: 0.3,
  SCROLL_GAIN: 0.0014, // gentler kicks
  WHEEL_GAIN: 0.0008,
  SWIRL: 0.07, // a bit more swirl for visual interest
}

// --- Collision tunables (shared with worker) ---
const COLLISION = {
  ENABLED: true,
  RESTITUTION: 0.92, // slightly bouncier
  FRICTION: 0.06, // a touch slipperier
  POS_CORRECT: 0.85, // stronger separation to avoid sticking
  ITERATIONS: 1, // big perf win; looks the same for background flair
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
   Module Worker
   ========================= */
function createModuleWorker(): Worker {
  // Use module worker so we can import shared utilities
  // Path is relative to this file (components -> workers)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - new URL typing in Vite
  return new Worker(new URL('../workers/balls.worker.ts', import.meta.url), {
    type: 'module',
    name: 'balls-worker',
  })
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
    worker = createModuleWorker()
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
