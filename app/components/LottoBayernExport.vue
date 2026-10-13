<template>
  <div class="well mb-4 p-4">
    <div class="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 class="font-semibold text-brand-gold-light">
          Fill these on Lotto Bayern
        </h3>
        <p class="text-sm text-content-muted">{{ summary }}</p>
      </div>
      <button
        type="button"
        class="rounded-full p-1.5 text-content-muted transition-colors duration-150 hover:text-content-secondary"
        aria-label="Close"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>

    <template v-if="exported.lines.length > 0">
      <ol
        class="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-content-secondary"
      >
        <li>
          <a
            :href="exported.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-brand-gold underline underline-offset-4 transition-colors duration-150 hover:text-brand-gold-light"
          >
            Open the Eurojackpot form on Lotto Bayern</a
          >. Your lines travel with the link.
        </li>
        <li>
          Click the
          <NuxtLink
            to="/bookmarklet"
            class="text-brand-gold underline underline-offset-4 transition-colors duration-150 hover:text-brand-gold-light"
          >
            number filler bookmark</NuxtLink
          >
          there, then “Fill ticket fields”.
        </li>
        <li>
          Check the ticket and the price on Lotto Bayern. Nothing is saved or
          paid for you.
        </li>
      </ol>

      <pre
        class="mt-3 max-h-40 overflow-auto rounded-lg bg-surface-primary/60 p-3 font-mono text-xs leading-relaxed text-content-secondary"
        >{{ exported.text }}</pre
      >
      <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          class="rounded-lg border border-casino-blue/50 px-3 py-1 text-sm text-content-secondary transition-colors duration-150 hover:border-casino-blue-light hover:text-content-primary"
          @click="copyLines"
        >
          {{ copyLabel }}
        </button>
        <span class="text-xs text-content-muted">
          If the lines do not arrive with the link, paste them into the filler.
        </span>
      </div>
    </template>

    <p
      v-for="note in notes"
      :key="note"
      class="mt-2 text-xs text-warning-light"
    >
      {{ note }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import { copyText } from '~/utils/clipboard'
import { logger } from '~/utils/logger'
import {
  COPY_SUCCESS_MS,
  LOTTO_BAYERN_NORMAL_FIELD_MAX,
} from '~/utils/constants'

const emit = defineEmits<{ close: [] }>()

const ticketsStore = useTicketsStore()
const exported = computed(() => ticketsStore.lottoBayernExport)

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`

const summary = computed(() => {
  const count = exported.value.lines.length
  return count > 0
    ? `${plural(count, 'line')} ready for the Eurojackpot form.`
    : 'None of these tickets fit the standard form.'
})

const notes = computed(() => {
  const { skippedSystemTickets, skippedOverLimit } = exported.value
  const result: string[] = []
  if (skippedSystemTickets > 0) {
    result.push(
      `${plural(skippedSystemTickets, 'system ticket')} left out: the form takes standard 5 + 2 lines only.`
    )
  }
  if (skippedOverLimit > 0) {
    result.push(
      `One slip holds ${LOTTO_BAYERN_NORMAL_FIELD_MAX} lines, so ${plural(skippedOverLimit, 'more ticket')} did not fit.`
    )
  }
  return result
})

type CopyState = 'idle' | 'copied' | 'failed'
const copyState = ref<CopyState>('idle')
let copyTimer: ReturnType<typeof setTimeout> | undefined

const copyLabel = computed(
  () =>
    ({
      idle: 'Copy lines',
      copied: 'Copied',
      failed: 'Copy failed: select the text above',
    })[copyState.value]
)

const copyLines = async () => {
  try {
    await copyText(exported.value.text)
    copyState.value = 'copied'
  } catch (error) {
    logger.warn('Could not copy the lines:', error)
    copyState.value = 'failed'
  }
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copyState.value = 'idle'), COPY_SUCCESS_MS)
}

onBeforeUnmount(() => clearTimeout(copyTimer))
</script>
