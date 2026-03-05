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
          0: '#0a0e17',
          1: '#111827',
          2: '#1a2235',
          3: '#243049',
        },
        accent: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          dim: '#4f46e5',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
      },
    },
  },
  plugins: [],
}
