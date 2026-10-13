<template>
  <main
    class="relative z-10 container mx-auto min-h-screen px-4 py-10 sm:py-14"
  >
    <div class="mx-auto max-w-3xl space-y-8">
      <header class="text-center">
        <h1 class="text-hero mb-4 text-3xl md:text-4xl">
          Lotto Bayern number filler
        </h1>
        <p class="text-luxury-subtitle mx-auto max-w-2xl text-base md:text-lg">
          A bookmark that types the tickets from this simulator into Lotto
          Bayern’s Eurojackpot form, so you do not have to.
        </p>
      </header>

      <section class="casino-card rounded-2xl p-6" aria-labelledby="install">
        <h2 id="install" class="text-lg font-semibold text-content-primary">
          Install it once
        </h2>
        <ol
          class="mt-3 list-decimal space-y-3 pl-5 leading-relaxed text-content-secondary"
        >
          <li>Show your browser’s bookmarks bar.</li>
          <li>
            Drag this button onto it:
            <div class="mt-3 min-h-12">
              <a
                v-if="state === 'ready'"
                :href="url"
                class="btn-casino-gold inline-block cursor-grab rounded-xl px-5 py-2.5 font-cta"
                title="Drag me to your bookmarks bar"
                @click.prevent
              >
                Lotto Bayern · Fill numbers
              </a>
              <span v-else-if="state === 'loading'" class="text-content-muted">
                Loading the bookmark…
              </span>
              <span v-else class="text-error-light">
                The bookmark has not been built. Run
                <code class="font-mono">npm run bookmarklet:build</code>
                and reload.
              </span>
            </div>
          </li>
        </ol>

        <details v-if="state === 'ready'" class="mt-4 text-sm">
          <summary
            class="cursor-pointer text-content-muted hover:text-content-secondary"
          >
            Dragging does not work? Install it by hand
          </summary>
          <p class="mt-2 text-content-secondary">
            Create a new bookmark and paste the whole text below as its address,
            including <code class="font-mono">javascript:</code> at the start.
          </p>
          <textarea
            readonly
            aria-label="Bookmark address"
            class="form-select mt-2 h-24 font-mono text-xs"
            :value="url"
          />
          <button
            type="button"
            class="mt-2 rounded-lg border border-casino-blue/50 px-3 py-1 text-sm text-content-secondary transition-colors duration-150 hover:border-casino-blue-light hover:text-content-primary"
            @click="copyAddress"
          >
            {{ copied ? 'Copied' : 'Copy address' }}
          </button>
        </details>
      </section>

      <section class="casino-card rounded-2xl p-6" aria-labelledby="use">
        <h2 id="use" class="text-lg font-semibold text-content-primary">
          Use it
        </h2>
        <ol
          class="mt-3 list-decimal space-y-2 pl-5 leading-relaxed text-content-secondary"
        >
          <li>
            In the
            <NuxtLink
              to="/"
              class="text-brand-gold underline underline-offset-4 hover:text-brand-gold-light"
            >
              simulator</NuxtLink
            >, get the tickets you want and press
            <strong class="font-semibold text-content-primary">
              Lotto Bayern
            </strong>
            above the ticket list.
          </li>
          <li>
            Open the Eurojackpot form through the link shown there. Your lines
            travel with it.
          </li>
          <li>
            On that page, click the bookmark. Your lines are already loaded;
            press
            <strong class="font-semibold text-content-primary">
              Fill ticket fields
            </strong>
            .
          </li>
          <li>Check the ticket and the price, then decide for yourself.</li>
        </ol>
      </section>

      <section class="casino-card rounded-2xl p-6" aria-labelledby="limits">
        <h2 id="limits" class="text-lg font-semibold text-content-primary">
          What it does, and what it does not
        </h2>
        <ul
          class="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-content-secondary"
        >
          <li>
            It only fills in numbers. It never saves, submits or pays for a
            ticket.
          </li>
          <li>
            It enters numbers through the site’s own number picker and checks
            every field afterwards.
            <strong class="font-semibold text-content-primary"
              >Undo fill</strong
            >
            puts the previous numbers back.
          </li>
          <li>
            It takes standard lines only: {{ MAIN_NUMBERS_COUNT }} numbers plus
            {{ EURO_NUMBERS_COUNT }} Euro numbers, up to
            {{ LOTTO_BAYERN_NORMAL_FIELD_MAX }} per slip. System tickets are
            left out.
          </li>
          <li>
            It runs only on Lotto Bayern’s Eurojackpot form and sends nothing
            anywhere. It also picks no numbers: that happens here in the
            simulator.
          </li>
          <li>Nothing about it improves your odds. See the paytable.</li>
        </ul>
      </section>

      <p class="text-center">
        <NuxtLink
          to="/"
          class="text-sm text-brand-gold underline underline-offset-4 hover:text-brand-gold-light"
        >
          Back to the simulator
        </NuxtLink>
      </p>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useBookmarkletUrl } from '~/composables/useBookmarkletUrl'
import { copyText } from '~/utils/clipboard'
import {
  COPY_SUCCESS_MS,
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
  LOTTO_BAYERN_NORMAL_FIELD_MAX,
} from '~/utils/constants'

useHead({
  title: 'Lotto Bayern number filler - EuroJackpot Simulator',
  meta: [
    {
      name: 'description',
      content:
        'Install the bookmark that enters tickets from the EuroJackpot Simulator into Lotto Bayern’s Eurojackpot form.',
    },
  ],
})

const { url, state } = useBookmarkletUrl()

const copied = ref(false)
const copyAddress = async () => {
  try {
    await copyText(url.value)
    copied.value = true
    setTimeout(() => (copied.value = false), COPY_SUCCESS_MS)
  } catch {
    // The address stays selectable in the box above
  }
}
</script>
