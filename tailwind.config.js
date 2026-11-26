/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '420px',
      },
      colors: {
        brand: {
          50: '#ecfdf8',
          100: '#d1f7ec',
          200: '#a6ecdb',
          300: '#70dbc6',
          400: '#39c2ac',
          500: '#16a394',
          600: '#0c8279',
          700: '#0d6963',
          800: '#105451',
          900: '#114542',
        },
        ink: {
          50: '#f4f7f9',
          100: '#e5edf1',
          200: '#cbdbe3',
          300: '#a4bbc9',
          400: '#7695a8',
          500: '#577a8f',
          600: '#456277',
          700: '#3a5061',
          800: '#233c4c',
          900: '#0f2b3d',
        },
        flame: {
          50: '#fff5ed',
          100: '#ffe8d4',
          200: '#ffcda8',
          300: '#ffa970',
          400: '#ff7f37',
          500: '#fb5d12',
          600: '#ec4107',
          700: '#c32e08',
          800: '#9b250f',
          900: '#7d2210',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,43,61,0.04), 0 4px 14px -10px rgba(15,43,61,0.22)',
        lift: '0 18px 40px -18px rgba(15,43,61,0.35)',
      },
      backgroundImage: {
        'guild-hero': 'radial-gradient(120% 120% at 0% 0%, #16a394 0%, #0d6963 45%, #0f2b3d 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          '0%': { opacity: '0', transform: 'scale(.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'sheet-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'float': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s ease-out both',
        'sheet-up': 'sheet-up .22s ease-out both',
        pop: 'pop .18s ease-out both',
        float: 'float 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
