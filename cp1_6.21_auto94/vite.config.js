export default {
  optimizeDeps: {
    include: ['phaser'],
  },
  build: {
    commonjsOptions: {
      include: [/phaser/, /node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
};
