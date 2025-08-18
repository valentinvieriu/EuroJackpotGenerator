# 🎨 Casino Theme Design System — Token-First (Tailwind v4)

> **Purpose:** A practical, enforceable design system tightly aligned with our Architecture (dumb components + store-driven logic) and PRD (educational simulator with premium, accessible UI). Components never hardcode values; they consume tokens/utilities only.

---

## 🎯 Principles

- **Token-first & semantic:** Colors and scales are named by **role** (surface, content, brand) — not by hex.
- **Predictable hierarchy:** Elevation, depth, and state are consistent and repeatable.
- **Accessible by default:** AA/AAA where applicable, clear focus, reduced-motion-friendly.
- **SSR-safe & scalable:** Same tokens server/client; no runtime-calculated styles in components.
- **Dumb components:** Presentation-only. No business logic or API calls (see `ARCHITECTURE.md`).

---

## 🧩 Tailwind v4 Token Mapping (what actually generates utilities)

Tokens live in `@theme` inside **`app/assets/css/theme.css`**.

| Family (token prefix)                    | Examples in CSS Tokens                              | Utilities you get                         |
| ---------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| **Colors** `--color-*`                   | `--color-surface-primary`, `--color-brand-gold-400` | `bg-*`, `text-*`, `border-*`, `outline-*` |
| **Spacing** `--spacing-*`                | `--spacing-6: 1.5rem`                               | `p-*`, `m-*`, `gap-*`, `space-*`          |
| **Radius** `--radius-*`                  | `--radius-2xl: 1rem`                                | `rounded-*`                               |
| **Typography** `--text-*`, `--leading-*` | `--text-5xl: 3rem`                                  | `text-*`, `leading-*`                     |
| **Shadows** `--shadow-*`                 | `--shadow-lg: …`                                    | `shadow-*`                                |
| **Motion** `--duration-*`, `--ease-*`    | `--duration-300`, `--ease-standard`                 | `duration-*`, `ease-*`, `transition-*`    |
| **Z-index** `--z-*`                      | `--z-50`, `--z-max`                                 | `z-*`                                     |
| **Blur** `--blur-*`                      | `--blur-md: 12px` (**length**)                      | `blur-*`                                  |

> **Important:** Blur tokens must be **lengths** (e.g., `12px`), not `blur(12px)`. We keep bespoke casino blurs (`--blur-casino-*`) for custom CSS where needed.

---

## 🌈 Color System

### Surface & Content

- `color-surface-*`: spatial hierarchy (`primary`, `secondary`, `card`, `floating`, `overlay`, `elevated-{1..4}`, `premium`, `vip`, `jackpot`)
- `color-content-*`: `primary` / `secondary` / `muted` / `inverse`

**Usage defaults**

- App root: `bg-surface-primary text-content-primary`
- Cards: `bg-surface-card shadow-lg rounded-2xl` or `.casino-card`
- Overlays: `bg-surface-overlay` + backdrop blurred container

### Brand & Accents

- Brand metallics: `brand-gold-*`, `brand-rose-gold-*`, `brand-platinum-*`
- Premium accents: `premium-emerald-*`, `premium-burgundy-*`, `premium-pearl-*`, `premium-sapphire-*`

**Common combos**

- Jackpot banner: `bg-surface-jackpot text-premium-emerald-300`
- VIP section: `bg-surface-vip text-premium-burgundy-300`
- Sophisticated: `bg-surface-premium text-brand-platinum-300`

### Opacity with custom tokens

Slash opacity like `border-casino-blue-light/50` is **not reliable** for token colors. Prefer:

- Element/state opacity: `opacity-50` (affects the whole element)
- **Arbitrary color value** for precise alpha:
  `border-[oklch(0.62_0.05_229_/_0.5)]`
  or `border-[color-mix(in oklab,var(--color-casino-blue-light) 50%, transparent)]`

---

## 🧱 Scales

