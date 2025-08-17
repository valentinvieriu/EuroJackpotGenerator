/**
 * Shared ball & star rendering utilities with high-quality shading.
 * - Optional soft ground shadow for depth (good for static tokens).
 * - Subtle dithering to reduce gradient banding (cheap pattern overlay).
 * - Prefers wide-gamut color when supported (display-p3), falls back to sRGB.
 *
 * Performance upgrades in this revision:
 * - Caches the text overlay (number glyph with lighting) per (text, radius, color, font).
 * - Quantizes radius in cache key to boost reuse.
 * - Safe OffscreenCanvas fallback helpers (works on main thread & Safari).
 * - Centralized quality hints for all internal canvases/contexts.
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

// (Removed) Previously used color parsing and luminance helpers; no longer needed here.

// (Removed) Unused helper for luminance-based lightness check to satisfy linting.

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
   Environment helpers
   =========== */

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

function hasOffscreen(): boolean {
  return typeof OffscreenCanvas !== 'undefined'
}

function createCanvas(width: number, height: number): AnyCanvas {
  if (hasOffscreen()) {
    return new OffscreenCanvas(width, height)
  }
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas')
    c.width = width
    c.height = height
    return c
  }
  // Last resort
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (globalThis as any).OffscreenCanvas(width, height)
}

function get2D(
  canvas: AnyCanvas,
  opts: CanvasRenderingContext2DSettings = {
    alpha: true,
    colorSpace: 'display-p3',
  }
): Ctx2D {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = (canvas as any).getContext('2d', opts) as Ctx2D
  if (!ctx) throw new Error('Failed to get 2D context')
  setQualityHints(ctx)
  return ctx
}

/* ===========
   Dither (noise) pattern to reduce gradient banding
   Created once-per-module and reused via createPattern.
   =========== */

let _ditherTile: AnyCanvas | null = null

