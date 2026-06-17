import axios, { AxiosRequestConfig } from 'axios';
import type { ApiConfig, ApiResult } from '../context/AppContext';

const TIMEOUT_MS = 15000;

export async function fetchAllApis(
  configs: ApiConfig[],
  onResult: (configId: string, result: Partial<ApiResult>) => void
): Promise<void> {
  const promises = configs.map(async (config): Promise<void> => {
    onResult(config.id, { configId: config.id, status: 'loading', data: null, error: null, chartType: 'bar' });

    try {
      const axiosConfig: AxiosRequestConfig = {
        method: config.method,
        url: config.url,
        headers: config.headers,
        timeout: TIMEOUT_MS,
      };

      if (config.method === 'GET') {
        axiosConfig.params = config.params;
      } else {
        axiosConfig.data = config.params;
      }

      const response = await axios(axiosConfig);
      let data: Record<string, unknown>[];

      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (typeof response.data === 'object' && response.data !== null) {
        data = [response.data];
      } else {
        data = [{ value: response.data }];
      }

      onResult(config.id, { status: 'success', data, error: null });
    } catch (err: unknown) {
      let errorMessage = 'Unknown error';
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          errorMessage = 'Request timeout (15s)';
        } else if (err.response) {
          errorMessage = `HTTP ${err.response.status}: ${err.response.statusText}`;
        } else {
          errorMessage = err.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      onResult(config.id, { status: 'error', data: null, error: errorMessage });
    }
  });

  await Promise.allSettled(promises);
}
