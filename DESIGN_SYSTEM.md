# 🎨 Casino Theme Design System - Color Guidelines

## 🎯 Design Philosophy

Our premium casino theme is built on **semantic color tokens** that prioritize:

- **Purpose over appearance** - Colors describe function, not visual properties
- **Sophisticated hierarchy** - Clear elevation and importance through color
- **Premium aesthetics** - Luxury casino experience with modern sensibilities
- **Accessibility first** - WCAG compliant contrast ratios
- **Scalable system** - Easy to extend and maintain

---

## 🎨 Color Token Architecture

### **Naming Convention**

```
--color-{category}-{name}-{variant}
```

**Categories:**

- `surface` - Backgrounds and containers
- `content` - Text and icons
- `brand` - Primary brand identity
- `premium` - High-value accent colors
- `interactive` - Buttons and actions
- `ball/star` - Game-specific elements
- `border` - Separators and outlines

**Variants:**

- Numbered scale: `50, 100, 200, 300, 400, 500, 600`
- Descriptive: `light, primary, dark, hover, active, disabled`

---

## 🏗️ Color System Structure

### **1. Surface Colors - Spatial Hierarchy**

Creates depth and elevation through 12 carefully crafted surface levels:

```css
/* Base Foundations */
surface-primary      → Main app background (deepest)
surface-secondary    → Elevated panels
surface-tertiary     → Alternative deep background

/* Interactive Surfaces */
surface-card         → Card/component backgrounds
surface-card-hover   → Hover state for cards
surface-floating     → Dropdowns, tooltips, floating elements

/* Overlay System */
surface-overlay      → Modal content
surface-overlay-backdrop → Modal backdrops with transparency
surface-glass        → Glass morphism effects

/* Premium Contexts */
surface-premium      → Premium feature sections
surface-vip          → VIP member areas (burgundy-tinted)
surface-jackpot      → Jackpot displays (emerald-tinted)

/* Material Elevation */
surface-elevated-1   → 1dp Material elevation
surface-elevated-2   → 2dp Material elevation
surface-elevated-3   → 3dp Material elevation
surface-elevated-4   → 4dp Material elevation
```

**Usage Guidelines:**

- Always start with `surface-primary` as your base
- Use elevation levels to show component hierarchy
- Reserve VIP/jackpot surfaces for high-value content
- Apply glass effects sparingly for modern touches

### **2. Brand Colors - Premium Identity**

Seven-step gold progression plus luxury metallics:

```css
/* Primary Gold Scale */
brand-gold-50        → Champagne highlights, subtle accents
brand-gold-100       → Light gold, disabled states
brand-gold-200       → Soft gold accents, borders
brand-gold-300       → Medium gold, secondary elements
brand-gold-400       → Classic gold, primary brand (DEFAULT)
brand-gold-500       → Rich gold, important accents
brand-gold-600       → Deep gold, shadows, active states

/* Luxury Metallics */
brand-rose-gold-300  → Light rose gold, premium features
brand-rose-gold-400  → Classic rose gold, special occasions
brand-rose-gold-500  → Deep rose gold, VIP elements

brand-platinum-300   → Light platinum, subtle luxury
brand-platinum-400   → Classic platinum, secondary actions
brand-platinum-500   → Deep platinum, premium disabled states
```

**Usage Guidelines:**

- Use gold-400 as your primary brand color
- Gold-200/300 for subtle accents and secondary elements
- Gold-500/600 for emphasis and active states
- Rose gold for premium/VIP features
- Platinum for sophisticated secondary actions

### **3. Premium Accent Colors - High-Value Elements**

Sophisticated accent palette for special contexts:

```css
/* Emerald - Success & Jackpot */
premium-emerald-300  → Success messages, positive feedback
premium-emerald-400  → Jackpot displays, winning states
premium-emerald-500  → High-value indicators, money symbols

/* Burgundy - VIP & Exclusive */
premium-burgundy-300 → VIP text, exclusive features
premium-burgundy-400 → VIP sections, premium warnings
premium-burgundy-500 → High-stakes elements, urgent VIP actions

/* Pearl - Iridescent Effects */
premium-pearl-300    → Subtle highlights, shimmer effects
premium-pearl-400    → Iridescent accents, special touches
premium-pearl-500    → Premium texture overlays

/* Sapphire - Premium Interactive */
premium-sapphire-300 → Premium feature toggles
premium-sapphire-400 → High-value interactive elements
premium-sapphire-500 → Special action buttons, rare interactions
```

