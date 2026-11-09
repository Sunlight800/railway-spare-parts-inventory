/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        railway: {
          dark: '#001A35',
          navy: '#002B49',
          blue: '#004B87',
          light: '#E8F1F5',
          steel: '#4A607A',
          gold: '#C59B27',
          crimson: '#A6192E',
          emerald: '#008542'
        }
      }
    },
  },
  plugins: [],
}
