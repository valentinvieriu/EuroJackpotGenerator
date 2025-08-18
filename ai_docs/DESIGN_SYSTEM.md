# 🎨 Casino Theme Design System — Token-First (Tailwind v4)

> **Purpose:** A practical, enforceable design system tightly aligned with our Architecture (dumb components + store-driven logic) and PRD (educational simulator with premium, accessible UI). Components never hardcode values; they consume tokens/utilities only.

---

## 🎯 Principles

- **Token-first & semantic:** Colors and scales are named by **role** (surface, content, brand) — not by hex.
- **Predictable hierarchy:** Elevation, depth, and state are consistent and repeatable.
- **Accessible by default:** AA/AAA where applicable, clear focus, reduced-motion-friendly.
- **SSR-safe & scalable:** Same tokens server/client; no runtime-computed styles in components.
- **Dumb components:** Presentation-only. No business logic or API calls (see `ARCHITECTURE.md`).

---

## 🧩 Tailwind v4 Token Mapping (what actually generates utilities)

Tokens live in `@theme` inside **`app/assets/css/theme.css`** and create utilities automatically.
See Tailwind v4 "Theme variables" docs for how tokens map to classes. :contentReference[oaicite:4]{index=4}

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

> **Decimals in tokens:** Use underscores in `@theme` (e.g., `--spacing-0_5`) — Tailwind maps `p-0.5` to that token at runtime. :contentReference[oaicite:5]{index=5}

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

### Interactive Elements

- `interactive-primary-*`: main CTAs (`primary`, `hover`, `active`, `disabled`, `glow`)
- `interactive-secondary-*`: brand actions (`secondary`, `hover`, `active`, `glow`)
- `interactive-tertiary-*`: subtle actions (`tertiary`, `hover`, `active`, `disabled`)
- `interactive-success-*`: positive confirmations (`success`, `hover`, `active`, `glow`)
- `interactive-danger-*`: destructive actions (`danger`, `hover`, `active`)

**Common patterns**

- Cancel buttons: `bg-interactive-danger hover:bg-interactive-danger-hover`
- Success actions: `bg-interactive-success hover:bg-interactive-success-hover`
- Primary CTAs: `bg-interactive-primary focus:ring-interactive-primary`

### Status & Feedback Colors

- `error-*`, `warning-*`, `success-*`, `info-*` with matching `*-light`/`*-dark` and feedback variables

**Common patterns**

- Error alerts: `bg-error-dark/50 border-error text-error`
- Warning badges: `bg-warning-dark/50 border-warning/30 text-warning-light`
- Status messages: pair with matching text/background variants

---

## 🌙 Theming & Dark Mode

- **Attribute-based dark mode:** We use `<html data-theme="dark">`. In v4, map the built-in **`dark:`** variant to this attribute with `@custom-variant` so you can keep writing `dark:*` utilities normally. :contentReference[oaicite:6]{index=6}
- **Layering:** Define **overrides in `@layer theme`** to keep variable ordering predictable and avoid specificity battles. (Good practice mirrored in v4 community guidance.) :contentReference[oaicite:7]{index=7}
- **Seasonal themes:** Same pattern with `[data-theme='halloween']`, `[data-theme='christmas']`.

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
- Prefer `focus-visible` in components where appropriate (or tokenized focus rings like `.focus-casino`).

---

## 🔁 Opacity & Tokens (Tailwind v4)

- **Use slash opacity freely with token utilities** (generated from `--color-*`):
  `border-casino-blue-light/50`, `bg-surface-primary/20`, `text-brand-gold/90`. :contentReference[oaicite:8]{index=8}
- **Variable shorthand (CSS variables)** using Tailwind’s v4 syntax:
  `bg-(--my-color)`, `border-(--my-border)` (equivalent to `bg-[var(--my-color)]`). :contentReference[oaicite:9]{index=9}
  - **Note:** Slash opacity modifiers **don’t apply** to `bg-(--token)`/`border-(--token)` shorthands. For opacity, use:
    - `color-mix(...)`: `border-[color-mix(in_oklab,var(--color-casino-blue-light)_50%,transparent)]`, or
    - encode alpha in the color (e.g., `oklch(... / 0.5)`), or
    - apply opacity at the element level with `opacity-*` when acceptable.
- Keep Tailwind blur tokens (`--blur-*`) as **lengths**; bespoke CSS blurs (e.g., `--blur-casino-*`) are fine for custom filters.

---

## 🧱 Scales

