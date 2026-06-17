import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: false,
    hmr: {
      overlay: true
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020'
  }
});
