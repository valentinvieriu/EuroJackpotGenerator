<template>
  <canvas
    ref="canvasRef"
    :width="canvasSize"
    :height="canvasSize"
    :class="['ticket-number-3d', 'h-12 w-12', { 'scale-110': isWinner }]"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { renderBall, renderStar } from '~/utils/ballRenderer'

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

function render() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const css = canvasSize.value

  // Ensure physical pixels match DPR for crisp text
  const targetW = Math.round(css * dpr)
  const targetH = Math.round(css * dpr)
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW
    canvas.height = targetH
  }

  const ctx = canvas.getContext('2d', {
    alpha: true,
    colorSpace: 'display-p3',
  } as CanvasRenderingContext2DSettings)
  if (!ctx) return

  // Draw in CSS space with DPR transform
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = true
  // Prefer high smoothing quality when available
  if ('imageSmoothingQuality' in ctx) {
    ctx.imageSmoothingQuality = 'high'
  }
  ctx.clearRect(0, 0, css, css)

  const cx = css / 2
  const cy = css / 2
  const r = css * 0.4

  if (props.type === 'euro') {
    renderStar(ctx, cx, cy, {
      number: props.number,
      radius: r,
      isWinner: props.isWinner,
    })
  } else {
    renderBall(ctx, cx, cy, {
      number: props.number,
      radius: r,
      isWinner: props.isWinner,
      withShadow: true,
    })
  }
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
