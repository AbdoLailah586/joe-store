/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        joe: {
          bg: '#080C14',
          surface: '#0F1626',
          card: '#151F33',
          cardHover: '#1B2742',
          border: 'rgba(255, 255, 255, 0.08)',
          borderGold: 'rgba(245, 158, 11, 0.35)',
          gold: '#F59E0B',
          goldLight: '#FDE68A',
          goldDark: '#B45309',
          goldGlow: '#FBBF24',
          accent: '#3B82F6',
          accentLight: '#60A5FA',
          emerald: '#10B981',
          rose: '#F43F5E',
          purple: '#8B5CF6',
        },
        market: {
          dark: '#0F172A',
          gray: '#64748B',
          lightBg: '#F8FAFC',
          cardLight: '#FFFFFF',
          textDark: '#0F172A',
          textMuted: '#64748B',
        }
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'glow-gold': '0 0 25px -4px rgba(245, 158, 11, 0.35)',
        'glow-gold-lg': '0 0 40px -2px rgba(245, 158, 11, 0.45)',
        'glow-blue': '0 0 25px -4px rgba(59, 130, 246, 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shine': 'shine 2.5s infinite linear',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shine: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        }
      }
    },
  },
  plugins: [],
}
