/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vintage: {
          dark: '#121214',
          card: '#1c1b20',
          paper: '#e8dcbe',
          paperDark: '#c9b896',
          gold: '#d4af37',
          goldLight: '#f3e5ab',
          crimson: '#8b0000',
          wine: '#4a0e17',
          police: '#1e3a8a',
        },
      },
      fontFamily: {
        vintage: ['Playfair Display', 'Georgia', 'serif'],
        pixel: ['"Press Start 2P"', 'monospace'],
        silkscreen: ['Silkscreen', 'monospace'],
        sans: ['Kanit', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
