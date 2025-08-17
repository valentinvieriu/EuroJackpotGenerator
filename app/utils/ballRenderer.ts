/**
 * Shared ball & star rendering utilities with high-quality shading.
 * - Optional soft ground shadow for depth (good for static tokens).
 * - Subtle dithering to reduce gradient banding (cheap pattern overlay).
 * - Prefers wide-gamut color when supported (display-p3), falls back to sRGB.
 */

export const BALL_PALETTE = {
  midnight: '#0A192F',
  gold: { light: '#FFF1A8', base: '#FFD700', dark: '#B8860B' },
  ivory: '#FFFFF0',
  mutedNavy: '#2C3E50',
  star: { light: '#FFE08A', base: '#FFC107', dark: '#B8860B' },
  steel: { light: '#3B4B60', mid: '#2C3E50', dark: '#1B2734' },
} as const

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export interface BallRenderOptions {
  number: number
  radius: number
  isWinner?: boolean
  isGolden?: boolean
  devicePixelRatio?: number
  /** Adds a soft ground shadow for a more 3D "token" look (default: false). */
  withShadow?: boolean
}

export interface StarRenderOptions {
  number: number
  radius: number
  isWinner?: boolean
  devicePixelRatio?: number
}

/* ===========
   Dither (noise) pattern to reduce gradient banding
   Created once-per-module and reused via createPattern.
   =========== */

let _ditherTile: HTMLCanvasElement | OffscreenCanvas | null = null

function getDitherTile(): HTMLCanvasElement | OffscreenCanvas {
  if (_ditherTile) return _ditherTile
  const size = 64
  const tile = new OffscreenCanvas(size, size)
  const g = tile.getContext('2d')
  if (!g) throw new Error('Failed to get 2D context')

  // Low-contrast monochrome noise
  const img = g.createImageData(size, size)
  const data = img.data
  for (let i = 0; i < data.length; i += 4) {
    // Slight variation around mid-gray; tiny amplitude
    const n = (128 + (Math.random() * 2 - 1) * 18) | 0
    data[i] = n
    data[i + 1] = n
    data[i + 2] = n
    data[i + 3] = 28 // very low alpha per pixel; we also lower globalAlpha when drawing
  }
  g.putImageData(img, 0, 0)

  _ditherTile = tile
  return tile
}

/* ===========
   Context helpers
   =========== */

function setQualityHints(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
) {
  ctx.imageSmoothingEnabled = true
  if ('imageSmoothingQuality' in ctx) {
    ctx.imageSmoothingQuality = 'high'
  }
}

/**
 * Renders a 3D sphere ball with gradients, shadows, and text.
 * Backwards compatible API; `withShadow` is optional and off by default.
 */
