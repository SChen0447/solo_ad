import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    hmr: true,
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    target: 'esnext',
  },
});
