import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1500
  },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei', 'd3', 'leva']
  }
})
