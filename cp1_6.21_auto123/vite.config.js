import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true
  },
  optimizeDeps: {
    include: ['three', 'd3-array', 'd3-scale', '@tweenjs/tween.js', 'dat.gui']
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          d3: ['d3-array', 'd3-scale'],
          tween: ['@tweenjs/tween.js'],
          gui: ['dat.gui']
        }
      }
    }
  }
});
