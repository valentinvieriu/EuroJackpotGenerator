<template>
  <Transition name="sheet">
    <div
      v-if="isOpen"
      class="overlay-premium fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      @click.self="emit('close')"
    >
      <div
        class="casino-card-premium flex max-h-[90vh] w-full max-w-3xl flex-col rounded-t-2xl sm:mx-4 sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paytable-sheet-title"
      >
        <div class="flex items-start justify-between gap-4 p-5 pb-3 sm:p-6">
          <div>
            <h2
              id="paytable-sheet-title"
              class="text-lg font-semibold text-content-primary"
            >
              Paytable
            </h2>
            <p class="mt-1 text-sm text-content-muted">
              Every machine shows what it pays. This one also shows how unlikely
              each prize is.
            </p>
          </div>
          <button
            ref="closeButton"
            type="button"
            class="rounded-full p-1.5 text-content-muted transition-colors duration-150 hover:text-content-secondary"
            aria-label="Close"
            @click="emit('close')"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
          <PaytableTable />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { nextTick, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import PaytableTable from './PaytableTable.vue'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: [] }>()

const closeButton = ref<HTMLButtonElement | null>(null)

// Focus moves into the sheet when it opens, and back to where it was on close
let returnFocusTo: HTMLElement | null = null
watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      returnFocusTo = document.activeElement as HTMLElement | null
      await nextTick()
      closeButton.value?.focus()
    } else {
      returnFocusTo?.focus()
      returnFocusTo = null
    }
  }
)

const onKeydown = (event: KeyboardEvent) => {
  if (props.isOpen && event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
/* Above the cabinet and its lever */
.fixed {
  z-index: 9999;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s var(--ease-standard);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
</style>
