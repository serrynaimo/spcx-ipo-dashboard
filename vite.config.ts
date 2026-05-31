import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_PORT = process.env.PORT || 8787

// In dev, Vite serves the React app and proxies /api to the Express server,
// which holds the L4 API key server-side (never shipped to the browser).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
})
