<template>
  <div class="relative min-h-screen bg-surface-primary text-content-primary">
    <BouncingBallsCanvas />

    <div class="relative z-10 container mx-auto px-4 py-12">
      <!-- Header Section -->
      <div class="mb-12 text-center">
        <h1 class="text-hero mb-4 text-3xl md:text-4xl">
          About EuroJackpot Simulator
        </h1>
        <p class="text-luxury-subtitle mx-auto max-w-3xl text-base md:text-lg">
          An educational tool designed to demystify lottery mathematics through
          realistic simulations and evidence-based analysis.
        </p>
      </div>

      <!-- Main Content -->
      <div class="mx-auto max-w-4xl space-y-12">
        <!-- Why We Built This -->
        <section class="casino-card rounded-2xl p-8">
          <div class="mb-6 flex items-center gap-3">
            <div class="text-3xl">🎓</div>
            <h2 class="font-heading text-2xl text-brand-gold">
              Why We Built This
            </h2>
          </div>

          <div class="space-y-4 text-content-secondary">
            <p class="text-lg">
              Most lottery players make decisions based on myths rather than
              mathematics. They believe in "lucky numbers," avoid recently drawn
              combinations, or choose birthdays thinking it improves their
              chances.
            </p>
            <p>
              We built this simulator to bridge the gap between lottery
              marketing and mathematical reality. Our mission is simple: help
              people understand what they're really buying when they purchase
              system tickets, and make informed decisions based on evidence
              rather than superstition.
            </p>
            <p>
              This isn't about encouraging gambling—it's about promoting
              mathematical literacy and responsible understanding through
              hands-on exploration.
            </p>
          </div>
        </section>

        <!-- What Value It Provides -->
        <section class="casino-card rounded-2xl p-8">
          <div class="mb-6 flex items-center gap-3">
            <div class="text-3xl">💡</div>
            <h2 class="font-heading text-2xl text-brand-gold">
              What Value It Provides
            </h2>
          </div>

          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-4">
              <div class="flex items-start gap-3">
                <span
                  class="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-premium-emerald-400"
                ></span>
                <div>
                  <h3 class="font-semibold text-content-primary">
                    Understanding System Costs
                  </h3>
                  <p class="text-sm text-content-secondary">
                    See exactly how ticket count and system size affect both
                    your costs and winning probabilities. No hidden
                    surprises—just transparent mathematics.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <span
                  class="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-premium-emerald-400"
                ></span>
                <div>
                  <h3 class="font-semibold text-content-primary">
                    Myth Debunking
                  </h3>
                  <p class="text-sm text-content-secondary">
                    Discover why "lucky numbers" perform the same as random
                    selection over time. See the mathematical truth behind
                    common lottery misconceptions.
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-start gap-3">
                <span
                  class="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-premium-emerald-400"
                ></span>
                <div>
                  <h3 class="font-semibold text-content-primary">
                    Strategy Comparison
                  </h3>
                  <p class="text-sm text-content-secondary">
                    Compare different approaches: random selection, historical
                    frequencies, favourite numbers, and even unpopular
                    combinations that might reduce prize sharing.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <span
                  class="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-premium-emerald-400"
                ></span>
                <div>
                  <h3 class="font-semibold text-content-primary">
                    Realistic Expectations
                  </h3>
                  <p class="text-sm text-content-secondary">
                    Learn about actual win rates and return on investment
                    through large-scale simulations. Understand the difference
                    between mathematical expectation and real-world variance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- How To Use It -->
        <section class="casino-card rounded-2xl p-8">
          <div class="mb-6 flex items-center gap-3">
            <div class="text-3xl">🚀</div>
            <h2 class="font-heading text-2xl text-brand-gold">How To Use It</h2>
          </div>

          <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div class="text-center">
              <div class="mb-3 flex justify-center">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-interactive-primary/20 text-2xl"
                >
                  🎲
                </div>
              </div>
              <h3 class="mb-2 font-semibold text-content-primary">
                Quick Start
              </h3>
              <p class="text-sm text-content-secondary">
                Generate random tickets instantly to see immediate results.
                Perfect for first-time exploration.
              </p>
            </div>

            <div class="text-center">
              <div class="mb-3 flex justify-center">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-interactive-primary/20 text-2xl"
                >
                  ⚙️
                </div>
              </div>
              <h3 class="mb-2 font-semibold text-content-primary">
                Custom Configuration
              </h3>
              <p class="text-sm text-content-secondary">
                Choose your own numbers, system sizes, or favourite combinations
                for personalised analysis.
              </p>
            </div>

            <div class="text-center">
              <div class="mb-3 flex justify-center">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-interactive-primary/20 text-2xl"
                >
                  🔬
                </div>
              </div>
              <h3 class="mb-2 font-semibold text-content-primary">
                Strategy Testing
              </h3>
              <p class="text-sm text-content-secondary">
                Try different number selection methods and compare their
                long-term performance.
              </p>
            </div>

            <div class="text-center">
              <div class="mb-3 flex justify-center">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-interactive-primary/20 text-2xl"
                >
                  📊
                </div>
              </div>
              <h3 class="mb-2 font-semibold text-content-primary">
                Large-Scale Analysis
              </h3>
              <p class="text-sm text-content-secondary">
                Run hundreds or thousands of simulations to see statistical
                patterns emerge over time.
              </p>
            </div>
          </div>
        </section>

        <!-- Educational Insights -->
        <section class="casino-card rounded-2xl p-8">
          <div class="mb-6 flex items-center gap-3">
            <div class="text-3xl">🧠</div>
            <h2 class="font-heading text-2xl text-brand-gold">
              What You'll Learn
            </h2>
          </div>

          <div class="space-y-6">
            <div class="border-l-4 border-brand-gold pl-4">
              <h3 class="mb-2 font-semibold text-content-primary">
                The Birthday Bias Reality
              </h3>
              <p class="text-content-secondary">
                Many players choose numbers 1-31 based on birthdays, but this
                doesn't improve odds—it just increases the chance of sharing
                prizes. Our unpopular combination generator helps you understand
                this bias.
              </p>
            </div>

            <div class="border-l-4 border-premium-emerald-400 pl-4">
              <h3 class="mb-2 font-semibold text-content-primary">
                Why "Lucky Numbers" Aren't Lucky
              </h3>
              <p class="text-content-secondary">
                Each number has exactly the same probability of being drawn,
                regardless of past results or cultural significance. Our
                simulations prove this through statistical evidence you can see
                for yourself.
              </p>
            </div>

            <div class="border-l-4 border-premium-sapphire-400 pl-4">
              <h3 class="mb-2 font-semibold text-content-primary">
                System Size vs. Winning Probability
              </h3>
              <p class="text-content-secondary">
                System tickets increase both your costs and winning chances, but
                not linearly. A 7+3 system costs 21x more than standard 5+2 but
                only covers 3x more combinations. Understanding this
                relationship helps you make informed decisions about whether the
                additional coverage justifies the exponential cost increase.
              </p>
            </div>

            <div class="border-l-4 border-premium-burgundy-400 pl-4">
              <h3 class="mb-2 font-semibold text-content-primary">
                Mathematical Expectation vs. Reality
              </h3>
              <p class="text-content-secondary">
                While mathematical expectation shows the average outcome,
                real-world variance means actual results can differ
                dramatically. Our Monte Carlo simulations demonstrate this
                critical concept.
              </p>
            </div>

            <div class="border-l-4 border-premium-pearl-400 pl-4">
              <h3 class="mb-2 font-semibold text-content-primary">
                Making Statistics Tangible
              </h3>
              <p class="text-content-secondary">
                Instead of abstract "1 in 139 million" odds, see what happens
                when you run 1000 real simulations. Watch win distributions,
                calculate actual ROI, and observe how different strategies
                perform over time with real data you can explore.
              </p>
            </div>
          </div>
        </section>

        <!-- Call to Action -->
        <section class="text-center">
          <div class="casino-card rounded-2xl p-8">
            <h2 class="mb-4 font-heading text-2xl text-brand-gold">
              Ready to Explore?
            </h2>
            <p class="mb-6 text-content-secondary">
              Start with a quick simulation or dive deep into custom analysis.
              Every number tells a story—let the mathematics guide you.
            </p>

            <div class="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <NuxtLink
                to="/"
                class="btn-casino-gold focus-gold inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium transition-all duration-300 hover:scale-105"
              >
                <span class="text-xl">🎲</span>
                <span>Start Exploring</span>
              </NuxtLink>

              <a
                href="https://en.wikipedia.org/wiki/EuroJackpot"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-gold/30 bg-transparent px-6 py-3 font-medium text-brand-gold transition-all duration-300 hover:scale-105 hover:bg-brand-gold/10"
              >
                <span>Learn About EuroJackpot</span>
                <svg
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </section>

        <!-- Educational Disclaimer -->
        <section class="text-center">
          <div
            class="glass-luxury inline-flex items-center rounded-full px-6 py-3"
          >
            <svg
              class="mr-2 h-5 w-5 text-premium-emerald-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-content-secondary">
              This is an educational tool. No real money is involved. Play
              responsibly if you choose to participate in actual lotteries.
            </span>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BouncingBallsCanvas from '~/components/BouncingBallsCanvas.vue'

// SEO and meta information
useHead({
  title: 'About - EuroJackpot Simulator',
  meta: [
    {
      name: 'description',
      content:
        'Learn about EuroJackpot Simulator: an educational tool that demystifies lottery mathematics through realistic simulations. Understand the reality behind lucky numbers, birthday bias, and system ticket costs.',
    },
    {
      name: 'keywords',
      content:
        'lottery education, EuroJackpot, mathematical simulation, probability, lottery myths, system tickets, educational tool',
    },
  ],
})
</script>

<style scoped>
/* Ensure proper z-index layering for canvas background */
.relative {
  position: relative;
}
</style>
