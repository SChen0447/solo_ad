import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { ApiConfig, ApiResult } from '../types';
import { transformApiResponse } from '../utils/dataUtils';

const TIMEOUT = 15000;

function buildHeaders(headers: { key: string; value: string }[]): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach(h => {
    if (h.key.trim()) {
      result[h.key] = h.value;
    }
  });
  return result;
}

function buildParams(params: { key: string; value: string }[]): Record<string, string> {
  const result: Record<string, string> = {};
  params.forEach(p => {
    if (p.key.trim()) {
      result[p.key] = p.value;
    }
  });
  return result;
}

async function executeSingleRequest(config: ApiConfig): Promise<ApiResult> {
  const result: ApiResult = {
    configId: config.id,
    status: 'loading'
  };

  try {
    const requestConfig: AxiosRequestConfig = {
      method: config.method,
      url: config.url,
      timeout: TIMEOUT,
      headers: buildHeaders(config.headers),
      params: config.method === 'GET' ? buildParams(config.params) : undefined,
      data: config.method === 'POST' ? buildParams(config.params) : undefined
    };

    const response = await axios.request(requestConfig);
    const { tableData, chartData } = transformApiResponse(response.data);
    
    result.status = 'success';
    result.data = tableData;
    result.chartData = chartData;
    result.raw = response.data;

    return result;
  } catch (error) {
    result.status = 'error';
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNABORTED') {
        result.error = '请求超时（15秒），请检查网络连接或API地址';
      } else if (axiosError.response) {
        result.error = `请求失败：HTTP ${axiosError.response.status} - ${axiosError.response.statusText}`;
      } else if (axiosError.request) {
        result.error = '网络错误：无法连接到服务器，请检查API地址或网络连接';
      } else {
        result.error = `请求配置错误：${axiosError.message}`;
      }
    } else if (error instanceof Error) {
      result.error = `请求出错：${error.message}`;
    } else {
      result.error = '请求发生未知错误';
    }

    return result;
  }
}

export function executeApiRequests(
  configs: ApiConfig[],
  onProgress?: (result: ApiResult) => void
): Promise<ApiResult[]> {
  const promises = configs.map(async (config) => {
    const result = await executeSingleRequest(config);
    if (onProgress) {
      onProgress(result);
    }
    return result;
  });

  return Promise.all(promises);
}

export function validateConfig(config: ApiConfig): { valid: boolean; message?: string } {
  if (!config.name.trim()) {
    return { valid: false, message: '请输入API名称' };
  }
  
  if (!config.url.trim()) {
    return { valid: false, message: '请输入请求URL' };
  }
  
  try {
    new URL(config.url);
  } catch {
    return { valid: false, message: '请输入有效的URL地址' };
  }
  
  return { valid: true };
}
