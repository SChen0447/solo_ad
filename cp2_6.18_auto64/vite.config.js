import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    host: true,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    minify: 'esbuild'
  },
  optimizeDeps: {
    include: ['three', 'dat.gui', 'stats.js']
  }
});
