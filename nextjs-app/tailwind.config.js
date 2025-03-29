/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}", // Scans all files in app/
    "./components/**/*.{js,ts,jsx,tsx}", // Scans components/
  ],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
};