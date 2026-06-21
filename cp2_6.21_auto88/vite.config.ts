import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function backendPlugin(): Plugin {
  return {
    name: 'backend-server',
    configureServer: async () => {
      const { startServer } = await import('./src/server/server')
      startServer()
    }
  }
}

export default defineConfig({
  plugins: [react(), backendPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/client')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
