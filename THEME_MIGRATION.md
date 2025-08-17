# 🎲 Casino Theme Migration Guide - Tailwind CSS v4

## Old vs New Color Mapping

### Legacy Colors → Semantic Tokens

| **Old Class**          | **New Semantic Class**         | **Use Case**           |
| ---------------------- | ------------------------------ | ---------------------- |
| `bg-casino-blue`       | `bg-surface-primary`           | Main backgrounds       |
| `bg-casino-blue-light` | `bg-surface-secondary`         | Elevated panels, cards |
| `bg-casino-blue-dark`  | `bg-surface-tertiary`          | Deep backgrounds       |
| `text-ivory`           | `text-content-primary`         | Primary text           |
| `text-gray-200`        | `text-content-secondary`       | Secondary text         |
| `text-gray-400`        | `text-content-muted`           | Muted text             |
| `bg-casino-gold`       | `bg-brand-gold`                | Premium accents        |
| `bg-casino-gold-light` | `bg-brand-gold-light`          | Light gold accents     |
| `bg-casino-gold-dark`  | `bg-brand-gold-dark`           | Rich gold shadows      |
| `bg-vip-orange`        | `bg-interactive-primary`       | CTA buttons            |
| `bg-vip-orange-light`  | `bg-interactive-primary-light` | Light CTAs             |
| `bg-vip-orange-dark`   | `bg-interactive-primary-hover` | Button hover states    |
| `bg-ball-yellow`       | `bg-ball-primary`              | Ball elements          |
| `bg-star-gold`         | `bg-star-primary`              | Star elements          |
| `border-casino-gold`   | `border-border-primary`        | Gold borders           |
| `border-navy-muted`    | `border-border-secondary`      | Subtle borders         |

### New Semantic Color Classes Available

#### Surface Colors (Backgrounds)

- `bg-surface-primary` - Main app background
- `bg-surface-secondary` - Cards, panels, elevated areas
- `bg-surface-tertiary` - Deepest backgrounds
- `bg-surface-card` - Specific card backgrounds
- `bg-surface-overlay` - Modal overlays

#### Content Colors (Text & Icons)

- `text-content-primary` - Main text (ivory)
- `text-content-secondary` - Secondary text
- `text-content-muted` - Subtle text
- `text-content-inverse` - Dark text on light backgrounds

#### Brand Colors

- `bg-brand-gold` / `text-brand-gold` - Premium gold
- `bg-brand-gold-light` / `text-brand-gold-light` - Light gold accents
- `bg-brand-gold-dark` / `text-brand-gold-dark` - Rich gold shadows
- `bg-brand-navy` / `text-brand-navy` - Brand navy

#### Interactive Colors (Buttons & Actions)

- `bg-interactive-primary` - Primary buttons (VIP orange)
- `bg-interactive-primary-hover` - Button hover states
- `bg-interactive-primary-light` - Light button variants
- `bg-interactive-secondary` - Secondary buttons (gold)
- `bg-interactive-secondary-hover` - Secondary hover states

#### Game Elements

- `bg-ball-primary` / `text-ball-primary` - Main ball colors
- `bg-ball-highlight` / `text-ball-highlight` - Ball highlights
- `bg-ball-shadow` / `text-ball-shadow` - Ball shadows
- `bg-ball-winner` / `text-ball-winner` - Winning ball states
- `bg-star-primary` / `text-star-primary` - Star elements
- `bg-star-highlight` / `text-star-highlight` - Star highlights
- `bg-star-shadow` / `text-star-shadow` - Star shadows
- `bg-star-winner` / `text-star-winner` - Winning star states

#### Status Colors

- `bg-success` / `text-success` - Success states
- `bg-warning` / `text-warning` - Warning states
- `bg-error` / `text-error` - Error states
- `bg-info` / `text-info` - Info states

#### Border Colors

- `border-border-primary` - Gold borders
- `border-border-secondary` - Subtle navy borders
- `border-border-muted` - Very subtle borders
- `border-border-focus` - Focus ring (orange)

#### Utility Colors

- `bg-white` / `text-white` - Pure white
- `bg-black` / `text-black` - Pure black
- `bg-transparent` - Transparent
- `text-current` - Current color

### Custom Shadow Classes

All existing shadows are preserved:

- `shadow-ball` - Ball 3D effect
- `shadow-ball-winner` - Winning ball effect
- `shadow-star` - Star glow effect
- `shadow-star-winner` - Winning star effect
- `shadow-glow` - General glow effect
- `shadow-premium` - Premium depth shadow

## Migration Steps

1. **Run ESLint** to identify all default color usage:

   ```bash
   npm run lint
   ```

2. **Replace colors systematically** using the mapping above

3. **Test visual consistency** - ensure the new semantic tokens maintain the same visual hierarchy

4. **Update component patterns**:
   - Backgrounds: Use `surface-*` classes
   - Text: Use `content-*` classes
   - Buttons: Use `interactive-*` classes
   - Game elements: Use `ball-*` and `star-*` classes
   - Borders: Use `border-*` classes

## Benefits of New Semantic Approach

✅ **Meaningful naming** - Colors describe purpose, not appearance  
✅ **Consistent hierarchy** - Clear surface/content/interactive separation  
✅ **Theme flexibility** - Easy to adjust entire theme by changing CSS variables  
✅ **ESLint protection** - Automatic detection of default color usage  
✅ **Modern CSS** - Uses OKLCH for better color consistency  
✅ **Accessibility** - Built-in high contrast and reduced motion support

## Example Migration

### Before (Old)

```vue
<template>
  <div class="bg-casino-blue border border-casino-gold">
    <h1 class="text-ivory">EuroJackpot</h1>
    <p class="text-gray-200">Generate winning numbers</p>
    <button class="bg-vip-orange hover:bg-vip-orange-dark text-white">
      Play Now
    </button>
  </div>
</template>
```

### After (New)

```vue
<template>
  <div class="bg-surface-primary border border-border-primary">
    <h1 class="text-content-primary">EuroJackpot</h1>
    <p class="text-content-secondary">Generate winning numbers</p>
    <button
      class="bg-interactive-primary hover:bg-interactive-primary-hover text-white"
    >
      Play Now
    </button>
  </div>
</template>
```

## Next Steps

1. Install Tailwind CSS v4 packages:

   ```bash
   npm install @tailwindcss/vite@next
   npm uninstall @nuxtjs/tailwindcss
   ```

2. Run the migration:

   ```bash
   npm run lint  # Find all default color usage
   # Fix each file systematically
   ```

3. Remove old config:
   ```bash
   rm tailwind.config.js
   rm app/assets/css/tailwind.css  # After migration complete
   ```
