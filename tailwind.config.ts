import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        migra: ['PP Migra', 'serif'],
        montreal: ['PP Neue Montreal', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