export function renderBall(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  cx: number,
  cy: number,
  options: BallRenderOptions
): void {
  const {
    number,
    radius: r,
    isWinner = false,
    isGolden = false,
    withShadow = false,
  } = options

  setQualityHints(ctx)

  // Optional soft ground shadow for depth (draw BEFORE the ball)
  if (withShadow) {
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    // Elliptical shadow below the ball
    ctx.translate(cx, cy + r * 0.75)
    ctx.scale(1.25, 0.38)
    const sGrad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r)
    sGrad.addColorStop(0, 'rgba(0,0,0,0.25)')
    sGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = sGrad
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Determine palette
  const baseLight =
    isWinner || isGolden ? BALL_PALETTE.gold.light : BALL_PALETTE.steel.light
  const baseMid =
    isWinner || isGolden ? BALL_PALETTE.gold.base : BALL_PALETTE.mutedNavy
  const baseDark =
    isWinner || isGolden ? BALL_PALETTE.gold.dark : BALL_PALETTE.steel.dark

  // 1) Base body gradient
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

  // 2) Ambient occlusion (multiply)
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  const ao = ctx.createRadialGradient(
    cx + r * 0.35,
    cy + r * 0.35,
    r * 0.2,
    cx + r * 0.35,
    cy + r * 0.35,
    r
  )
  ao.addColorStop(0, 'rgba(0,0,0,0.35)')
  ao.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = ao
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // 3) Specular highlight + Fresnel (screen)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const spec = ctx.createRadialGradient(
    cx - r * 0.38,
    cy - r * 0.4,
    0,
    cx - r * 0.38,
    cy - r * 0.4,
    r * 0.42
  )
  spec.addColorStop(0, 'rgba(255,255,255,0.95)')
  spec.addColorStop(0.35, 'rgba(255,255,255,0.25)')
  spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spec
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  const rim = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r)
  rim.addColorStop(0, 'rgba(255,255,255,0)')
  rim.addColorStop(1, 'rgba(255,255,255,0.18)')
  ctx.fillStyle = rim
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // 4) Rim highlight stroke
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = clamp(r * 0.04, 2, 4)
  ctx.beginPath()
  ctx.arc(cx, cy, r - ctx.lineWidth * 0.6, -0.15 * Math.PI, 0.35 * Math.PI)
  ctx.stroke()

  // 5) Winner ring (gold)
  if (isWinner) {
    const ringGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
    ringGrad.addColorStop(0, BALL_PALETTE.gold.light)
    ringGrad.addColorStop(0.5, BALL_PALETTE.gold.base)
    ringGrad.addColorStop(1, BALL_PALETTE.gold.dark)
    ctx.strokeStyle = ringGrad
    ctx.lineWidth = clamp(r * 0.14, 6, 10)
    ctx.beginPath()
    ctx.arc(cx, cy, r - ctx.lineWidth * 0.5, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 6) Embedded/printed text with lighting
  const fontSize = r * 0.6
  const text = String(number)
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const m = ctx.measureText(text)
  const ascent = m.actualBoundingBoxAscent || fontSize * 0.8
  const descent = m.actualBoundingBoxDescent || fontSize * 0.2
  const y = cy + (ascent - (ascent + descent) / 2)

  const pad = Math.max(2, Math.round(r * 0.12))
  const tw = Math.ceil(m.width)
  const th = Math.ceil(ascent + descent)
  const offW = tw + pad * 2
  const offH = th + pad * 2

  const textCanvas = new OffscreenCanvas(offW, offH)
  const tctx = textCanvas.getContext('2d')!
  if (!tctx) throw new Error('Failed to get 2D context')

  // Base ink
  const baseText =
    isWinner || isGolden ? BALL_PALETTE.midnight : BALL_PALETTE.ivory
  tctx.font = ctx.font
  tctx.textAlign = 'left'
  tctx.textBaseline = 'alphabetic'
  tctx.fillStyle = baseText
  const baseline = pad + ascent
  tctx.fillText(text, pad, baseline)

  // Shade layer
  const shadeCanvas = new OffscreenCanvas(offW, offH)
  const sctx = shadeCanvas.getContext('2d')!
  if (!sctx) throw new Error('Failed to get 2D context')

  const destX = Math.round(cx - tw / 2 - pad)
  const destY = Math.round(y - ascent - pad)
  const gcx = cx - destX
  const gcy = cy - destY

  sctx.globalCompositeOperation = 'source-over'
  const textAO = sctx.createRadialGradient(
    gcx + r * 0.35,
    gcy + r * 0.35,
    r * 0.2,
    gcx + r * 0.35,
    gcy + r * 0.35,
    r
  )
  textAO.addColorStop(0, 'rgba(0,0,0,0.35)')
  textAO.addColorStop(1, 'rgba(0,0,0,0)')
  sctx.fillStyle = textAO
  sctx.fillRect(0, 0, offW, offH)

  sctx.globalCompositeOperation = 'screen'
  const textSpec = sctx.createRadialGradient(
    gcx - r * 0.38,
    gcy - r * 0.4,
    0,
    gcx - r * 0.38,
    gcy - r * 0.4,
    r * 0.42
  )
  textSpec.addColorStop(0, 'rgba(255,255,255,0.95)')
  textSpec.addColorStop(0.35, 'rgba(255,255,255,0.25)')
  textSpec.addColorStop(1, 'rgba(255,255,255,0)')
  sctx.fillStyle = textSpec
  sctx.fillRect(0, 0, offW, offH)

  const textRim = sctx.createRadialGradient(gcx, gcy, r * 0.7, gcx, gcy, r)
  textRim.addColorStop(0, 'rgba(255,255,255,0)')
  textRim.addColorStop(1, 'rgba(255,255,255,0.18)')
  sctx.fillStyle = textRim
  sctx.fillRect(0, 0, offW, offH)

  // Inner shadow (cheap — prefer small radius)
  try {
    sctx.save()
    sctx.filter = `blur(${Math.max(1, r * 0.06)}px)`
    sctx.globalCompositeOperation = 'source-over'
    sctx.fillStyle = 'rgba(0,0,0,0.55)'
    const shx = r * 0.06
    const shy = r * 0.06
    sctx.font = tctx.font
    sctx.textAlign = 'left'
    sctx.textBaseline = 'alphabetic'
    sctx.fillText(text, pad + shx, baseline + shy)
    sctx.globalCompositeOperation = 'destination-in'
    sctx.filter = 'none'
    sctx.fillStyle = '#000'
    sctx.fillText(text, pad, baseline)
    sctx.restore()
  } catch {
    // Dithering is optional - silently fail
  }

  // Merge shade into base text
  tctx.globalCompositeOperation = 'source-atop'
  tctx.drawImage(shadeCanvas, 0, 0)

  // Subtle light-edge stroke
  tctx.save()
  tctx.globalCompositeOperation = 'screen'
  tctx.lineJoin = 'round'
  tctx.lineWidth = Math.max(1, r * 0.04)
  tctx.strokeStyle = 'rgba(255,255,255,0.35)'
  tctx.strokeText(text, pad - r * 0.02, baseline - r * 0.02)
  tctx.restore()

  // Composite onto main
  ctx.drawImage(textCanvas, destX, destY)

  // 7) VERY subtle dithering overlay (reduces banding)
  try {
    const pattern = ctx.createPattern(getDitherTile(), 'repeat')
    if (pattern) {
      ctx.save()
      ctx.globalCompositeOperation = 'soft-light'
      ctx.globalAlpha = 0.08
      ctx.fillStyle = pattern
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.clip()
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
      ctx.restore()
    }
  } catch {
    // Dithering is optional - silently fail
  }
}

