import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Gera a "prévia do Aurora": as telas reais do Echo com dados de exemplo, num pacote estático (um .js e um .css).
// Uso: npm run preview:build  ->  dist-preview/ (preview.js, preview.css). Não afeta o build do app.
export default defineConfig({
  plugins: [
    react(),
    {
      // Os vídeos (decorações e efeitos de cartão) são vários MB cada e, embutidos em base64, estouravam o limite de
      // 16 MB do Artifact. Na prévia eles viram um endereço vazio: o resto da tela é igual.
      name: 'preview-skip-video-assets',
      enforce: 'pre',
      load(id) {
        if (/\.(mp4|webm)(\?.*)?$/.test(id)) return 'export default ""'
      }
    }
  ],
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
