/**
 * Small, dependency-free helpers for the SVG charts.
 */

export type Scale = (value: number) => number

/** Map a value from a numeric domain onto a pixel range. */
export function linearScale(
  [d0, d1]: readonly [number, number],
  [r0, r1]: readonly [number, number]
): Scale {
  const span = d1 - d0
  if (span === 0) return () => r0
  return (value) => r0 + ((value - d0) / span) * (r1 - r0)
}

/**
 * Round tick values (steps of 1, 2 or 5 × 10ⁿ) covering [min, max].
 * The last tick is always ≥ max so the data never touches the plot edge.
 */
export function niceTicks(min: number, max: number, target = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || target < 1) return []
  if (max <= min) return [min]

  const rawStep = (max - min) / target
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const residual = rawStep / magnitude
  const step =
    (residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1) * magnitude

  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let i = 0; start + i * step < max + step; i++) {
    // Multiply rather than accumulate to avoid float drift (0.1 + 0.2…)
    ticks.push(Number((start + i * step).toPrecision(12)))
  }
  return ticks
}

/** SVG path through the given points using straight segments. */
export function linePath(points: ReadonlyArray<readonly [number, number]>) {
  return points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round(x)},${round(y)}`)
    .join(' ')
}

/**
 * Closed SVG path for the band between two lines that share x positions:
 * along `upper` left-to-right, then back along `lower`.
 */
export function bandPath(
  upper: ReadonlyArray<readonly [number, number]>,
  lower: ReadonlyArray<readonly [number, number]>
): string {
  if (upper.length === 0 || lower.length === 0) return ''
  const back = [...lower]
    .reverse()
    .map(([x, y]) => `L${round(x)},${round(y)}`)
    .join(' ')
  return `${linePath(upper)} ${back} Z`
}

/** Index of the value in a sorted ascending array closest to `target`. */
export function nearestIndex(sorted: readonly number[], target: number) {
  if (sorted.length === 0) return -1
  let lo = 0
  let hi = sorted.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if ((sorted[mid] as number) < target) lo = mid
    else hi = mid
  }
  const a = sorted[lo] as number
  const b = sorted[hi] as number
  return Math.abs(target - a) <= Math.abs(b - target) ? lo : hi
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
