<template>
  <main
    class="relative z-10 container mx-auto min-h-screen px-4 py-10 sm:py-14"
  >
    <div class="mx-auto max-w-3xl space-y-8">
      <header class="mb-12 text-center">
        <h1 class="text-hero mb-4 text-3xl md:text-4xl">Why we built this</h1>
        <div
          class="mx-auto max-w-2xl space-y-3 text-base text-balance text-content-secondary md:text-lg"
        >
          <p>
            EuroJackpot is built so that its players, taken together, lose. That
            is no secret: it is in the rules.
          </p>
          <p>
            But knowing a number is not the same as feeling it. This machine
            plays by the same rules and lets you play years of draws in seconds,
            so you can see what they do to your money, and decide for yourself.
          </p>
        </div>
      </header>

      <section
        class="casino-card rounded-2xl p-5 sm:p-8"
        aria-labelledby="euro-heading"
      >
        <h2 id="euro-heading" class="about-heading">Where your euro goes</h2>
        <div class="led-panel about-leds mb-6">
          <LedMeter label="Staked" :value="1" />
          <LedMeter label="Paid back on average" :value="LONG_RUN_RETURN" />
        </div>

        <div class="meter-bar euro-bar" role="img" :aria-label="euroBarLabel">
          <div
            v-for="segment in euroSegments"
            :key="segment.key"
            :class="`euro-bar__${segment.key}`"
            :style="{ inlineSize: `${segment.share * 100}%` }"
          />
        </div>
        <ul
          class="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2"
        >
          <li
            v-for="segment in euroSegments"
            :key="segment.key"
            class="flex items-baseline gap-2"
          >
            <span
              :class="`euro-swatch euro-bar__${segment.key}`"
              aria-hidden="true"
            />
            <strong class="font-semibold text-content-primary tabular-nums">
              {{ segmentCents(segment.share) }}
            </strong>
            <span class="text-content-muted">{{ segment.label }}</span>
          </li>
        </ul>

        <p class="mt-6 leading-relaxed text-content-secondary">
          Half of every stake goes into the prize pool. The other half pays for
          lottery tax, the money the states give to public causes, and running
          the game. The pool is not spread evenly: {{ jackpotShareOfPool }}% of
          it goes to the jackpot, which a line hits at odds of 1 in
          {{ jackpotOdds }}.
        </p>
      </section>

      <section
        class="casino-card rounded-2xl p-5 sm:p-8"
        aria-labelledby="lifetime-heading"
      >
        <h2 id="lifetime-heading" class="about-heading">
          {{ LIFETIME_EXAMPLE_YEARS }} years of playing
        </h2>
        <p class="mb-5 text-content-secondary">
          {{ LIFETIME_EXAMPLE_LINES_PER_DRAW }} lines every Tuesday and Friday,
          for {{ LIFETIME_EXAMPLE_YEARS }} years:
        </p>
        <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div
            v-for="tile in lifetimeTiles"
            :key="tile.label"
            class="well stat-tile"
          >
            <dt class="label-plate mb-1">{{ tile.label }}</dt>
            <dd class="stat-tile__value">{{ tile.value }}</dd>
            <dd class="mt-0.5 text-xs text-content-muted">{{ tile.note }}</dd>
          </div>
        </dl>
        <p class="mt-5 leading-relaxed text-content-secondary">
          The {{ formatCents(LONG_RUN_RETURN) }} average is real, but a large
          part of it goes to a few jackpot winners. What a regular player gets
          back is mostly the small prizes.
        </p>
      </section>

      <section
        class="casino-card rounded-2xl p-5 sm:p-8"
        aria-labelledby="smarter-heading"
      >
        <h2 id="smarter-heading" class="about-heading">
          Can you play smarter?
        </h2>
        <p class="mb-5 text-content-secondary">
          Not in a way that changes the
          {{ formatCents(LONG_RUN_RETURN) }}. You can test each of these on the
          machine.
        </p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article v-for="idea in ideas" :key="idea.title" class="well p-4">
            <h3 class="mb-1.5 font-semibold text-content-primary">
              {{ idea.title }}
            </h3>
            <p class="text-sm leading-relaxed text-content-secondary">
              {{ idea.text }}
            </p>
          </article>
        </div>
      </section>

      <section
        class="casino-card rounded-2xl p-5 sm:p-8"
        aria-labelledby="try-heading"
      >
        <h2 id="try-heading" class="about-heading">Try it on the machine</h2>
        <ol class="space-y-4">
          <li
            v-for="(step, index) in steps"
            :key="step.title"
            class="flex items-start gap-4"
          >
            <span class="step-number font-numbers" aria-hidden="true">
              {{ index + 1 }}
            </span>
            <div>
              <h3 class="font-semibold text-content-primary">
                {{ step.title }}
              </h3>
              <p class="text-sm leading-relaxed text-content-secondary">
                {{ step.text }}
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section class="pt-4 text-center" aria-labelledby="decision-heading">
        <h2 id="decision-heading" class="about-heading">Your decision</h2>
        <p
          class="mx-auto mb-8 max-w-2xl leading-relaxed text-balance text-content-secondary"
        >
          Many people play for the few days of hoping, and that can be worth the
          price. If you decide to play, the simulator can fill in Lotto Bayern’s
          form for you with its
          <NuxtLink
            to="/bookmarklet"
            class="text-brand-gold underline underline-offset-4 transition-colors duration-150 hover:text-brand-gold-light"
            >number filler</NuxtLink
          >. Either way, you now know the price.
        </p>
        <NuxtLink
          to="/"
          class="btn-casino-gold focus-gold inline-flex items-center justify-center rounded-2xl px-8 py-4 font-cta text-lg"
        >
          Back to the machine
        </NuxtLink>
      </section>

      <section
        class="well mt-12 p-5 text-sm leading-relaxed text-content-muted sm:p-6"
        aria-labelledby="numbers-heading"
      >
        <h2 id="numbers-heading" class="label-plate mb-3">
          How the numbers are calculated
        </h2>
        <p>
          The odds are calculated exactly from the game format:
          {{ MAIN_NUMBERS_COUNT }} of {{ MAIN_NUMBER_MAX }} numbers and
          {{ EURO_NUMBERS_COUNT }} of {{ EURO_NUMBER_MAX }}. Prizes use the
          prize-class shares in force since March 2022. Real draws vary with the
          jackpot size and the number of winners sharing a prize, but over many
          draws they settle to these averages. Autoplay runs in your browser,
          and you can replay any run exactly from its seed. There are no
          accounts and no money involved.
          <a
            href="https://en.wikipedia.org/wiki/EuroJackpot"
            target="_blank"
            rel="noopener noreferrer"
            class="whitespace-nowrap text-content-secondary underline underline-offset-4 transition-colors duration-150 hover:text-content-primary"
            >EuroJackpot on Wikipedia ↗</a
          >
        </p>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import LedMeter from '~/components/LedMeter.vue'
