import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'glsl-loader',
      transform(code: string, id: string) {
        if (id.endsWith('.glsl') || id.endsWith('.vert') || id.endsWith('.frag')) {
          return {
            code: `export default ${JSON.stringify(code)};`,
            map: null
          };
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  assetsInclude: ['**/*.glsl', '**/*.vert', '**/*.frag'],
  server: {
    port: 5173,
    host: true
  }
});
