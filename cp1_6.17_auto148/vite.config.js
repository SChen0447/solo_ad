import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020'
  },
  server: {
    port: 5173,
    open: false
  }
});
