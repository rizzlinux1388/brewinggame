import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        table: {
          DEFAULT: '#1a6b3c',
          light: '#2d8a54',
          dark: '#0f4525',
        },
        card: {
          bg: '#f5f0e8',
          border: '#c9b99a',
          red: '#c0392b',
          black: '#1a1a2e',
        },
      },
      fontFamily: {
        game: ['Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.3), 0 0 1px rgba(0,0,0,0.2)',
        'card-hover': '0 6px 16px rgba(0,0,0,0.4)',
        'card-selected': '0 8px 20px rgba(59,130,246,0.5)',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'flip-card': 'flipCard 0.4s ease-in-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        flipCard: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(59,130,246,0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(59,130,246,0.8)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