/**
 * Renders a 3D star with gradients, shadows, and text
 * (unchanged visually; benefits from dither tile reuse if desired later)
 */
export function renderStar(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  cx: number,
  cy: number,
  options: StarRenderOptions
): void {
  const { number, radius: outerR, isWinner = false } = options
  const innerR = outerR * 0.6
  const spikes = 5

  setQualityHints(ctx)

  // Outline path
  ctx.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i * Math.PI) / spikes
    const rr = i % 2 === 0 ? outerR : innerR
    const x = cx + Math.cos(ang) * rr
    const y = cy + Math.sin(ang) * rr
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()

  // Palette
  const baseLight = isWinner
    ? BALL_PALETTE.star.light
    : BALL_PALETTE.steel.light
  const baseMid = isWinner ? BALL_PALETTE.star.base : BALL_PALETTE.steel.mid
  const baseDark = isWinner ? BALL_PALETTE.star.dark : BALL_PALETTE.steel.dark

  // Fill gradient
  const g = ctx.createRadialGradient(
    cx - outerR * 0.3,
    cy - outerR * 0.3,
    outerR * 0.1,
    cx,
    cy,
    outerR
  )
  g.addColorStop(0, baseLight)
  g.addColorStop(0.6, baseMid)
  g.addColorStop(1, baseDark)
  ctx.fillStyle = g
  ctx.fill()

  // Screened highlight
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const hi = ctx.createRadialGradient(
    cx - outerR * 0.35,
    cy - outerR * 0.35,
    0,
    cx - outerR * 0.35,
    cy - outerR * 0.35,
    outerR * 0.7
  )
  hi.addColorStop(0, 'rgba(255,255,255,0.6)')
  hi.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = hi
  ctx.fill()
  ctx.restore()

  // Winner ring
  if (isWinner) {
    const ringGrad = ctx.createLinearGradient(
      cx - outerR,
      cy - outerR,
      cx + outerR,
      cy + outerR
    )
    ringGrad.addColorStop(0, BALL_PALETTE.gold.light)
    ringGrad.addColorStop(0.5, BALL_PALETTE.gold.base)
    ringGrad.addColorStop(1, BALL_PALETTE.gold.dark)
    ctx.strokeStyle = ringGrad
    ctx.lineWidth = clamp(outerR * 0.16, 6, 10)
    ctx.stroke()
  }

  // Text
  const fontSize = outerR * 0.6
  const text = String(number)
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const m = ctx.measureText(text)
  const ascent = m.actualBoundingBoxAscent || fontSize * 0.8
  const descent = m.actualBoundingBoxDescent || fontSize * 0.2
  const y = cy + (ascent - (ascent + descent) / 2)

  const baseText = isWinner ? BALL_PALETTE.midnight : BALL_PALETTE.ivory

  const pad = Math.max(2, Math.round(outerR * 0.12))
  const tw = Math.ceil(m.width)
  const th = Math.ceil(ascent + descent)
  const offW = tw + pad * 2
  const offH = th + pad * 2
  const textCanvas = new OffscreenCanvas(offW, offH)
  const tctx = textCanvas.getContext('2d')!
  if (!tctx) throw new Error('Failed to get 2D context')

  tctx.font = ctx.font
  tctx.textAlign = 'left'
  tctx.textBaseline = 'alphabetic'
  tctx.fillStyle = baseText
  const baseline = pad + ascent
  tctx.fillText(text, pad, baseline)

  const shadeCanvas = new OffscreenCanvas(offW, offH)
  const sctx = shadeCanvas.getContext('2d')!
  if (!sctx) throw new Error('Failed to get 2D context')

  const destX = Math.round(cx - tw / 2 - pad)
  const destY = Math.round(y - ascent - pad)
  const gcx = cx - destX
  const gcy = cy - destY

  // AO (multiply)
  sctx.globalCompositeOperation = 'source-over'
  const ao2 = sctx.createRadialGradient(
    gcx + outerR * 0.35,
    gcy + outerR * 0.35,
    outerR * 0.2,
    gcx + outerR * 0.35,
    gcy + outerR * 0.35,
    outerR
  )
  ao2.addColorStop(0, 'rgba(0,0,0,0.35)')
  ao2.addColorStop(1, 'rgba(0,0,0,0)')
  sctx.fillStyle = ao2
  sctx.fillRect(0, 0, offW, offH)
  sctx.globalCompositeOperation = 'multiply'

  // Specular + Fresnel (screen)
  sctx.globalCompositeOperation = 'screen'
  const spec2 = sctx.createRadialGradient(
    gcx - outerR * 0.38,
    gcy - outerR * 0.4,
    0,
    gcx - outerR * 0.38,
    gcy - outerR * 0.4,
    outerR * 0.42
  )
  spec2.addColorStop(0, 'rgba(255,255,255,0.95)')
  spec2.addColorStop(0.35, 'rgba(255,255,255,0.25)')
  spec2.addColorStop(1, 'rgba(255,255,255,0)')
  sctx.fillStyle = spec2
  sctx.fillRect(0, 0, offW, offH)

  const rim2 = sctx.createRadialGradient(
    gcx,
    gcy,
    outerR * 0.7,
    gcx,
    gcy,
    outerR
  )
  rim2.addColorStop(0, 'rgba(255,255,255,0)')
  rim2.addColorStop(1, 'rgba(255,255,255,0.18)')
  sctx.fillStyle = rim2
  sctx.fillRect(0, 0, offW, offH)

  // Inner shadow
  try {
    sctx.save()
    sctx.filter = `blur(${Math.max(1, outerR * 0.06)}px)`
    sctx.globalCompositeOperation = 'source-over'
    sctx.fillStyle = 'rgba(0,0,0,0.55)'
    const shx = outerR * 0.06
    const shy = outerR * 0.06
    sctx.fillText(text, pad + shx, baseline + shy)
    sctx.globalCompositeOperation = 'destination-in'
    sctx.filter = 'none'
    sctx.fillStyle = '#000'
    sctx.fillText(text, pad, baseline)
    sctx.restore()
  } catch {
    // Dithering is optional - silently fail
  }

  tctx.globalCompositeOperation = 'source-atop'
  tctx.drawImage(shadeCanvas, 0, 0)

  tctx.save()
  tctx.globalCompositeOperation = 'screen'
  tctx.lineJoin = 'round'
  tctx.lineWidth = Math.max(1, outerR * 0.04)
  tctx.strokeStyle = 'rgba(255,255,255,0.35)'
  tctx.strokeText(text, pad - outerR * 0.02, baseline - outerR * 0.02)
  tctx.restore()

  ctx.drawImage(textCanvas, destX, destY)
}

