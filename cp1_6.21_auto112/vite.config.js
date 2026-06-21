import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    host: true
  },
  optimizeDeps: {
    include: ['three', '@tweenjs/tween.js', 'dat.gui']
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          tween: ['@tweenjs/tween.js'],
          gui: ['dat.gui']
        }
      }
    }
  }
})
