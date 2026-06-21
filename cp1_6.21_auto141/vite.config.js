import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: false
  },
  assetsInclude: ['**/*.gltf', '**/*.glb'],
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
