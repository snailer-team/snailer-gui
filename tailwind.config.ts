import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pastelBlue: '#A7C7E7',
        pastelGreen: '#B2D8B2',
        pastelYellow: '#FFF3A3',
        surface: '#FAFBFC',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(17, 24, 39, 0.10)',
      },
      borderRadius: {
        xl2: '18px',
      },
    },
  },
  plugins: [],
} satisfies Config

