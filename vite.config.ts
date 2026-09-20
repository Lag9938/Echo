import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('livekit-client')) {
              return 'vendor-livekit'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            if (id.includes('lottie-web')) {
              return 'vendor-lottie'
            }
            if (id.includes('posthog-js')) {
              return 'vendor-analytics'
            }
            if (id.includes('@tanstack/react-virtual')) {
              return 'vendor-tanstack'
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
          }
        }
      }
    }
  }
})
