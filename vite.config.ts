import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    middlewareMode: false,
    allowedHosts: ['caecal-taunya-jargonistic.ngrok-free.dev'],
    hmr: {
      host: 'caecal-taunya-jargonistic.ngrok-free.dev',
      protocol: 'wss',
      port: 443,
    },
    proxy: {
      '/api': {
        target: 'https://api.referralrock.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
