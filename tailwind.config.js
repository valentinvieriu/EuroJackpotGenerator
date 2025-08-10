module.exports = {
  content: [
    './app/components/**/*.{js,vue,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './nuxt.config.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        // Gilded Jackpot Palette
        'casino-blue': {
          light: '#2C3E50', // muted navy for panels/borders
          DEFAULT: '#0A192F', // rich midnight blue background
          dark: '#06121F',
        },
        'casino-gold': {
          light: '#FFF1A8',
          DEFAULT: '#FFD700', // sharp bright gold for highlights/borders
          dark: '#B8860B',
        },
        ivory: '#FFFFF0', // number text color
        'navy-muted': '#2C3E50',
        'vip-orange': {
          light: '#FF6A33',
          DEFAULT: '#FF4500', // CTA
          dark: '#CC3700',
        },

        // Keep "ball/star" tokens but align them to the new gold scheme
        'ball-yellow': {
          light: '#FFF1A8',
          DEFAULT: '#FFD700',
          dark: '#DAA520',
          shadow: '#B8860B',
        },
        'star-gold': {
          light: '#FFE08A',
          DEFAULT: '#FFC107',
          dark: '#B8860B',
          shadow: '#8B6508',
        },
      },
      boxShadow: {
        // Softer, premium shadows
        ball: 'inset -3px -5px 10px rgba(0,0,0,0.35), inset 3px 4px 6px rgba(255,255,255,0.35), 0 2px 10px rgba(0,0,0,0.25)',
        'ball-winner':
          'inset -4px -6px 12px rgba(0,0,0,0.35), inset 3px 5px 7px rgba(255,255,255,0.35)',
        star: '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 6px rgba(255,255,255,0.35)',
        'star-winner':
          '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 6px rgba(255,255,255,0.35)',
      },
      fontFamily: {},
    },
  },
  plugins: [],
}
