/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'whisper-violet': '#7F00FF',
        'dark-bg': '#121212',
        'dark-card': '#1E1E1E',
      }
    },
  },
  plugins: [],
}