- **Spacing**: `--spacing-*` → `p-*`, `m-*`, `gap-*` (e.g., `py-12 md:py-16`)
- **Radius**: `--radius-lg`, `--radius-2xl`, `--radius-full` → `rounded-*`
- **Type**: `--text-sm..8xl`, `--leading-tight..loose` → `text-*`, `leading-*`
- **Shadows**: `--shadow-sm..2xl` → `shadow-*` (use `.casino-card`, `.hover-glow` for premium)
- **Motion**: `--duration-150|300|500`, `--ease-standard|expressive`
- **Blur**: `--blur-sm|md|lg|xl` (lengths) → `blur-*`

---

## 🌙 Theming

- **Dark mode**: `[data-theme='dark']` overrides surfaces, content, borders, and glass shadows.
- **Seasonal**: `[data-theme='halloween']`, `[data-theme='christmas']` (opt-in via `data-theme`).

> Components **never** pick colors by hex — they rely on tokens/utilities so themes swap cleanly.

---

## 🧰 Utilities & Component Classes

We ship premium utilities in `theme.css`:

- **Cards**: `.casino-card`, `.casino-card-premium`
- **Buttons**: `.btn-casino-gold`, `.btn-casino-blue`, with `.focus-casino` / `.focus-gold`
- **Text**: `.text-casino-gold`, `.text-premium-glow`, `.font-heading`, `.font-body`, `.font-numbers`, `.font-cta`
- **Overlays & Effects**: `.glass-luxury`, `.overlay-casino`, `.overlay-premium`, glow/ripple/hover-lift animations

> These classes encapsulate multi-property recipes (gradients, borders, shadows) while still using tokens under the hood.

---

## ♿ Accessibility

- Contrast targets:
  - Text on `surface-primary`: **≥ 4.5:1**
  - Interactive/focus rings: **≥ 3:1**
- `prefers-reduced-motion`: respected globally
- Focus: `.focus-casino` / `.focus-gold` box-shadow rings, not color-only

---

## ✅ Usage Patterns (Do / Don’t)

**Do**

- `bg-surface-primary text-content-primary`
- `rounded-2xl shadow-lg p-6`
- `transition-all duration-150 ease-standard`
- `border-casino-blue-light` (solid) or `border-[oklch(…/0.5)]` (alpha)

**Don’t**

- `border-casino-blue-light/50` (slash opacity on token colors)
- Hardcoded `#rrggbb` / `rgb()` in components
- Runtime-computed inline styles in components (SSR drift)
- Business logic or API calls in components (stores only)

---

## 🧪 Examples

**Hero headline**

```html
<h1 class="text-5xl md:text-6xl font-heading text-casino-gold">
  EuroJackpot Simulator
</h1>
```

**Primary CTA**

```html
<button class="btn-casino-gold focus-casino px-6 py-3 rounded-2xl">
  Generate Random Tickets
</button>
```

**Card**

```html
<div class="casino-card rounded-2xl p-6">
  <!-- content -->
</div>
```

**Overlay container (modal content)**

```html
<div class="bg-surface-overlay backdrop-blur-xl rounded-2xl p-6 shadow-2xl">
  <!-- modal content -->
</div>
```

**Subtle info alert**

```html
<div class="alert alert-info">
  <span class="alert-icon">ℹ️</span>
  <div class="alert-content">
    <div class="alert-title">Educational Mode</div>
    <p class="alert-desc">Simulations do not predict real draws.</p>
  </div>
</div>
```

---

## 🔒 Alignment with Architecture & PRD

- **Dumb components** consume tokens/utilities only; **all** logic stays in Pinia stores.
- **SSR-safe**: token values are static; no client-only computed styles in components.
- **Responsiveness & performance**: transitions use `ease-standard` and modest durations; animations are optional/accessible.
- **Education focus**: alerts, jackpot/VIP sections, and progress feedback use semantic tokens for consistent messaging.

---

## ✅ Quality Checklist (enforced)

- [ ] Uses **token-based utilities only** in components (no hardcoded values)
- [ ] Meets **contrast** targets
- [ ] Includes **focus-visible** state
- [ ] Respects **reduced motion**
- [ ] Works in **dark mode** if relevant
- [ ] Uses spacing/radius/type tokens for scale consistency
- [ ] No color opacity via `/<number>` on token colors (use `opacity-*` or arbitrary color)

```

```
