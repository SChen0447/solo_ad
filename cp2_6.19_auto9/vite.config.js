import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import http from 'http';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const findBackendPort = async (startPort = 3001, maxTries = 10) => {
  const retries = 5;
  const retryDelay = 1000;
  
  for (let retry = 0; retry < retries; retry++) {
    for (let i = 0; i < maxTries; i++) {
      const port = startPort + i;
      try {
        const isAvailable = await checkBackendPort(port);
        if (isAvailable) {
          console.log(`✅ 检测到后端服务运行在端口 ${port}`);
          return port;
        }
      } catch (e) {
        // 继续尝试下一个端口
      }
    }
    if (retry < retries - 1) {
      console.log(`⏳ 等待后端服务启动中... (${retry + 1}/${retries})`);
      await sleep(retryDelay);
    }
  }
  
  console.warn(`⚠️  未检测到后端服务，默认使用端口 ${startPort}。请确保后端服务已启动。`);
  return startPort;
};

const checkBackendPort = (port) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/api/tags',
      method: 'GET',
      timeout: 1000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const isBackend = Array.isArray(json) && json.length > 0 && json[0].id && json[0].name;
          resolve(isBackend);
        } catch {
          resolve(false);
        }
      });
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
};

export default defineConfig(async () => {
  const backendPort = await findBackendPort();
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true
        }
      }
    }
  };
});
