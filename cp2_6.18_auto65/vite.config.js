import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    open: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
});
