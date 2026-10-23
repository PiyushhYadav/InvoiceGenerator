/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        sidebar: '#f6f5f0',
        canvas: '#f8f9fa',
        sage: {
          50: '#f2f6f2',
          100: '#e5ece4',
          200: '#d5dfd3',
          500: '#3b7a57',
          600: '#2f6346',
          800: '#1b3f2b',
        }
      }
    },
  },
  plugins: [],
}
