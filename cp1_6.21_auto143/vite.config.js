import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "sass:color";`
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
})
