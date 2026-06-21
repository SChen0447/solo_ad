const { defineConfig } = require('vite');

module.exports = defineConfig({
  root: '.',
  base: './',
  server: {
    port: 3000,
    open: false,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
