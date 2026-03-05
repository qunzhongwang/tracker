/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#fafaf9',
          1: '#ffffff',
          2: '#f5f5f4',
          3: '#e7e5e4',
        },
        accent: {
          DEFAULT: '#b45309',
          light: '#d97706',
          dim: '#92400e',
        },
        success: '#15803d',
        warning: '#a16207',
        danger: '#b91c1c',
        info: '#0369a1',
      },
    },
  },
  plugins: [],
}