**Usage Guidelines:**

- Emerald for anything money/success related
- Burgundy exclusively for VIP/exclusive content
- Pearl for subtle premium effects and highlights
- Sapphire for high-value interactive elements

### **4. Interactive Colors - Button & Action States**

Complete state system for all interactive elements:

```css
/* Primary Interactive (VIP Orange) */
interactive-primary           → Base CTA buttons
interactive-primary-hover     → Hover state
interactive-primary-active    → Active/pressed state
interactive-primary-disabled  → Disabled state
interactive-primary-light     → Light variant
interactive-primary-glow      → Glow effect overlay

/* Secondary Interactive (Gold) */
interactive-secondary         → Secondary actions
interactive-secondary-hover   → Gold hover state
interactive-secondary-active  → Gold active state
interactive-secondary-disabled → Gold disabled state
interactive-secondary-glow    → Gold glow effect

/* Tertiary Interactive (Platinum) */
interactive-tertiary          → Subtle actions
interactive-tertiary-hover    → Platinum hover
interactive-tertiary-active   → Platinum active
interactive-tertiary-disabled → Platinum disabled

/* Success Interactive (Emerald) */
interactive-success           → Success actions
interactive-success-hover     → Success hover
interactive-success-active    → Success active
interactive-success-glow      → Success glow

/* Danger Interactive (Burgundy) */
interactive-danger           → Warning/delete actions
interactive-danger-hover     → Danger hover
interactive-danger-active    → Danger active
```

**Usage Guidelines:**

- Primary (orange) for main CTAs and important actions
- Secondary (gold) for brand-related actions
- Tertiary (platinum) for subtle, low-priority actions
- Success (emerald) for positive confirmations
- Danger (burgundy) for destructive actions

---

## 🎯 Usage Patterns

### **Component Hierarchy**

#### **Primary Components** (High visibility)

- Use: `interactive-primary`, `brand-gold-400`, `premium-emerald-400`
- Examples: Main CTAs, jackpot displays, winning states
- Shadows: `shadow-premium`, `shadow-glow-*`

#### **Secondary Components** (Supporting)

- Use: `interactive-secondary`, `brand-gold-300`, `surface-elevated-2`
- Examples: Secondary buttons, navigation, cards
- Shadows: `shadow-lg`, `shadow-floating`

#### **Tertiary Components** (Background)

- Use: `interactive-tertiary`, `brand-platinum-300`, `surface-secondary`
- Examples: Subtle actions, disabled states, backgrounds
- Shadows: `shadow-sm`, `shadow-md`

### **State Progression**

#### **Interactive States**

1. **Rest**: Base color
2. **Hover**: Darker/more saturated variant
3. **Active**: Darkest variant in family
4. **Disabled**: Reduced saturation + 50% opacity
5. **Focus**: Add glow ring, maintain background

#### **Visual Feedback**

- **Success**: Emerald colors + glow
- **Warning**: Gold colors + attention animation
- **Error**: Burgundy colors + pulse effect
- **Information**: Sapphire colors + subtle highlight

---

## 🔍 Color Relationships

### **Harmonious Combinations**

#### **Gold + Navy** (Primary Brand)

```css
background: surface-primary
foreground: brand-gold-400
borders: brand-gold-300
```

#### **Emerald + Navy** (Success/Money)

```css
background: surface-jackpot
foreground: premium-emerald-300
accents: premium-emerald-400
```

#### **Burgundy + Navy** (VIP/Premium)

```css
background: surface-vip
foreground: premium-burgundy-300
borders: premium-burgundy-400
```

#### **Platinum + Navy** (Sophisticated)

```css
background: surface-premium
foreground: brand-platinum-300
accents: brand-platinum-400
```

### **Contrast Requirements**

All color combinations meet WCAG AA standards:

- **Text on surface-primary**: 4.5:1 minimum
- **Interactive elements**: 3:1 minimum
- **Focus indicators**: 3:1 minimum
- **Brand gold on navy**: 7:1 (AAA compliant)

---

## 🚀 Future Expansion Guidelines

### **Adding New Semantic Categories**

1. **Identify Purpose**: What functional role does this color serve?
2. **Choose Base Hue**: Select OKLCH hue value (0-360)
3. **Create Scale**: Generate 3-7 variants with consistent lightness progression
4. **Test Contrast**: Ensure accessibility compliance
5. **Document Usage**: Add clear guidelines for when to use

#### **Example: Tournament System**

