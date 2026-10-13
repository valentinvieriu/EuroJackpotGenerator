<template>
  <figure class="m-0">
    <!-- Legend doubles as the direct labels: line key, name, latest value -->
    <figcaption
      class="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm"
    >
      <span class="flex items-center gap-2">
        <span class="line-key line-key--paid" aria-hidden="true" />
        <span class="text-content-muted">Paid in</span>
        <span class="font-semibold text-content-primary">
          {{ formatEuro(latest.spent, { decimals: 0 }) }}
        </span>
      </span>
      <span class="flex items-center gap-2">
        <span class="line-key line-key--won" aria-hidden="true" />
        <span class="text-content-muted">Won back</span>
        <span class="font-semibold text-content-primary">
          {{ formatEuro(latest.won, { decimals: 0 }) }}
        </span>
      </span>
      <span class="flex items-center gap-2">
        <span class="band-key" aria-hidden="true" />
        <span class="text-content-muted">Kept by the machine</span>
        <span class="font-semibold text-content-primary">
          {{ formatEuro(latest.spent - latest.won, { decimals: 0 }) }}
        </span>
      </span>
    </figcaption>

    <div ref="plotEl" class="relative w-full min-w-0">
      <svg
        :height="HEIGHT"
        :viewBox="`0 0 ${width} ${HEIGHT}`"
        class="block w-full touch-pan-y outline-none select-none"
        role="img"
        tabindex="0"
        :aria-label="ariaSummary"
        @pointermove="onPointerMove"
        @pointerleave="active = -1"
        @keydown="onKeydown"
        @blur="active = -1"
      >
        <!-- Grid and y axis -->
        <g v-for="tick in yTicks" :key="`y${tick}`">
          <line
            class="grid-line"
            :x1="MARGIN.left"
            :x2="width - MARGIN.right"
            :y1="y(tick)"
            :y2="y(tick)"
          />
          <text
            class="axis-text"
            :x="MARGIN.left - 8"
            :y="y(tick)"
            text-anchor="end"
            dominant-baseline="middle"
          >
            {{ formatEuroCompact(tick) }}
          </text>
        </g>

        <!-- X axis -->
        <text
          v-for="tick in xTicks"
          :key="`x${tick}`"
          class="axis-text"
          :x="x(tick)"
          :y="HEIGHT - 8"
          :text-anchor="
            tick === 0 ? 'start' : tick === xTicks.at(-1) ? 'end' : 'middle'
          "
        >
          {{ formatCount(tick) }}{{ tick === xTicks.at(-1) ? ' draws' : '' }}
        </text>

        <!-- The gap between what went in and what came back -->
        <path class="band" :d="band" />
        <path class="line line--paid" :d="paidLine" />
        <path class="line line--won" :d="wonLine" />

        <template v-if="plotted.length > 0">
          <circle class="dot dot--paid" :cx="end.x" :cy="end.paidY" r="4" />
          <circle class="dot dot--won" :cx="end.x" :cy="end.wonY" r="4" />
        </template>

        <!-- Crosshair snaps to the nearest recorded point -->
        <g v-if="hovered">
          <line
            class="crosshair"
            :x1="hovered.x"
            :x2="hovered.x"
            :y1="MARGIN.top"
            :y2="HEIGHT - MARGIN.bottom"
          />
          <circle
            class="dot dot--paid"
            :cx="hovered.x"
            :cy="hovered.paidY"
            r="4"
          />
          <circle
            class="dot dot--won"
            :cx="hovered.x"
            :cy="hovered.wonY"
            r="4"
          />
        </g>
      </svg>

      <div
        v-if="hovered"
        class="chart-tooltip"
        :style="{
          left: `${hovered.tooltipLeft}px`,
          top: `${MARGIN.top}px`,
        }"
      >
        <div class="mb-1 text-xs text-content-muted">
          After {{ formatCount(hovered.point.draws) }} draws
        </div>
        <div class="tooltip-row">
          <span class="line-key line-key--paid" aria-hidden="true" />
          <strong>{{
            formatEuro(hovered.point.spent, { decimals: 0 })
          }}</strong>
          <span>paid in</span>
        </div>
        <div class="tooltip-row">
          <span class="line-key line-key--won" aria-hidden="true" />
          <strong>{{ formatEuro(hovered.point.won, { decimals: 0 }) }}</strong>
          <span>won back</span>
        </div>
        <div class="tooltip-row">
          <span class="band-key" aria-hidden="true" />
          <strong>
            {{
              formatEuro(hovered.point.spent - hovered.point.won, {
                decimals: 0,
              })
            }}
          </strong>
          <span>kept</span>
        </div>
      </div>
    </div>

    <details class="mt-2 text-sm">
      <summary
        class="cursor-pointer text-content-muted hover:text-content-secondary"
      >
        Show these numbers as a table
      </summary>
      <div class="well mt-2 max-h-56 overflow-auto p-3">
        <table class="w-full text-right tabular-nums">
          <thead>
            <tr class="label-plate">
              <th scope="col" class="pb-1 text-left font-medium">Draws</th>
              <th scope="col" class="pb-1 font-medium">Paid in</th>
              <th scope="col" class="pb-1 font-medium">Won back</th>
              <th scope="col" class="pb-1 font-medium">Kept</th>
            </tr>
          </thead>
          <tbody class="text-content-secondary">
            <tr v-for="point in points" :key="point.draws">
              <th scope="row" class="text-left font-normal">
                {{ formatCount(point.draws) }}
              </th>
              <td>{{ formatEuro(point.spent) }}</td>
              <td>{{ formatEuro(point.won) }}</td>
              <td>{{ formatEuro(point.spent - point.won) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import {
  linearScale,
  niceTicks,
  linePath,
  bandPath,
  nearestIndex,
} from '~/utils/chartScale'
import { formatEuro, formatEuroCompact, formatCount } from '~/utils/format'

interface Point {
  draws: number
  spent: number
  won: number
}

interface Props {
  /** Cumulative paid in / won back, ordered by draws */
  points: Point[]
  /** Draws in the full run, so the x axis stays put while the line grows */
  totalDraws: number
  /** Stake per draw, so the y axis stays put while the line grows */
  costPerDraw?: number
}

const props = withDefaults(defineProps<Props>(), { costPerDraw: 0 })

const HEIGHT = 260
const MARGIN = { top: 12, right: 12, bottom: 28, left: 52 }
const TOOLTIP_WIDTH = 168
const DEFAULT_WIDTH = 640

// The SVG is drawn at the container's real pixel width so text never scales
const plotEl = ref<HTMLElement | null>(null)
const width = ref(DEFAULT_WIDTH)
let observer: ResizeObserver | null = null

onMounted(() => {
  if (!plotEl.value) return
  width.value = plotEl.value.clientWidth || DEFAULT_WIDTH
  observer = new ResizeObserver(([entry]) => {
    if (entry) width.value = entry.contentRect.width || DEFAULT_WIDTH
  })
  observer.observe(plotEl.value)
})
onBeforeUnmount(() => observer?.disconnect())

const latest = computed<Point>(
  () => props.points.at(-1) ?? { draws: 0, spent: 0, won: 0 }
)

const xMax = computed(() => Math.max(props.totalDraws, latest.value.draws, 1))
const yTicks = computed(() => {
  const dataMax = Math.max(
    props.costPerDraw * xMax.value,
    ...props.points.map((p) => Math.max(p.spent, p.won)),
    1
  )
  return niceTicks(0, dataMax, 4)
})
const xTicks = computed(() =>
  niceTicks(0, xMax.value, 4).filter((t) => t <= xMax.value)
)

const x = computed(() =>
  linearScale([0, xMax.value], [MARGIN.left, width.value - MARGIN.right])
)
const y = computed(() =>
  linearScale(
    [0, yTicks.value.at(-1) ?? 1],
    [HEIGHT - MARGIN.bottom, MARGIN.top]
  )
)

const plotted = computed(() =>
  props.points.map((point) => ({
    point,
    x: x.value(point.draws),
    paidY: y.value(point.spent),
    wonY: y.value(point.won),
  }))
)

const paidLine = computed(() =>
  linePath(plotted.value.map((p) => [p.x, p.paidY] as const))
)
const wonLine = computed(() =>
  linePath(plotted.value.map((p) => [p.x, p.wonY] as const))
)
const band = computed(() =>
  bandPath(
    plotted.value.map((p) => [p.x, p.paidY] as const),
    plotted.value.map((p) => [p.x, p.wonY] as const)
  )
)
const end = computed(() => plotted.value.at(-1) ?? { x: 0, paidY: 0, wonY: 0 })

// Hover / keyboard readout
const active = ref(-1)
const hovered = computed(() => {
  const hit = plotted.value[active.value]
  if (!hit) return null
  const preferred = hit.x + 12
  const tooltipLeft =
    preferred + TOOLTIP_WIDTH > width.value
      ? hit.x - 12 - TOOLTIP_WIDTH
      : preferred
  return { ...hit, tooltipLeft: Math.max(0, tooltipLeft) }
})

const onPointerMove = (event: PointerEvent) => {
  const bounds = (event.currentTarget as SVGElement).getBoundingClientRect()
  active.value = nearestIndex(
    plotted.value.map((p) => p.x),
    event.clientX - bounds.left
  )
}

const onKeydown = (event: KeyboardEvent) => {
  const last = plotted.value.length - 1
  if (last < 0) return
  if (event.key === 'ArrowRight') {
    active.value = active.value < 0 ? 0 : Math.min(last, active.value + 1)
  } else if (event.key === 'ArrowLeft') {
    active.value = active.value < 0 ? last : Math.max(0, active.value - 1)
  } else if (event.key === 'Escape') {
    active.value = -1
  } else {
    return
  }
  event.preventDefault()
}

const ariaSummary = computed(() => {
  const { draws, spent, won } = latest.value
  return `Line chart of money paid in and won back over ${formatCount(draws)} draws. Paid in ${formatEuro(spent)}, won back ${formatEuro(won)}, kept by the machine ${formatEuro(spent - won)}. Use the arrow keys to step through the draws.`
})
</script>

<style scoped>
.grid-line {
  stroke: var(--color-chart-grid);
  stroke-width: 1;
}
.axis-text {
  fill: var(--color-content-muted);
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
}

.line {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.line--paid {
  stroke: var(--color-chart-paid);
}
.line--won {
  stroke: var(--color-chart-won);
}
.band {
  fill: var(--color-chart-lost);
  opacity: 0.12;
}

/* End markers and hover dots carry a ring in the surface colour */
.dot {
  stroke: var(--color-surface-card);
  stroke-width: 2;
}
.dot--paid {
  fill: var(--color-chart-paid);
}
.dot--won {
  fill: var(--color-chart-won);
}
.crosshair {
  stroke: var(--color-content-muted);
  stroke-width: 1;
}

.line-key {
  inline-size: 0.875rem;
  block-size: 2px;
  flex: none;
  border-radius: 1px;
}
.line-key--paid {
  background: var(--color-chart-paid);
}
.line-key--won {
  background: var(--color-chart-won);
}
.band-key {
  inline-size: 0.625rem;
  block-size: 0.625rem;
  flex: none;
  border-radius: 2px;
  background: color-mix(in oklab, var(--color-chart-lost) 45%, transparent);
}

.chart-tooltip {
  position: absolute;
  inline-size: 168px;
  padding: 0.5rem 0.625rem;
  border-radius: 0.625rem;
  border: 1px solid oklch(1 0 0 / 0.1);
  background: var(--color-surface-overlay);
  box-shadow: 0 8px 24px -8px oklch(0 0 0 / 0.7);
  pointer-events: none;
  font-size: 0.8125rem;
}
.tooltip-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  line-height: 1.5;
  color: var(--color-content-muted);
}
.tooltip-row strong {
  font-weight: 600;
  color: var(--color-content-primary);
  font-variant-numeric: tabular-nums;
}
</style>
