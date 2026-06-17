import { exec } from 'child_process';
import { promisify } from 'util';
import * as vm from 'vm';

const execAsync = promisify(exec);

export interface SandboxResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

const EXECUTION_TIMEOUT = 5000;
const MAX_MEMORY_MB = 128;

export async function executeCode(
  code: string,
  language: string
): Promise<SandboxResult> {
  const startTime = Date.now();

  try {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        return executeJavaScript(code, startTime);
      case 'python':
      case 'py':
        return executePython(code, startTime);
      case 'html':
        return executeHTML(code, startTime);
      default:
        return {
          success: false,
          output: '',
          error: `Unsupported language: ${language}`,
          executionTime: Date.now() - startTime,
        };
    }
  } catch (err) {
    return {
      success: false,
      output: '',
      error: err instanceof Error ? err.message : String(err),
      executionTime: Date.now() - startTime,
    };
  }
}

function executeJavaScript(code: string, startTime: number): SandboxResult {
  const output: string[] = [];
  const sandbox = {
    console: {
      log: (...args: unknown[]) => {
        output.push(args.map((a) => stringify(a)).join(' '));
      },
      error: (...args: unknown[]) => {
        output.push(args.map((a) => stringify(a)).join(' '));
      },
      warn: (...args: unknown[]) => {
        output.push(args.map((a) => stringify(a)).join(' '));
      },
    },
    setTimeout: () => {
      throw new Error('setTimeout is not allowed in sandbox');
    },
    setInterval: () => {
      throw new Error('setInterval is not allowed in sandbox');
    },
  };

  try {
    const context = vm.createContext(sandbox);
    const script = new vm.Script(code, { timeout: EXECUTION_TIMEOUT });
    script.runInContext(context, { timeout: EXECUTION_TIMEOUT });

    return {
      success: true,
      output: output.join('\n'),
      executionTime: Date.now() - startTime,
    };
  } catch (err) {
    return {
      success: false,
      output: output.join('\n'),
      error: err instanceof Error ? err.message : String(err),
      executionTime: Date.now() - startTime,
    };
  }
}

async function executePython(
  code: string,
  startTime: number
): Promise<SandboxResult> {
  try {
    const escapedCode = code.replace(/'/g, "'\\''");
    const { stdout, stderr } = await execAsync(
      `python3 -c '${escapedCode}'`,
      {
        timeout: EXECUTION_TIMEOUT,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      }
    );

    return {
      success: !stderr,
      output: stdout,
      error: stderr || undefined,
      executionTime: Date.now() - startTime,
    };
  } catch (err) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message || String(err),
      executionTime: Date.now() - startTime,
    };
  }
}

function executeHTML(code: string, startTime: number): SandboxResult {
  try {
    const output = `HTML preview generated (${code.length} characters)\n` +
      `Note: Full HTML rendering requires a browser environment.\n` +
      `Code preview:\n${code.substring(0, 500)}${code.length > 500 ? '...' : ''}`;

    return {
      success: true,
      output,
      executionTime: Date.now() - startTime,
    };
  } catch (err) {
    return {
      success: false,
      output: '',
      error: err instanceof Error ? err.message : String(err),
      executionTime: Date.now() - startTime,
    };
  }
}

function stringify(value: unknown): string {
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