import {
  ABOUT_AUTOPLAY_EXAMPLES,
  DRAWS_PER_YEAR,
  EURO_NUMBER_MAX,
  EURO_NUMBERS_COUNT,
  EUROJACKPOT_TOTAL_COMBINATIONS,
  LIFETIME_EXAMPLE_LINES_PER_DRAW,
  LIFETIME_EXAMPLE_YEARS,
  MAIN_NUMBER_MAX,
  MAIN_NUMBERS_COUNT,
  SYSTEM_EXAMPLE_EURO,
  SYSTEM_EXAMPLE_MAIN,
} from '~/utils/constants'
import {
  JACKPOT_RETURN,
  LONG_RUN_PRIZES,
  LONG_RUN_RETURN,
  expectedHits,
  splitReturnByTier,
  type PrizeClass,
} from '~/utils/prizeTable'
import { PRICE_PER_LINE, systemPrice } from '~/utils/pricing'
import { combinationCount } from '~/utils/combinatorics'
import {
  formatCents,
  formatCount,
  formatEuro,
  formatOdds,
  formatPlayingTime,
} from '~/utils/format'

const wholeEuro = (amount: number) => formatEuro(amount, { decimals: 0 })

const jackpotOdds = formatCount(EUROJACKPOT_TOTAL_COMBINATIONS)
const jackpotShareOfPool = Math.round((JACKPOT_RETURN / LONG_RUN_RETURN) * 100)

// --- A lifetime of modest, regular playing ---

const lifetimeLines =
  LIFETIME_EXAMPLE_LINES_PER_DRAW * DRAWS_PER_YEAR * LIFETIME_EXAMPLE_YEARS
const lifetimeStake = lifetimeLines * PRICE_PER_LINE
const tiers = splitReturnByTier(lifetimeLines)

// The average prize of the cheapest and dearest class in a tier
const prizeRange = (classes: PrizeClass[]) => {
  const prizes = classes.map((c) => LONG_RUN_PRIZES[c.winClass] ?? 0)
  return { min: Math.min(...prizes), max: Math.max(...prizes) }
}
const smallPrizes = prizeRange(tiers.expectedClasses)
const biggerPrizes = prizeRange(tiers.betweenClasses)

const biggerHits = tiers.betweenClasses.reduce(
  (sum, c) => sum + expectedHits(c.winClass, lifetimeLines),
  0
)

const lifetimeTiles = [
  {
    label: 'You pay in',
    value: wholeEuro(lifetimeStake),
    note: `${formatCount(lifetimeLines)} lines at ${wholeEuro(PRICE_PER_LINE)}`,
  },
  {
    label: 'Small prizes pay back',
    value: `${formatCents(tiers.expected)} per €1`,
    note: `about ${wholeEuro(lifetimeStake * tiers.expected)} in all`,
  },
  {
    label: 'Bigger prizes',
    value: `${biggerHits.toFixed(1)} on average`,
    note: `from ${wholeEuro(biggerPrizes.min)} each`,
  },
  {
    label: 'Chance of a jackpot',
    value: formatOdds(expectedHits(1, lifetimeLines)),
    note: `in all ${LIFETIME_EXAMPLE_YEARS} years`,
  },
]

