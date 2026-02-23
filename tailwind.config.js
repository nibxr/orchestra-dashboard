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
        // Custom colors to match Dafolle if needed, 
        // though we used standard hex codes in the code.
      }
    },
  },
  plugins: [],
}