/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0b1020',
        panel: '#141a2e',
        muted: '#8ca0b3',
        text: '#e6eef7',
        accent: '#4f8cff',
        'accent-2': '#00d0a3',
        border: '#27324a',
        // Light mode colors
        'bg-light': '#f8f9fa',
        'panel-light': '#ffffff',
        'muted-light': '#6c757d',
        'text-light': '#212529',
        'border-light': '#dee2e6',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
