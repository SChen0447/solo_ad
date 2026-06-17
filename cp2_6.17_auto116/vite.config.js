import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020'
  },
  esbuild: {
    target: 'es2020'
  },
  optimizeDeps: {
    include: ['three', 'dat.gui']
  }
});
