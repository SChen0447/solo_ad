import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020'
  },
  server: {
    port: 3000,
    host: true
  },
  esbuild: {
    target: 'es2020'
  }
});
