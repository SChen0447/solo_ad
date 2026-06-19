import { spawn } from 'child_process';

const vite = spawn('vite', [], { stdio: 'inherit' });
const api = spawn('tsx', ['watch', 'src/server/api.ts'], { stdio: 'inherit' });

vite.on('exit', (code) => process.exit(code || 0));
api.on('exit', (code) => process.exit(code || 0));

process.on('SIGINT', () => {
  vite.kill('SIGINT');
  api.kill('SIGINT');
  process.exit(0);
});
