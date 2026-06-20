import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020'
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
