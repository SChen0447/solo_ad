import { spawn } from 'child_process';
import http from 'http';

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
          resolve(isBackend ? port : null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => {
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
};

const findBackendPort = async (startPort = 3001, maxTries = 10) => {
  for (let i = 0; i < maxTries; i++) {
    const port = await checkBackendPort(startPort + i);
    if (port) return port;
  }
  return null;
};

const waitForBackend = async (startPort = 3001, maxTries = 10, timeout = 15000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const port = await findBackendPort(startPort, maxTries);
    if (port) return port;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('等待后端服务启动超时');
};

const startServer = () => {
  console.log('🚀 启动后端服务...');
  const server = spawn('npx', ['tsx', 'watch', 'server/index.ts'], {
    stdio: 'pipe',
    shell: true
  });

  server.stdout.on('data', (data) => {
    process.stdout.write(`[server] ${data}`);
  });

  server.stderr.on('data', (data) => {
    process.stderr.write(`[server] ${data}`);
  });

  server.on('close', (code) => {
    console.log(`后端服务退出，退出码: ${code}`);
    process.exit(code || 0);
  });

  return server;
};

const startClient = async (backendPort) => {
  console.log(`🚀 启动前端开发服务器 (代理到后端端口 ${backendPort})...`);
  process.env.BACKEND_PORT = backendPort;
  
  const client = spawn('npx', ['vite'], {
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, BACKEND_PORT: backendPort }
  });

  client.stdout.on('data', (data) => {
    process.stdout.write(`[client] ${data}`);
  });

  client.stderr.on('data', (data) => {
    process.stderr.write(`[client] ${data}`);
  });

  client.on('close', (code) => {
    console.log(`前端服务退出，退出码: ${code}`);
    process.exit(code || 0);
  });

  return client;
};

const main = async () => {
  try {
    const serverProcess = startServer();
    console.log('⏳ 等待后端服务启动...');
    
    const backendPort = await waitForBackend();
    console.log(`✅ 后端服务已启动，运行在端口 ${backendPort}`);
    
    await startClient(backendPort);
    
    process.on('SIGINT', () => {
      console.log('\n🛑 正在停止服务...');
      serverProcess.kill('SIGINT');
      process.exit(0);
    });
  } catch (error) {
    console.error('启动失败:', error.message);
    process.exit(1);
  }
};

main();
