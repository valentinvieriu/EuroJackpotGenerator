<template>
  <div class="space-y-4">
    <!-- Educational Header -->
    <div class="text-xs text-content-muted bg-surface-primary/20 rounded p-2">
      <div class="font-medium mb-1">🎯 How Unpopularity Works</div>
      <p class="text-xs">
        This method generates combinations that avoid common human biases,
        potentially reducing prize sharing if you win.
        <strong>Important:</strong> This doesn't change your odds of winning -
        all combinations have equal probability.
      </p>
    </div>

    <!-- Bias Factors Explanation -->
    <div>
      <div class="text-xs text-content-muted mb-3 font-medium">
        Common Patterns We Avoid:
      </div>
      <div class="grid grid-cols-1 gap-2 text-xs">
        <div class="flex items-start gap-2 p-2 bg-surface-primary/30 rounded">
          <span class="text-red-400 mt-0.5">🎂</span>
          <div>
            <div class="text-content-secondary font-medium">Birthday Bias</div>
            <div class="text-content-muted">
              Numbers 1-31 are over-chosen due to birthday dates
            </div>
          </div>
        </div>

        <div class="flex items-start gap-2 p-2 bg-surface-primary/30 rounded">
          <span class="text-yellow-400 mt-0.5">🍀</span>
          <div>
            <div class="text-content-secondary font-medium">Lucky Numbers</div>
            <div class="text-content-muted">
              Numbers like 3, 7, 11, 13, 17, 21 are popular choices
            </div>
          </div>
        </div>

        <div class="flex items-start gap-2 p-2 bg-surface-primary/30 rounded">
          <span class="text-blue-400 mt-0.5">📈</span>
          <div>
            <div class="text-content-secondary font-medium">Sequences & Patterns</div>
            <div class="text-content-muted">
              Consecutive numbers (1,2,3,4,5) or arithmetic sequences
            </div>
          </div>
        </div>

        <div class="flex items-start gap-2 p-2 bg-surface-primary/30 rounded">
          <span class="text-green-400 mt-0.5">🎯</span>
          <div>
            <div class="text-content-secondary font-medium">Visual Patterns</div>
            <div class="text-content-muted">
              Same last digits (7,17,27) or tight number clustering
            </div>
          </div>
        </div>

        <div class="flex items-start gap-2 p-2 bg-surface-primary/30 rounded">
          <span class="text-purple-400 mt-0.5">📅</span>
          <div>
            <div class="text-content-secondary font-medium">Month-like Euro Numbers</div>
            <div class="text-content-muted">
              Euro numbers close together (like 7,8 or 11,12)
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Examples Section -->
    <div>
      <div class="text-xs text-content-muted mb-3 font-medium">Examples:</div>
      <div class="space-y-2">
        <!-- Popular Example -->
        <div class="p-3 bg-red-900/20 border border-red-500/30 rounded">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-red-400 text-lg">😰</span>
            <span class="text-xs font-medium text-red-300"
              >Popular (avoid):</span
            >
          </div>
          <div class="text-xs text-content-secondary mb-1">
            <strong>5 + 2:</strong> 1, 2, 3, 4, 5 + 7, 11
          </div>
          <div class="text-xs text-content-muted">
            Sequential main numbers + lucky Euro numbers. Many players choose
            this pattern.
          </div>
        </div>

        <!-- Unpopular Example -->
        <div class="p-3 bg-green-900/20 border border-green-500/30 rounded">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-green-400 text-lg">😊</span>
            <span class="text-xs font-medium text-green-300"
              >Unpopular (preferred):</span
            >
          </div>
          <div class="text-xs text-content-secondary mb-1">
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
      <div class="text-xs text-content-muted mb-3 font-medium">Scoring Factors:</div>
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
      <div class="text-xs text-content-muted mb-3 font-medium">More Examples:</div>
      <div class="space-y-2">
        <!-- Medium popularity example -->
        <div class="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-yellow-400 text-lg">😐</span>
            <span class="text-xs font-medium text-yellow-300"
              >Medium popularity:</span
            >
          </div>
          <div class="text-xs text-content-secondary mb-1">
            <strong>5 + 2:</strong> 15, 22, 33, 41, 50 + 4, 9
          </div>
          <div class="text-xs text-content-muted">
            Some birthday numbers (15, 22), but spread across decades. Moderate
            choice.
          </div>
        </div>

        <!-- Very unpopular example -->
        <div class="p-3 bg-green-900/30 border border-green-400/40 rounded">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-green-400 text-lg">🎯</span>
            <span class="text-xs font-medium text-green-300"
              >Very unpopular:</span
            >
          </div>
          <div class="text-xs text-content-secondary mb-1">
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
      <div class="text-xs text-content-muted mb-3 font-medium">
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
      class="text-xs text-amber-200 bg-amber-900/20 border border-amber-500/30 rounded p-2"
    >
      <div class="font-medium mb-1">⚠️ Educational Purpose</div>
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
