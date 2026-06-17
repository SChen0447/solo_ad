import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { ApiConfig, ApiResult, CACHE_DURATION_OPTIONS, CacheDuration } from '../types';
import { transformApiResponse, generateCacheKey } from '../utils/dataUtils';

const TIMEOUT = 15000;

interface CacheEntry {
  data: unknown;
  timestamp: number;
  duration: CacheDuration;
}

function getCacheDurationMinutes(duration: CacheDuration): number {
  const option = CACHE_DURATION_OPTIONS.find(opt => opt.value === duration);
  return option ? option.minutes : 0;
}

function getCache(config: ApiConfig): ApiResult | null {
  const durationMinutes = getCacheDurationMinutes(config.cacheDuration);
  if (durationMinutes === 0) return null;
  
  const cacheKey = generateCacheKey(config);
  
  try {
    const cachedStr = localStorage.getItem(cacheKey);
    if (!cachedStr) return null;
    
    const cached: CacheEntry = JSON.parse(cachedStr);
    const now = Date.now();
    const expiresAt = cached.timestamp + durationMinutes * 60 * 1000;
    
    if (now > expiresAt) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    const { tableData, chartData } = transformApiResponse(cached.data);
    return {
      configId: config.id,
      status: 'success',
      data: tableData,
      chartData: chartData,
      raw: cached.data,
      fromCache: true,
      cachedAt: cached.timestamp
    };
  } catch {
    return null;
  }
}

function setCache(config: ApiConfig, data: unknown): void {
  const durationMinutes = getCacheDurationMinutes(config.cacheDuration);
  if (durationMinutes === 0) return;
  
  const cacheKey = generateCacheKey(config);
  const cacheEntry: CacheEntry = {
    data,
    timestamp: Date.now(),
    duration: config.cacheDuration
  };
  
  try {
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
  } catch {
    console.warn('无法保存缓存，可能是存储空间不足');
  }
}

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
  const cachedResult = getCache(config);
  if (cachedResult) {
    return cachedResult;
  }

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
    
    setCache(config, response.data);
    
    result.status = 'success';
    result.data = tableData;
    result.chartData = chartData;
    result.raw = response.data;
    result.fromCache = false;
    result.cachedAt = Date.now();

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