```css
/* Tournament Rankings */
--color-tournament-bronze-300: oklch(0.7 0.1 45);
--color-tournament-silver-300: oklch(0.8 0.02 220);
--color-tournament-gold-300: oklch(0.85 0.12 85);
--color-tournament-platinum-300: oklch(0.88 0.02 280);
```

### **Seasonal/Event Themes**

Override specific tokens for temporary themes:

```css
/* Halloween Theme */
[data-theme='halloween'] {
  --color-interactive-primary: oklch(0.65 0.2 30); /* Orange */
  --color-premium-emerald-400: oklch(0.3 0.15 120); /* Dark green */
  --color-surface-primary: oklch(0.08 0.03 280); /* Purple tint */
}

/* Christmas Theme */
[data-theme='christmas'] {
  --color-interactive-primary: oklch(0.45 0.18 15); /* Red */
  --color-premium-emerald-400: oklch(0.4 0.15 145); /* Green */
  --color-brand-gold-400: oklch(0.88 0.08 85); /* Softer gold */
}
```

### **Maintaining Color Harmony**

#### **OKLCH Benefits**

- **Perceptual uniformity**: Equal lightness values appear equally bright
- **Predictable manipulation**: Adjusting chroma/hue maintains harmony
- **Wide gamut support**: Access to more vivid colors than RGB

#### **Scale Generation Formula**

```javascript
// Generate harmonious color scale
function generateScale(baseHue, baseChroma) {
  return {
    50: `oklch(0.98 ${baseChroma * 0.2} ${baseHue})`,
    100: `oklch(0.95 ${baseChroma * 0.4} ${baseHue})`,
    200: `oklch(0.90 ${baseChroma * 0.6} ${baseHue})`,
    300: `oklch(0.82 ${baseChroma * 0.8} ${baseHue})`,
    400: `oklch(0.75 ${baseChroma} ${baseHue})`, // Base
    500: `oklch(0.65 ${baseChroma * 1.1} ${baseHue})`,
    600: `oklch(0.55 ${baseChroma * 1.2} ${baseHue})`,
  }
}
```

---

## 🔧 Developer Tools

### **VSCode Snippets**

Add to `.vscode/tailwind.code-snippets`:

```json
{
  "Casino Surface": {
    "prefix": "bg-surface",
    "body": [
      "bg-surface-${1|primary,secondary,card,floating,premium,vip,jackpot|}"
    ],
    "description": "Casino theme surface background"
  },
  "Casino Interactive": {
    "prefix": "bg-interactive",
    "body": [
      "bg-interactive-${1|primary,secondary,tertiary,success,danger|} hover:bg-interactive-${1|primary,secondary,tertiary,success,danger|}-hover"
    ],
    "description": "Casino theme interactive element"
  }
}
```

### **Design Token Export**

For design tools (Figma, Sketch):

```javascript
// Export color tokens as JSON
export const casinoTokens = {
  surface: {
    primary: 'oklch(0.13 0.02 229)',
    secondary: 'oklch(0.20 0.03 229)',
    // ... rest of tokens
  },
  brand: {
    gold: {
      50: 'oklch(0.98 0.02 85)',
      // ... gold scale
    },
  },
}
```

---

## 📊 Performance Considerations

### **CSS Variable Benefits**

- **Runtime theming**: Switch themes without recompiling CSS
- **Reduced bundle size**: One stylesheet for all themes
- **Better caching**: CSS variables cached separately from selectors

### **Optimization Tips**

1. **Group related tokens**: Keep surface colors together in CSS
2. **Use CSS layers**: Separate theme from utilities
3. **Minimize custom properties**: Only expose necessary tokens
4. **Leverage inheritance**: Child elements inherit parent variables

---

## ✅ Quality Checklist

### **Before Adding New Colors**

- [ ] Purpose clearly defined
- [ ] Follows naming convention
- [ ] WCAG AA contrast compliance
- [ ] Tested in dark mode
- [ ] Added to ESLint rules
- [ ] Documentation updated
- [ ] Design team approval

### **Theme Health Check**

- [ ] All interactive states defined
- [ ] Consistent lightness progression
- [ ] No hardcoded hex values in components
- [ ] Accessibility audit passed
- [ ] Visual regression tests passing
- [ ] Cross-browser compatibility verified

---

**Congratulations!** 🎉 You now have a sophisticated, scalable color system that can evolve with your casino application while maintaining premium aesthetics and accessibility standards.
