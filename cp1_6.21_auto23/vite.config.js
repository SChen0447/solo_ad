import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/frontend'),
      '@backend': path.resolve(__dirname, './src/backend'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:9876',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:9876',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
