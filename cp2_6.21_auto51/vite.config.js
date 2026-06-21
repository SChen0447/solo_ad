import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function expressBackendPlugin() {
  let serverInstance = null;
  return {
    name: 'vite-plugin-express-backend',
    async configureServer(server) {
      const esbuild = await import('esbuild');
      const fs = await import('fs');
      const os = await import('os');

      const tmpFile = path.join(
        os.tmpdir(),
        `vite-express-server-${Date.now()}.mjs`
      );

      await esbuild.build({
        entryPoints: [path.resolve(__dirname, 'src/backend/server.ts')],
        bundle: true,
        platform: 'node',
        format: 'esm',
        outfile: tmpFile,
        external: ['express', 'cors', 'uuid'],
        banner: {
          js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
        },
      });

      const { default: app } = await import(tmpFile + '?t=' + Date.now());
      server.middlewares.use('/api', (req, res, next) => {
        app(req, res, next);
      });

      server.httpServer?.on('close', () => {
        try {
          fs.unlinkSync(tmpFile);
        } catch (_) {}
      });

      console.log('\n✅  Express API 已挂载到 Vite 开发服务器');
      console.log('📡  API 基础路径: /api\n');
    },
  };
}

export default defineConfig({
  plugins: [react(), expressBackendPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
