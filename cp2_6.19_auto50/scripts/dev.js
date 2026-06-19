import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 启动 LabFlow 开发环境...\n');

const vite = exec('npx vite', {
  cwd: projectRoot,
  env: { ...process.env, FORCE_COLOR: '1' }
});

const api = exec('npx tsx watch src/server/api.ts', {
  cwd: projectRoot,
  env: { ...process.env, FORCE_COLOR: '1' }
});

vite.stdout?.on('data', (data) => {
  process.stdout.write(`[Vite] ${data}`);
});

vite.stderr?.on('data', (data) => {
  process.stderr.write(`[Vite] ${data}`);
});

api.stdout?.on('data', (data) => {
  process.stdout.write(`[API] ${data}`);
});

api.stderr?.on('data', (data) => {
  process.stderr.write(`[API] ${data}`);
});

vite.on('exit', (code) => {
  console.log(`\nVite 进程退出，代码: ${code}`);
  api.kill();
  process.exit(code || 0);
});

api.on('exit', (code) => {
  console.log(`\nAPI 服务进程退出，代码: ${code}`);
  vite.kill();
  process.exit(code || 0);
});

process.on('SIGINT', () => {
  console.log('\n\n正在关闭服务...');
  vite.kill('SIGINT');
  api.kill('SIGINT');
  setTimeout(() => process.exit(0), 500);
});
