import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'es2019',
    sourcemap: false
  },
  assetsInclude: [
    '**/*.gltf',
    '**/*.glb',
    '**/*.obj',
    '**/*.mtl',
    '**/*.fbx',
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.webp',
    '**/*.hdr'
  ]
});
