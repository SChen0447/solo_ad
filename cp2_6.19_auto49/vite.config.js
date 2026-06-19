const { defineConfig } = require('vite');

module.exports = defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist'
  }
});
