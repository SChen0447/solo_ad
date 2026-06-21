import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function expressBackendPlugin() {
  return {
    name: 'vite-plugin-express-backend',
    async configureServer(server) {
      const esbuild = await import('esbuild');
      const fs = await import('fs');

      const outDir = path.resolve(__dirname, '.vite-dev');
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      const tmpFile = path.join(
        outDir, `server.mjs`);

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

      const fileUrl = pathToFileURL(tmpFile).href + `?t=${Date.now()}`;
      const { default: app } = await import(fileUrl);
      server.middlewares.use('/api', (req, res, next) => {
        app(req, res, next);
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
