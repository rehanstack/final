/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        black: 'rgb(var(--color-black) / <alpha-value>)',
        white: 'rgb(var(--color-white) / <alpha-value>)',
        gray: {
          50: 'rgb(var(--color-gray-50) / <alpha-value>)',
          100: 'rgb(var(--color-gray-100) / <alpha-value>)',
          200: 'rgb(var(--color-gray-200) / <alpha-value>)',
          300: 'rgb(var(--color-gray-300) / <alpha-value>)',
          400: 'rgb(var(--color-gray-400) / <alpha-value>)',
          500: 'rgb(var(--color-gray-500) / <alpha-value>)',
          600: 'rgb(var(--color-gray-600) / <alpha-value>)',
          700: 'rgb(var(--color-gray-700) / <alpha-value>)',
          800: 'rgb(var(--color-gray-800) / <alpha-value>)',
          900: 'rgb(var(--color-gray-900) / <alpha-value>)',
        },
        yellow: {
          50: 'rgb(var(--color-yellow-50) / <alpha-value>)',
          100: 'rgb(var(--color-yellow-100) / <alpha-value>)',
          200: 'rgb(var(--color-yellow-200) / <alpha-value>)',
          300: 'rgb(var(--color-yellow-300) / <alpha-value>)',
          400: 'rgb(var(--color-yellow-400) / <alpha-value>)',
          500: 'rgb(var(--color-yellow-500) / <alpha-value>)',
          600: 'rgb(var(--color-yellow-600) / <alpha-value>)',
        },
        'dark': {
          50: 'rgb(var(--color-dark-50) / <alpha-value>)',
          100: 'rgb(var(--color-dark-100) / <alpha-value>)',
          200: 'rgb(var(--color-dark-200) / <alpha-value>)',
          300: 'rgb(var(--color-dark-300) / <alpha-value>)',
          400: 'rgb(var(--color-dark-400) / <alpha-value>)',
          500: 'rgb(var(--color-dark-500) / <alpha-value>)',
          600: 'rgb(var(--color-dark-600) / <alpha-value>)',
          700: 'rgb(var(--color-dark-700) / <alpha-value>)',
          800: 'rgb(var(--color-dark-800) / <alpha-value>)',
          900: 'rgb(var(--color-dark-900) / <alpha-value>)',
          950: 'rgb(var(--color-dark-950) / <alpha-value>)'
        },
        'primary': 'rgb(var(--color-primary) / <alpha-value>)',
        'secondary': 'rgb(var(--color-secondary) / <alpha-value>)',
        'accent': 'rgb(var(--color-accent) / <alpha-value>)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass': 'rgba(var(--color-white), 0.07)'
      },
      backdropBlur: {
        'glass': '10px'
      },
      boxShadow: {
        'glow': '0 0 20px rgb(var(--color-primary) / 0.5)',
        'glow-lg': '0 0 40px rgb(var(--color-primary) / 0.4)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.3)'
      }
    },
  },
  plugins: [],
}
