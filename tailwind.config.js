/** @type {import('tailwindcss').Config} */
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
        'casino-blue': {
          light: '#1a2a4a', // Lighter shade for accents/hover
          DEFAULT: '#0f172a', // Main background blue (like slate-900)
          dark: '#0a101f', // Darker shade
        },
        'casino-gold': {
          light: '#fef08a', // Lighter yellow-gold (like yellow-200)
          DEFAULT: '#eab308', // Main gold (like yellow-600)
          dark: '#b45309', // Darker amber/gold (like amber-700)
        },
        'ball-yellow': {
          light: '#fde047', // yellow-400
          DEFAULT: '#facc15', // yellow-500
          dark: '#eab308', // yellow-600
          shadow: '#ca8a04', // yellow-700 for shadow tones
        },
      },
      boxShadow: {
        'ball': 'inset -3px -3px 8px rgba(0,0,0,0.3), inset 3px 3px 5px rgba(255,255,255,0.4), 0px 0px 10px rgba(0,0,0,0.2)',
        'ball-winner':
          'inset -3px -3px 8px rgba(0,0,0,0.3), inset 3px 3px 5px rgba(255,255,255,0.4), 0 0 15px 5px rgba(250, 204, 21, 0.7)', // Added glow
      },
      fontFamily: {
        // sans: ['Inter', 'sans-serif'], // Example if you want to change font
      },
    },
  },
  plugins: [],
}
