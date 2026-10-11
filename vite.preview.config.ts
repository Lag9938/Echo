import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Gera a "prévia do Aurora": as telas reais do Echo com dados de exemplo, num pacote estático (um .js e um .css).
// Uso: npm run preview:build  ->  dist-preview/ (preview.js, preview.css). Não afeta o build do app.
export default defineConfig({
  plugins: [react()],
  base: './',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist-preview',
    emptyOutDir: true,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 4000,
    lib: {
      entry: 'src/preview/main.tsx',
      name: 'EchoPreview',
      formats: ['iife'],
      fileName: () => 'preview.js',
      cssFileName: 'preview'
    },
    rollupOptions: {
      output: { inlineDynamicImports: true }
    }
  }
})