// --- One euro staked, followed to where it ends up ---

const euroSegments = [
  {
    key: 'small',
    share: tiers.expected,
    label: `small prizes, ${wholeEuro(smallPrizes.min)}–${wholeEuro(smallPrizes.max)} each`,
  },
  {
    key: 'bigger',
    share: tiers.between,
    label: `bigger prizes, from ${wholeEuro(biggerPrizes.min)}`,
  },
  { key: 'jackpot', share: tiers.jackpot, label: 'the jackpot' },
  { key: 'kept', share: 1 - LONG_RUN_RETURN, label: 'kept by the game' },
]

// To a tenth of a cent where needed, so the four parts visibly add up to €1
const segmentCents = (share: number) =>
  formatCents(share, Number.isInteger(Math.round(share * 1000) / 10) ? 0 : 1)

const euroBarLabel = `Of each euro: ${euroSegments
  .map((s) => `${segmentCents(s.share)} ${s.label}`)
  .join(', ')}.`

// --- What people try, and what it changes ---

const systemLines = combinationCount(SYSTEM_EXAMPLE_MAIN, SYSTEM_EXAMPLE_EURO)
const systemCost = wholeEuro(
  systemPrice(SYSTEM_EXAMPLE_MAIN, SYSTEM_EXAMPLE_EURO)
)

const ideas = [
  {
    title: 'Lucky numbers',
    text: `Every combination has the same chance: 1 in ${jackpotOdds}. A birthday is no more and no less likely than any other.`,
  },
  {
    title: 'Hot and cold numbers',
    text: 'The draw has no memory. A number that came up often last year is no more likely next Friday. The machine can weight tickets by past draws: see whether the meter notices.',
  },
  {
    title: 'System tickets',
    text: `A ${SYSTEM_EXAMPLE_MAIN} + ${SYSTEM_EXAMPLE_EURO} system is ${systemLines} ordinary lines for ${systemCost}: ${systemLines} times the chance at ${systemLines} times the price. Per euro, nothing changes. More tickets work the same way.`,
  },
  {
    title: 'Unpopular numbers',
    text: 'They win just as rarely. If they do win, fewer people may share the prize. The machine pays every prize its average, so it does not show that effect.',
  },
]

// --- How to see it for yourself ---

const [shortAutoplay, longAutoplay] = ABOUT_AUTOPLAY_EXAMPLES

const steps = [
  {
    title: 'Spin',
    text: `Each spin buys tickets at ${wholeEuro(PRICE_PER_LINE)} a line and runs one draw. Watch what you paid in and what came back.`,
  },
  {
    title: 'Autoplay',
    text: `×${formatCount(shortAutoplay)} is ${formatPlayingTime(shortAutoplay)} of Tuesdays and Fridays, done in a second. ×${formatCount(longAutoplay)} is ${formatPlayingTime(longAutoplay)}.`,
  },
  {
    title: 'Change anything',
    text: 'Pick your own numbers, play a large system, or weight tickets by past draws, and see whether the meter moves.',
  },
]

useHead({
  title: 'Why we built this - EuroJackpot Simulator',
  meta: [
    {
      name: 'description',
      content:
        'How EuroJackpot works, and what its rules mean for your money: play years of draws in seconds and decide for yourself.',
    },
  ],
})
</script>

<style scoped>
.about-heading {
  margin-block-end: 1rem;
  font-family: var(--font-heading);
  font-size: 1.5rem;
  line-height: 1.25;
  color: var(--color-content-primary);
}

/* Two meters, staked and paid back, side by side at every width */
.about-leds {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

/* One euro, split by where it goes: three shades of prize, then the house */
.euro-bar > div {
  min-inline-size: 2px;
}
.euro-bar > div:first-child {
  border-radius: 9999px 0 0 9999px;
}
.euro-bar > div:last-child {
  border-radius: 0 9999px 9999px 0;
}
.euro-bar__small {
  background: var(--color-chart-won);
}
.euro-bar__bigger {
  background: color-mix(in oklch, var(--color-chart-won) 55%, transparent);
}
.euro-bar__jackpot {
  background: color-mix(in oklch, var(--color-chart-won) 25%, transparent);
}
.euro-bar__kept {
  background: var(--color-chart-lost);
}

.euro-swatch {
  display: inline-block;
  flex-shrink: 0;
  inline-size: 0.625rem;
  block-size: 0.625rem;
  border-radius: 9999px;
  translate: 0 0.05rem;
}

.step-number {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  inline-size: 2rem;
  block-size: 2rem;
  border-radius: 9999px;
  border: 1px solid var(--color-border-secondary);
  color: var(--color-content-primary);
}
</style>
