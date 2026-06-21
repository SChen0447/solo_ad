import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    sourcemap: true
  },
  server: {
    port: 5173,
    open: true
  }
});
