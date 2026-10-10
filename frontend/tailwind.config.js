/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        emergency: {
          orange: '#f97316',
          red: '#ef4444',
          yellow: '#facc15',
          green: '#22c55e',
          blue: '#3b82f6',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(251,146,60,0.18), 0 16px 36px rgba(2,6,23,0.35)',
      },
    },
  },
  plugins: [],
};
