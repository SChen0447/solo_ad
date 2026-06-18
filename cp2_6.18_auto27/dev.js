import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProcess;
let viteProcess;

function startServer() {
  console.log('Starting backend server...');
  serverProcess = spawn('npx', ['tsx', 'server/server.ts'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  serverProcess.on('error', (err) => {
    console.error('Server process error:', err);
  });

  serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

function startVite() {
  console.log('Starting Vite dev server...');
  viteProcess = spawn('npx', ['vite'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  viteProcess.on('error', (err) => {
    console.error('Vite process error:', err);
  });

  viteProcess.on('exit', (code) => {
    console.log(`Vite process exited with code ${code}`);
    cleanup();
    process.exit(code ?? 0);
  });
}

function cleanup() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
  if (viteProcess && !viteProcess.killed) {
    viteProcess.kill();
  }
}

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

startServer();

setTimeout(() => {
  startVite();
}, 2000);
