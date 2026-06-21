import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          tone: ['tone']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['three', 'tone']
  }
});
