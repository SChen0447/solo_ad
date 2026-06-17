import { spawn } from 'child_process';
import { VM } from 'vm2';

export type Language = 'javascript' | 'python' | 'html';

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

const TIMEOUT_MS = 5000;

export async function executeCode(
  code: string,
  language: Language
): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    switch (language) {
      case 'javascript':
        return await executeJavaScript(code, startTime);
      case 'python':
        return await executePython(code, startTime);
      case 'html':
        return await executeHTML(code, startTime);
      default:
        return {
          success: false,
          output: '',
          error: `不支持的语言: ${language}`,
          executionTime: Date.now() - startTime
        };
    }
  } catch (err) {
    return {
      success: false,
      output: '',
      error: err instanceof Error ? err.message : String(err),
      executionTime: Date.now() - startTime
    };
  }
}

async function executeJavaScript(
  code: string,
  startTime: number
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    let output = '';
    let errorOutput = '';

    const vm = new VM({
      timeout: TIMEOUT_MS,
      allowAsync: false,
      sandbox: {
        console: {
          log: (...args: unknown[]) => {
            output += args.map(String).join(' ') + '\n';
          },
          error: (...args: unknown[]) => {
            errorOutput += args.map(String).join(' ') + '\n';
          },
          warn: (...args: unknown[]) => {
            output += args.map(String).join(' ') + '\n';
          }
        }
      }
    });

    try {
      const result = vm.run(code);
      if (result !== undefined) {
        output += String(result);
      }
      resolve({
        success: true,
        output: output.trim(),
        error: errorOutput || undefined,
        executionTime: Date.now() - startTime
      });
    } catch (err) {
      resolve({
        success: false,
        output: output.trim(),
        error: errorOutput + (err instanceof Error ? err.message : String(err)),
        executionTime: Date.now() - startTime
      });
    }
  });
}

async function executePython(
  code: string,
  startTime: number
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python', ['-c', code], {
      timeout: TIMEOUT_MS,
      env: { PATH: process.env.PATH }
    });

    let output = '';
    let errorOutput = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      pythonProcess.kill('SIGKILL');
      resolve({
        success: false,
        output: output.trim(),
        error: '执行超时（超过5秒）',
        executionTime: Date.now() - startTime
      });
    }, TIMEOUT_MS);

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (timedOut) return;
      clearTimeout(timeout);

      resolve({
        success: code === 0,
        output: output.trim(),
        error: errorOutput || undefined,
        executionTime: Date.now() - startTime
      });
    });

    pythonProcess.on('error', (err) => {
      if (timedOut) return;
      clearTimeout(timeout);

      if (err.message.includes('ENOENT')) {
        resolve({
          success: false,
          output: output.trim(),
          error: 'Python未安装或不在PATH中。请安装Python后重试。',
          executionTime: Date.now() - startTime
        });
      } else {
        resolve({
          success: false,
          output: output.trim(),
          error: err.message,
          executionTime: Date.now() - startTime
        });
      }
    });
  });
}

async function executeHTML(
  code: string,
  startTime: number
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    let output = '';
    let errorOutput = '';

    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    const scripts: string[] = [];

    while ((match = scriptRegex.exec(code)) !== null) {
      scripts.push(match[1]);
    }

    const vm = new VM({
      timeout: TIMEOUT_MS,
      allowAsync: false,
      sandbox: {
        console: {
          log: (...args: unknown[]) => {
            output += args.map(String).join(' ') + '\n';
          },
          error: (...args: unknown[]) => {
            errorOutput += args.map(String).join(' ') + '\n';
          }
        },
        document: {
          write: (html: string) => {
            output += `[HTML输出] ${html}\n`;
          },
          getElementById: () => ({
            innerHTML: '',
            textContent: '',
            addEventListener: () => {}
          }),
          createElement: () => ({
            innerHTML: '',
            textContent: '',
            appendChild: () => {}
          }),
          body: {
            appendChild: () => {}
          }
        },
        window: {
          addEventListener: () => {},
          alert: (msg: string) => {
            output += `[Alert] ${msg}\n`;
          }
        }
      }
    });

    try {
      for (const script of scripts) {
        vm.run(script);
      }

      resolve({
        success: true,
        output: output.trim() || 'HTML解析完成（未检测到可执行脚本输出）',
        error: errorOutput || undefined,
        executionTime: Date.now() - startTime
      });
    } catch (err) {
      resolve({
        success: false,
        output: output.trim(),
        error: errorOutput + (err instanceof Error ? err.message : String(err)),
        executionTime: Date.now() - startTime
      });
    }
  });
}
