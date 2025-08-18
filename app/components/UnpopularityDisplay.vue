<template>
  <div class="space-y-4">
    <!-- Educational Header -->
    <div class="rounded bg-surface-primary/20 p-2 text-xs text-content-muted">
      <div class="mb-1 font-medium">🎯 How Unpopularity Works</div>
      <p class="text-xs">
        This method generates combinations that avoid common human biases,
        potentially reducing prize sharing if you win.
        <strong>Important:</strong> This doesn't change your odds of winning -
        all combinations have equal probability.
      </p>
    </div>

    <!-- Bias Factors Explanation -->
    <div>
      <div class="mb-3 text-xs font-medium text-content-muted">
        Common Patterns We Avoid:
      </div>
      <div class="grid grid-cols-1 gap-2 text-xs">
        <div class="flex items-start gap-2 rounded bg-surface-primary/30 p-2">
          <span class="mt-0.5 text-error">🎂</span>
          <div>
            <div class="font-medium text-content-secondary">Birthday Bias</div>
            <div class="text-content-muted">
              Numbers 1-31 are over-chosen due to birthday dates
            </div>
          </div>
        </div>

        <div class="flex items-start gap-2 rounded bg-surface-primary/30 p-2">
          <span class="mt-0.5 text-brand-gold-400">🍀</span>
          <div>
            <div class="font-medium text-content-secondary">Lucky Numbers</div>
            <div class="text-content-muted">
              Numbers like 3, 7, 11, 13, 17, 21 are popular choices
            </div>
          </div>
        </div>

        <div class="flex items-start gap-2 rounded bg-surface-primary/30 p-2">
          <span class="mt-0.5 text-premium-sapphire-400">📈</span>
          <div>
            <div class="font-medium text-content-secondary">
              Sequences & Patterns
            </div>
            <div class="text-content-muted">
              Consecutive numbers (1,2,3,4,5) or arithmetic sequences
            </div>
          </div>
        </div>

        <div class="flex items-start gap-2 rounded bg-surface-primary/30 p-2">
          <span class="mt-0.5 text-premium-emerald-400">🎯</span>
          <div>
            <div class="font-medium text-content-secondary">
              Visual Patterns
            </div>
            <div class="text-content-muted">
              Same last digits (7,17,27) or tight number clustering
            </div>
          </div>
        </div>

        <div class="flex items-start gap-2 rounded bg-surface-primary/30 p-2">
          <span class="mt-0.5 text-premium-pearl-400">📅</span>
          <div>
            <div class="font-medium text-content-secondary">
              Month-like Euro Numbers
            </div>
            <div class="text-content-muted">
              Euro numbers close together (like 7,8 or 11,12)
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Examples Section -->
    <div>
      <div class="mb-3 text-xs font-medium text-content-muted">Examples:</div>
      <div class="space-y-2">
        <!-- Popular Example -->
        <div class="rounded border border-error/30 bg-error-dark/20 p-3">
          <div class="mb-1 flex items-center gap-2">
            <span class="text-lg text-error">😰</span>
            <span class="text-xs font-medium text-error-light"
              >Popular (avoid):</span
            >
          </div>
          <div class="mb-1 text-xs text-content-secondary">
            <strong>5 + 2:</strong> 1, 2, 3, 4, 5 + 7, 11
          </div>
          <div class="text-xs text-content-muted">
            Sequential main numbers + lucky Euro numbers. Many players choose
            this pattern.
          </div>
        </div>

        <!-- Unpopular Example -->
        <div class="rounded border border-success/30 bg-success-dark/20 p-3">
          <div class="mb-1 flex items-center gap-2">
            <span class="text-lg text-premium-emerald-400">😊</span>
            <span class="text-xs font-medium text-success-light"
              >Unpopular (preferred):</span
            >
          </div>
          <div class="mb-1 text-xs text-content-secondary">
            <strong>5 + 2:</strong> 6, 19, 28, 37, 49 + 1, 12
          </div>
          <div class="text-xs text-content-muted">
            Spread across decades, avoids patterns, no birthday bias or lucky
            numbers.
          </div>
        </div>
      </div>
    </div>

    <!-- Scoring Details -->
    <div>
      <div class="mb-3 text-xs font-medium text-content-muted">
        Scoring Factors:
      </div>
      <div class="space-y-1 text-xs text-content-muted">
        <div class="flex items-start gap-2">
          <span class="text-brand-gold">•</span>
          <span
            ><strong>Birthday numbers (1-31):</strong> +0.2 points each</span
          >
        </div>
        <div class="flex items-start gap-2">
          <span class="text-brand-gold">•</span>
          <span><strong>Lucky numbers:</strong> +0.15 points each</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-brand-gold">•</span>
          <span
            ><strong>Sequences (3+ numbers):</strong> +0.25 points per sequence
            length</span
          >
        </div>
        <div class="flex items-start gap-2">
          <span class="text-brand-gold">•</span>
          <span
            ><strong>Same last digit pairs:</strong> +0.12 points per pair</span
          >
        </div>
        <div class="flex items-start gap-2">
          <span class="text-brand-gold">•</span>
          <span><strong>Same decade pairs:</strong> +0.1 points per pair</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-brand-gold">•</span>
          <span
            ><strong>Tight clustering:</strong> +0.18 points if numbers are
            bunched</span
          >
        </div>
        <div class="flex items-start gap-2">
          <span class="text-brand-gold">•</span>
          <span
            ><strong>Close Euro numbers:</strong> +0.1 points if within 3 of
            each other</span
          >
        </div>
      </div>
    </div>

    <!-- More Examples -->
    <div>
      <div class="mb-3 text-xs font-medium text-content-muted">
        More Examples:
      </div>
      <div class="space-y-2">
        <!-- Medium popularity example -->
        <div class="rounded border border-warning/30 bg-warning-dark/20 p-3">
          <div class="mb-1 flex items-center gap-2">
            <span class="text-lg text-brand-gold-400">😐</span>
            <span class="text-xs font-medium text-warning-light"
              >Medium popularity:</span
            >
          </div>
          <div class="mb-1 text-xs text-content-secondary">
            <strong>5 + 2:</strong> 15, 22, 33, 41, 50 + 4, 9
          </div>
          <div class="text-xs text-content-muted">
            Some birthday numbers (15, 22), but spread across decades. Moderate
            choice.
          </div>
        </div>

        <!-- Very unpopular example -->
        <div class="rounded border border-success/40 bg-success-dark/30 p-3">
          <div class="mb-1 flex items-center gap-2">
            <span class="text-lg text-premium-emerald-400">🎯</span>
            <span class="text-xs font-medium text-success-light"
              >Very unpopular:</span
            >
          </div>
          <div class="mb-1 text-xs text-content-secondary">
            <strong>5 + 2:</strong> 32, 38, 41, 47, 50 + 2, 10
          </div>
          <div class="text-xs text-content-muted">
            No birthday bias, no lucky numbers, well-distributed across decades,
            distant Euro numbers.
          </div>
        </div>
      </div>
    </div>

    <!-- Algorithm Process -->
    <div>
      <div class="mb-3 text-xs font-medium text-content-muted">
        Algorithm Process:
      </div>
      <div class="space-y-1 text-xs text-content-muted">
        <div class="flex items-start gap-2">
          <span class="text-brand-gold">1.</span>
          <span>Generates 100 random combinations</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-brand-gold">2.</span>
          <span
            >Scores each combination using the factors above (0-100 scale)</span
          >
        </div>
        <div class="flex items-start gap-2">
          <span class="text-brand-gold">3.</span>
          <span>Selects the combination with the lowest popularity score</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-brand-gold">4.</span>
          <span
            >Result: Numbers statistically less likely to be chosen by
            others</span
          >
        </div>
      </div>
    </div>

    <!-- Important Disclaimer -->
    <div
      class="rounded border border-warning/30 bg-warning-dark/20 p-2 text-xs text-warning-light"
    >
      <div class="mb-1 font-medium">⚠️ Educational Purpose</div>
      <div>
        This method demonstrates mathematical concepts about probability and
        human psychology. It may slightly improve your expected prize share
        <em>if you win</em>, but cannot improve your chances of winning or
        overcome the lottery's negative expected value.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// This component is purely educational and doesn't need any reactive state
// It displays static information about unpopularity factors and examples
</script>

<style scoped>
/* Additional styling if needed can be added here */
</style>
