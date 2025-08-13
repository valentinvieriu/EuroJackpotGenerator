<template>
  <canvas
    ref="canvasRef"
    :width="canvasSize"
    :height="canvasSize"
    :class="['ticket-number-3d', 'w-12 h-12', { 'scale-110': isWinner }]"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'

interface Props {
  number: number
  isWinner: boolean
  type?: 'main' | 'euro'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'main',
})

const canvasRef = ref<HTMLCanvasElement>()
const canvasSize = computed(() => 100)

// Gilded Jackpot palette
const palette = {
  midnight: '#0A192F',
  gold: { light: '#FFF1A8', base: '#FFD700', dark: '#B8860B' },
  ivory: '#FFFFF0',
  mutedNavy: '#2C3E50',
  star: { light: '#FFE08A', base: '#FFC107', dark: '#B8860B' },
  // Neutral steel tones for non-winner stars
  steel: { light: '#3B4B60', mid: '#2C3E50', dark: '#1B2734' },
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function drawSphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  isWinner: boolean
) {
  const baseLight = isWinner ? palette.gold.light : '#3B4B60'
  const baseMid = isWinner ? palette.gold.base : palette.mutedNavy
  const baseDark = isWinner ? palette.gold.dark : '#1B2734'

  const g = ctx.createRadialGradient(
    cx - r * 0.35,
    cy - r * 0.35,
    r * 0.1,
    cx,
    cy,
    r
  )
  g.addColorStop(0, baseLight)
  g.addColorStop(0.55, baseMid)
  g.addColorStop(1, baseDark)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  const ao = ctx.createRadialGradient(
    cx + r * 0.35,
    cy + r * 0.35,
    r * 0.2,
    cx + r * 0.35,
    cy + r * 0.35,
    r
  )
  ao.addColorStop(0, 'rgba(0,0,0,0.25)')
  ao.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = ao
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  const spec = ctx.createRadialGradient(
    cx - r * 0.35,
    cy - r * 0.38,
    0,
    cx - r * 0.35,
    cy - r * 0.38,
    r * 0.35
  )
  spec.addColorStop(0, 'rgba(255,255,255,0.85)')
  spec.addColorStop(0.4, 'rgba(255,255,255,0.25)')
  spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spec
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = clamp(r * 0.04, 2, 4)
  ctx.beginPath()
  ctx.arc(cx, cy, r - ctx.lineWidth * 0.6, -0.15 * Math.PI, 0.35 * Math.PI)
  ctx.stroke()

  if (isWinner) {
    const ringGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
    ringGrad.addColorStop(0, palette.gold.light)
    ringGrad.addColorStop(0.5, palette.gold.base)
    ringGrad.addColorStop(1, palette.gold.dark)
    ctx.strokeStyle = ringGrad
    ctx.lineWidth = clamp(r * 0.14, 6, 10)
    ctx.beginPath()
    ctx.arc(cx, cy, r - ctx.lineWidth * 0.5, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  isWinner: boolean
) {
  const innerR = outerR * 0.6
  const spikes = 5

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

  // Choose gold for winners, steel/navy for non-winners
  const baseLight = isWinner ? palette.star.light : palette.steel.light
  const baseMid = isWinner ? palette.star.base : palette.steel.mid
  const baseDark = isWinner ? palette.star.dark : palette.steel.dark

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

  const hi = ctx.createRadialGradient(
    cx - outerR * 0.35,
    cy - outerR * 0.35,
    0,
    cx - outerR * 0.35,
    cy - outerR * 0.35,
    outerR * 0.7
  )
  hi.addColorStop(0, 'rgba(255,255,255,0.5)')
  hi.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = hi
  ctx.fill()

  if (isWinner) {
    const ringGrad = ctx.createLinearGradient(
      cx - outerR,
      cy - outerR,
      cx + outerR,
      cy + outerR
    )
    ringGrad.addColorStop(0, palette.gold.light)
    ringGrad.addColorStop(0.5, palette.gold.base)
    ringGrad.addColorStop(1, palette.gold.dark)
    ctx.strokeStyle = ringGrad
    ctx.lineWidth = clamp(outerR * 0.16, 6, 10)
    ctx.stroke()
  }
}

function render() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const r = Math.min(canvas.width, canvas.height) * 0.4

  if (props.type === 'euro') {
    drawStar(ctx, cx, cy, r, props.isWinner)
  } else {
    drawSphere(ctx, cx, cy, r, props.isWinner)
  }

  const fontSize = canvas.width * 0.32
  ctx.font = `700 ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Text color: gold/steel balls use ivory or midnight for contrast
  const textColor =
    props.type === 'euro'
      ? props.isWinner
        ? palette.midnight
        : palette.ivory
      : props.isWinner
        ? palette.midnight
        : palette.ivory

  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillText(props.number.toString(), cx + 1.2, cy + 1.6)

  ctx.fillStyle = textColor
  ctx.fillText(props.number.toString(), cx, cy)
}

onMounted(() => {
  render()
})

watch([() => props.number, () => props.isWinner, () => props.type], () => {
  render()
})
</script>

<style scoped>
.ticket-number-3d {
  display: block;
}
</style>
