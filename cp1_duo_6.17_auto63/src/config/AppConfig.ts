/**
 * AppConfig - 全局应用配置
 *
 * 从 Vite 环境变量读取配置，未设置则使用默认值。
 * 部署时通过 .env 文件或系统环境变量注入。
 */

export interface AppConfig {
  readonly API_BASE_URL: string;
  readonly REQUEST_TIMEOUT_MS: number;
  readonly REQUEST_MAX_RETRIES: number;
  readonly SOCKET_IO_URL: string;
  readonly DEFAULT_MAZE_SIZE: number;
  readonly MIN_COINS: number;
  readonly MAX_AI: number;
  readonly AI_CHASE_RANGE: number;
}

const fromEnv = (key: string, fallback: string): string => {
  try {
    const val = (import.meta as any).env?.[key];
    return typeof val === 'string' && val.length > 0 ? val : fallback;
  } catch {
    return fallback;
  }
};

const fromEnvNum = (key: string, fallback: number): number => {
  const raw = fromEnv(key, String(fallback));
  const n = Number(raw);
  return isFinite(n) ? n : fallback;
};

export const AppConfig: AppConfig = Object.freeze({
  API_BASE_URL: fromEnv('VITE_API_BASE_URL', '/api'),
  REQUEST_TIMEOUT_MS: fromEnvNum('VITE_REQUEST_TIMEOUT_MS', 5000),
  REQUEST_MAX_RETRIES: fromEnvNum('VITE_REQUEST_MAX_RETRIES', 2),
  SOCKET_IO_URL: fromEnv('VITE_SOCKET_IO_URL', ''),
  DEFAULT_MAZE_SIZE: fromEnvNum('VITE_DEFAULT_MAZE_SIZE', 10),
  MIN_COINS: fromEnvNum('VITE_MIN_COINS', 8),
  MAX_AI: fromEnvNum('VITE_MAX_AI', 5),
  AI_CHASE_RANGE: fromEnvNum('VITE_AI_CHASE_RANGE', 3),
});

(window as any).__MAZE_APP_CONFIG__ = AppConfig;
