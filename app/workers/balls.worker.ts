// Module Worker for bouncing balls background
// Reuses shared sprite rendering from app/utils/ballRenderer

import { createBallSpriteOffscreen } from '@/utils/ballRenderer'

type Params = {
  BALL_COUNT: number
  MIN_RADIUS: number
  MAX_RADIUS: number
  DRAG: number
  NOISE: number
  MAX_SPEED: number
  MIN_SPEED: number
  SCROLL_GAIN: number
  WHEEL_GAIN: number
  SWIRL: number
  COLLISION: {
    ENABLED: boolean
    RESTITUTION: number
    FRICTION: number
    POS_CORRECT: number
    ITERATIONS: number
  }
}

type InitMsg = {
  type: 'init'
  canvas: OffscreenCanvas
  width: number
  height: number
  dpr: number
  params: Params
}
type ResizeMsg = { type: 'resize'; width: number; height: number; dpr: number }
type KickMsg = { type: 'kick'; dx: number; dy: number; src: 'scroll' | 'wheel' }
type VisMsg = { type: 'visibility'; visible: boolean }
type DisposeMsg = { type: 'dispose' }

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

let ctx: OffscreenCanvasRenderingContext2D | null = null
let W = 0,
  H = 0,
  DPR = 1
let running = false
let last = 0
let P: Params

let balls: Ball[] = []
let sprites: ImageBitmap[] = []
let kickX = 0,
  kickY = 0

// ===== Collision grid (uniform spatial hash) =====
let GS = 0,
  invGS = 0 // cell size & reciprocal

function updateGridScale() {
  GS = Math.max(1, Math.floor(P.MAX_RADIUS * 2))
  invGS = 1 / GS
}

const EPS = 1e-6
function gridKey(cx: number, cy: number) {
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

      for (let ny = -1; ny <= 1; ny++) {
        for (let nx = -1; nx <= 1; nx++) {
          const k = gridKey(cx + nx, cy + ny)
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

            const dist = Math.sqrt(d2) || EPS
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
            if (tlen > EPS) {
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

function integrate(dt: number) {
  const kickDecayPow = Math.pow(0.88, dt)
  kickX *= kickDecayPow
  kickY *= kickDecayPow
  const dragPow = Math.pow(P.DRAG, dt)
  const noiseScale = Math.sqrt(dt) * P.NOISE
  const cx = W * 0.5,
    cy = H * 0.5

  for (const b of balls) {
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

async function rebuildSprites() {
  const promises: Promise<ImageBitmap>[] = []
  for (const b of balls) {
    const off = createBallSpriteOffscreen(b.n, b.r, DPR, b.n % 3 === 0)
    promises.push(createImageBitmap(off))
  }
  sprites = await Promise.all(promises)
}

function initBalls() {
  balls = []
  for (let i = 1; i <= P.BALL_COUNT; i++) {
    const r = P.MIN_RADIUS + Math.random() * (P.MAX_RADIUS - P.MIN_RADIUS)
    const m = r * r
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

function loop(now: number) {
  if (!running) return
  const dt = Math.min((now - last) / 16.67, 2)
  last = now
  integrate(dt)
  render()
  setTimeout(() => loop(performance.now()), 33)
}

self.onmessage = async (
  ev: MessageEvent<InitMsg | ResizeMsg | KickMsg | VisMsg | DisposeMsg>
) => {
  const msg = ev.data
  if (msg.type === 'init') {
    P = msg.params
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
    for (const sprite of sprites) {
      if (sprite && 'close' in sprite) {
        sprite.close()
      }
    }
    sprites = []
    // In worker context, self.close() ends the worker
    self.close()
  }
}
