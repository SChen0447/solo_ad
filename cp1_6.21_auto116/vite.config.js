import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5173,
    open: true
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          tween: ['@tweenjs/tween.js']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['three', '@tweenjs/tween.js', 'dat.gui']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