function getDitherTile(): AnyCanvas {
  if (_ditherTile) return _ditherTile
  const size = 64
  const tile = createCanvas(size, size)
  const g = get2D(tile)

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

function setQualityHints(ctx: Ctx2D) {
  ctx.imageSmoothingEnabled = true
  // @ts-expect-error - not on OffscreenCanvasRenderingContext2D in older TS lib
  if ('imageSmoothingQuality' in ctx) {
    // @ts-expect-error -- imageSmoothingQuality exists in browsers but not in older lib types
    ctx.imageSmoothingQuality = 'high'
  }
}

/* ===========
   Text overlay cache (number glyph with lighting & inner shadow)
   =========== */

type TextOverlay = {
  canvas: AnyCanvas
  tw: number
  ascent: number
  descent: number
  pad: number
}

/**
 * Creates (or returns cached) overlay of the number text with its own AO/specular/rim and inner shadow.
 * Cache key is quantized by radius to maximize reuse.
 */
const _textOverlayCache = new Map<string, TextOverlay>()

function getTextOverlay(
  text: string,
  r: number,
  baseTextColor: string,
  font: string
): TextOverlay {
  const quantR = Math.max(1, Math.round(r)) // quantize radius
  const key = `${text}|r=${quantR}|c=${baseTextColor}|f=${font}`
  const hit = _textOverlayCache.get(key)
  if (hit) return hit

  // Measure on a tiny scratch canvas
  const scratch = createCanvas(2, 2)
  const mctx = get2D(scratch)
  mctx.font = font
  mctx.textAlign = 'left'
  mctx.textBaseline = 'alphabetic'
  const m = mctx.measureText(text)
  const fontSize = Number.parseFloat(
    font.match(/(\d+(?:\.\d+)?)px/)?.[1] || '16'
  )
  const ascent = m.actualBoundingBoxAscent || fontSize * 0.8
  const descent = m.actualBoundingBoxDescent || fontSize * 0.2
  const tw = Math.ceil(m.width)
  const th = Math.ceil(ascent + descent)
  const pad = Math.max(2, Math.round(quantR * 0.12))
  const offW = tw + pad * 2
  const offH = th + pad * 2

  // Base text
  const textCanvas = createCanvas(offW, offH)
  const tctx = get2D(textCanvas)
  tctx.font = font
  tctx.textAlign = 'left'
  tctx.textBaseline = 'alphabetic'
  tctx.fillStyle = baseTextColor
  const baseline = pad + ascent
  tctx.fillText(text, pad, baseline)

  // Shade layers (AO, specular, rim, inner shadow) built relative to overlay center
  const shadeCanvas = createCanvas(offW, offH)
  const sctx = get2D(shadeCanvas)

  // Overlay center equals ball center relative to overlay:
  const gcx = tw / 2 + pad
  const gcy = th / 2 + pad

  // AO (multiply)
  sctx.globalCompositeOperation = 'source-over'
  const textAO = sctx.createRadialGradient(
    gcx + quantR * 0.35,
    gcy + quantR * 0.35,
    quantR * 0.2,
    gcx + quantR * 0.35,
    gcy + quantR * 0.35,
    quantR
  )
  textAO.addColorStop(0, 'rgba(0,0,0,0.35)')
  textAO.addColorStop(1, 'rgba(0,0,0,0)')
  sctx.fillStyle = textAO
  sctx.fillRect(0, 0, offW, offH)

  // Specular + Fresnel (screen)
  sctx.globalCompositeOperation = 'screen'
  const textSpec = sctx.createRadialGradient(
    gcx - quantR * 0.38,
    gcy - quantR * 0.4,
    0,
    gcx - quantR * 0.38,
    gcy - quantR * 0.4,
    quantR * 0.42
  )
  textSpec.addColorStop(0, 'rgba(255,255,255,0.95)')
  textSpec.addColorStop(0.35, 'rgba(255,255,255,0.25)')
  textSpec.addColorStop(1, 'rgba(255,255,255,0)')
  sctx.fillStyle = textSpec
  sctx.fillRect(0, 0, offW, offH)

  const textRim = sctx.createRadialGradient(
    gcx,
    gcy,
    quantR * 0.7,
    gcx,
    gcy,
    quantR
  )
  textRim.addColorStop(0, 'rgba(255,255,255,0)')
  textRim.addColorStop(1, 'rgba(255,255,255,0.18)')
  sctx.fillStyle = textRim
  sctx.fillRect(0, 0, offW, offH)

  // Inner shadow
  try {
    sctx.save()
    // @ts-expect-error - filter not always typed
    sctx.filter = `blur(${Math.max(1, quantR * 0.06)}px)`
    sctx.globalCompositeOperation = 'source-over'
    sctx.fillStyle = 'rgba(0,0,0,0.55)'
    const shx = quantR * 0.06
    const shy = quantR * 0.06
    sctx.font = tctx.font
    sctx.textAlign = 'left'
    sctx.textBaseline = 'alphabetic'
    sctx.fillText(text, pad + shx, baseline + shy)
    sctx.globalCompositeOperation = 'destination-in'
    // @ts-expect-error -- filter property not always present in older TS lib definitions
    sctx.filter = 'none'
    sctx.fillStyle = '#000'
    sctx.fillText(text, pad, baseline)
    sctx.restore()
  } catch {
    // Optional
  }

  // Merge shade into base text
  tctx.globalCompositeOperation = 'source-atop'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tctx.drawImage(shadeCanvas as any, 0, 0)

  // Subtle light-edge stroke
  tctx.save()
  tctx.globalCompositeOperation = 'screen'
  tctx.lineJoin = 'round'
  tctx.lineWidth = Math.max(1, quantR * 0.04)
  tctx.strokeStyle = 'rgba(255,255,255,0.35)'
  tctx.strokeText(text, pad - quantR * 0.02, baseline - quantR * 0.02)
  tctx.restore()

  const overlay: TextOverlay = { canvas: textCanvas, tw, ascent, descent, pad }
  _textOverlayCache.set(key, overlay)
  return overlay
}

/* ===========
   Ball rendering
   =========== */

/**
 * Renders a 3D sphere ball with gradients, shadows, and text.
 * Backwards compatible API; `withShadow` is optional and off by default.
 */
export function renderBall(
  ctx: Ctx2D,
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

  // (Removed) Winner ring: keeping surface shading uninterrupted for stronger 3D appearance.
  // if (isWinner) { ... }

  // 6) Embedded/printed text with lighting via cached overlay
  const fontSize = r * 0.6
  const text = String(number)
  const font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`
  const baseText =
    isWinner || isGolden ? BALL_PALETTE.midnight : BALL_PALETTE.ivory

  const overlay = getTextOverlay(text, r, baseText, font)

  // Compute placement to center the overlay on the ball
  const y = cy + (overlay.ascent - (overlay.ascent + overlay.descent) / 2)
  const destX = Math.round(cx - overlay.tw / 2 - overlay.pad)
  const destY = Math.round(y - overlay.ascent - overlay.pad)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx.drawImage(overlay.canvas as any, destX, destY)

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
    // Optional
  }
}

/* ===========
   Star rendering
   =========== */

/**
 * Renders a 3D star with gradients, shadows, and text.
 * Uses the same cached text-overlay mechanism as balls for performance.
 */
export function renderStar(
  ctx: Ctx2D,
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

  // Text (cached overlay)
  const text = String(number)
  const fontSize = outerR * 0.6
  const font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`
  const baseText = isWinner ? BALL_PALETTE.midnight : BALL_PALETTE.ivory
  const overlay = getTextOverlay(text, outerR, baseText, font)

  const y = cy + (overlay.ascent - (overlay.ascent + overlay.descent) / 2)
  const destX = Math.round(cx - overlay.tw / 2 - overlay.pad)
  const destY = Math.round(y - overlay.ascent - overlay.pad)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx.drawImage(overlay.canvas as any, destX, destY)
}

/* ===========
   Sprite helpers
   =========== */

/**
 * Lightweight LRU cache for pre-rendered sprites.
 * Keyed by: version|n|rQ|dprQ|gold|off (off = 1 if OffscreenCanvas)
 */
const SPRITE_CACHE_MAX = 160
const _spriteCache = new Map<string, AnyCanvas>()

function lruSet<K, V>(map: Map<K, V>, key: K, value: V, max: number) {
  map.set(key, value)
  if (map.size > max) {
    const oldest = map.keys().next().value
    map.delete(oldest)
  }
}

function quantizeRadius(r: number): number {
  // Integer px quantization to maximize reuse while keeping crisp edges
  return Math.max(1, Math.round(r))
}

function quantizeDpr(dpr: number): number {
  // Clamp to [1,2] and quantize to quarter steps (1.00, 1.25, 1.5, 1.75, 2.00)
  const clamped = clamp(Number.isFinite(dpr) && dpr > 0 ? dpr : 1, 1, 2)
  return Math.round(clamped * 4) / 4
}

function spriteCacheKey(
  number: number,
  rQ: number,
  dprQ: number,
  isGolden: boolean,
  offscreen: boolean
): string {
  // bump version when changing rendering that affects cache validity
  const VERSION = 'v2'
  return `${VERSION}|n=${number}|r=${rQ}|dpr=${dprQ}|g=${isGolden ? 1 : 0}|off=${offscreen ? 1 : 0}`
}

/**
 * Clear the in-memory sprite cache (both on main thread and in workers).
 * Safe to call any time; next render will repopulate as needed.
 */
export function clearBallSpriteCache(): void {
  _spriteCache.clear()
}

function getOrCreateSpriteCanvas(
  number: number,
  radius: number,
  devicePixelRatio: number,
  isGolden: boolean | undefined,
  offscreen: boolean
): AnyCanvas {
  const rQ = quantizeRadius(radius)
  const dprQ = quantizeDpr(devicePixelRatio || 1)
  const gold = isGolden ?? number % 3 === 0
  const key = spriteCacheKey(number, rQ, dprQ, gold, offscreen)
  const cached = _spriteCache.get(key)
  if (cached) return cached

  // Create appropriate canvas type
  const pxSize = Math.round(rQ * 2 * dprQ)
  const canvas: AnyCanvas = offscreen
    ? new OffscreenCanvas(pxSize, pxSize)
    : (() => {
        const c = document.createElement('canvas')
        c.width = pxSize
        c.height = pxSize
        return c
      })()

  const ctx = get2D(canvas, { alpha: true, colorSpace: 'display-p3' })
  // Render in CSS-space with DPR transform so our drawing math stays in CSS px
  // @ts-expect-error setTransform is on both CanvasRenderingContext2D types
  ctx.setTransform(dprQ, 0, 0, dprQ, 0, 0)
  const cx = rQ
  const cy = rQ

  renderBall(ctx as Ctx2D, cx, cy, {
    number,
    radius: rQ,
    isGolden: gold,
  })

  lruSet(_spriteCache, key, canvas, SPRITE_CACHE_MAX)
  return canvas
}

/**
 * Creates (and caches) a ball sprite canvas for use in animations (main thread).
 * Reuses sprites across similar radii/DPR for big perf wins on resize.
 */
export function createBallSprite(
  number: number,
  radius: number,
  devicePixelRatio: number = 1,
  isGolden?: boolean
): HTMLCanvasElement {
  return getOrCreateSpriteCanvas(
    number,
    radius,
    devicePixelRatio,
    isGolden,
    /* offscreen */ false
  ) as HTMLCanvasElement
}

/**
 * Creates (and caches) a ball sprite as OffscreenCanvas for Web Workers.
 * The worker can then convert to ImageBitmap without re-rendering the ball.
 */
export function createBallSpriteOffscreen(
  number: number,
  radius: number,
  devicePixelRatio: number = 1,
  isGolden?: boolean
): OffscreenCanvas {
  return getOrCreateSpriteCanvas(
    number,
    radius,
    devicePixelRatio,
    isGolden,
    /* offscreen */ true
  ) as OffscreenCanvas
}