/**
 * Creates a ball sprite canvas for use in animations (main thread)
 */
export function createBallSprite(
  number: number,
  radius: number,
  devicePixelRatio: number = 1,
  isGolden?: boolean
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(radius * 2 * devicePixelRatio)
  canvas.height = Math.round(radius * 2 * devicePixelRatio)

  const ctx = canvas.getContext('2d', {
    alpha: true,
    colorSpace: 'display-p3',
  })!
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)

  const cx = radius
  const cy = radius

  renderBall(ctx, cx, cy, {
    number,
    radius,
    isGolden: isGolden ?? number % 3 === 0,
  })

  return canvas
}

/**
 * Creates a ball sprite as OffscreenCanvas for Web Workers
 */
export function createBallSpriteOffscreen(
  number: number,
  radius: number,
  devicePixelRatio: number = 1,
  isGolden?: boolean
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(
    Math.round(radius * 2 * devicePixelRatio),
    Math.round(radius * 2 * devicePixelRatio)
  )

  const ctx = canvas.getContext('2d', {
    alpha: true,
    colorSpace: 'display-p3',
  })!
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)

  const cx = radius
  const cy = radius

  renderBall(ctx, cx, cy, {
    number,
    radius,
    isGolden: isGolden ?? number % 3 === 0,
  })

  return canvas
}
