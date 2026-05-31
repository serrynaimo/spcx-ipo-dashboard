/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b1020',
        panel: '#121a2e',
        panel2: '#19233d',
        edge: '#27324f',
        buy: '#22c55e',
        sell: '#ef4444',
        accent: '#60a5fa',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
