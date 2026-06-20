import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@city': path.resolve(__dirname, './src/modules/city'),
      '@simulation': path.resolve(__dirname, './src/modules/simulation'),
      '@rendering': path.resolve(__dirname, './src/modules/rendering')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
});