- **Spacing**: `--spacing-*` → `p-*`, `m-*`, `gap-*` (e.g., `py-12 md:py-16`)
- **Radius**: `--radius-lg`, `--radius-2xl`, `--radius-full` → `rounded-*` :contentReference[oaicite:10]{index=10}
- **Type**: `--text-sm..8xl`, `--leading-tight..loose` → `text-*`, `leading-*`
- **Shadows**: `--shadow-sm..2xl` → `shadow-*`
- **Motion**: `--duration-150|300|500`, `--ease-standard|expressive`
- **Blur**: `--blur-sm|md|lg|xl` (lengths) → `blur-*`

---

## ✅ Usage Patterns (Do / Don’t)

**Do**

- `bg-surface-primary text-content-primary`
- `rounded-2xl shadow-lg p-6`
- `transition-all duration-150 ease-standard`
- `border-casino-blue-light/50` (slash opacity on token utilities)
- `bg-(--color-surface-overlay)` for variable shorthand where needed

**Don’t**

- Hardcoded `#rrggbb` / `rgb()` / `rgba()` in components
- Runtime-computed inline styles in components (SSR drift)
- Business logic or API calls in components (stores only)
- Use `bg-(--token)/50` expecting slash opacity — it won’t apply (use `color-mix(...)` instead)

---

## 🌙 Example Snippets (v4-correct)

**Hero headline**

```html
<h1 class="text-casino-gold font-heading text-5xl md:text-6xl">
  EuroJackpot Simulator
</h1>
```

**Primary CTA**

```html
<button class="btn-casino-gold focus-casino rounded-2xl px-6 py-3">
  Generate Random Tickets
</button>
```

**Card**

```html
<div class="casino-card rounded-2xl p-6">
  <!-- content -->
</div>
```

**Overlay container (variable shorthand demo)**

```html
<!-- Uses a token via CSS variable shorthand -->
<div
  class="rounded-2xl bg-(--color-surface-overlay) p-6 shadow-2xl backdrop-blur-xl"
>
  <!-- modal content -->
</div>
```

**Semi-transparent border via color-mix**

```html
<div
  class="rounded-2xl border-[color-mix(in_oklab,var(--color-casino-blue-light)_50%,transparent)] p-6"
>
  <!-- content -->
</div>
```

---

## 🔒 Alignment with Architecture & PRD

- **Dumb components** consume tokens/utilities; **all** logic stays in Pinia stores.
- **SSR-safe**: token values are static; no client-only computed styles in components.
- **Responsiveness & performance**: modest transitions; animations optional/accessible.
- **Education focus**: alerts, jackpot/VIP sections, and progress feedback use semantic tokens consistently.

---

## ✅ Quality Checklist (enforced)

- [ ] Uses **token-based utilities** in components (no hardcoded hex/rgb/hsl).
- [ ] Meets **contrast** targets (≥ 4.5:1 on `surface-primary`) and provides **focus-visible** using ring/focus tokens or `.focus-*` classes.
- [ ] Respects **reduced motion** (`prefers-reduced-motion`) and avoids conveying essential information by motion only.
- [ ] **Dark mode** works via `dark:` variant (mapped with `@custom-variant`) and theme overrides live in `@layer theme` — no `[data-theme]` selectors inside components.
- [ ] Uses **spacing/radius/type/blur/shadow/z-index** tokens for scale consistency.
- [ ] **Opacity pattern is correct**:
  - Use slash opacity **only with token utilities** (e.g., `bg-surface-card/20`, `border-casino-blue-light/50`, `text-brand-gold/90`).
  - For `bg-(--token)`/`border-(--token)` shorthand, use `color-mix(...)` or Tailwind `--alpha()` in CSS, or encode alpha in the color; **don’t** use slash opacity suffix.
- [ ] **Variable shorthand is a fallback**, not the default: prefer token utilities; drop to `bg-(--token)` or `bg-[...]` only when necessary.
- [ ] **Arbitrary values** (`[...]`) used sparingly; avoid dynamic string interpolation of class names; safelist if needed for runtime variants.
- [ ] **Blur tokens** are **lengths**; bespoke blurs (`--blur-casino-*`) only in CSS utilities, not as `blur-[...]` when a token exists.
- [ ] **Transitions** use tokenized durations/easings (`duration-*`, `ease-*`).
- [ ] **No business logic in components**; style-only utilities and recipe classes (`.casino-card`, `.btn-*`) are allowed.
