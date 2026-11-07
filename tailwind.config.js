/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0a192f',
          800: '#112240',
          700: '#1d3557',
          600: '#233554',
          500: '#457b9d',
        },
        safety: {
          high: '#10b981',
          moderate: '#f59e0b',
          low: '#ef4444',
          insufficient: '#94a3b8',
        }
      }
    },
  },
  plugins: [],
}
