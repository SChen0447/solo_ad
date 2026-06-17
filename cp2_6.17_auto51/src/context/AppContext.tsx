import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ApiConfig, ApiResult, AppState, AppContextType, ChartType, HttpMethod } from '../types';
import { executeApiRequests } from '../services/apiService';

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [configs, setConfigs] = useState<ApiConfig[]>([
    {
      id: uuidv4(),
      name: '公开JSON示例数据',
      url: 'https://jsonplaceholder.typicode.com/posts?_limit=5',
      method: 'GET',
      headers: [],
      params: []
    }
  ]);
  
  const [results, setResults] = useState<ApiResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [chartTypes, setChartTypes] = useState<Map<string, ChartType>>(new Map());

  const addConfig = useCallback(() => {
    const newConfig: ApiConfig = {
      id: uuidv4(),
      name: `API ${configs.length + 1}`,
      url: '',
      method: 'GET' as HttpMethod,
      headers: [],
      params: []
    };
    setConfigs(prev => [...prev, newConfig]);
    setExpandedCards(prev => new Set(prev).add(newConfig.id));
  }, [configs.length]);

  const updateConfig = useCallback((id: string, updates: Partial<ApiConfig>) => {
    setConfigs(prev => prev.map(cfg => 
      cfg.id === id ? { ...cfg, ...updates } : cfg
    ));
  }, []);

  const removeConfig = useCallback((id: string) => {
    setConfigs(prev => prev.filter(cfg => cfg.id !== id));
    setResults(prev => prev.filter(res => res.configId !== id));
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const reorderConfigs = useCallback((fromIndex: number, toIndex: number) => {
    setConfigs(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  const toggleCard = useCallback((id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const setChartType = useCallback((configId: string, type: ChartType) => {
    setChartTypes(prev => {
      const next = new Map(prev);
      next.set(configId, type);
      return next;
    });
  }, []);

  const executeQueries = useCallback(async () => {
    if (configs.length === 0) return;
    
    setIsLoading(true);
    setResults([]);
    
    const loadingResults: ApiResult[] = configs.map(cfg => ({
      configId: cfg.id,
      status: 'loading'
    }));
    setResults(loadingResults);
    
    await executeApiRequests(configs, (partialResult) => {
      setResults(prev => prev.map(r => 
        r.configId === partialResult.configId ? partialResult : r
      ));
    });
    
    setIsLoading(false);
  }, [configs]);

  const clearResult = useCallback((configId: string) => {
    setResults(prev => prev.filter(r => r.configId !== configId));
  }, []);

  const exportConfig = useCallback(() => {
    const exportData = configs.map(cfg => ({
      name: cfg.name,
      url: cfg.url,
      method: cfg.method,
      params: cfg.params,
      headers: cfg.headers.map(h => ({ key: h.key, value: '' }))
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [configs]);

  const importConfig = useCallback(async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          if (!Array.isArray(imported)) {
            reject(new Error('配置文件格式错误，应为数组'));
            return;
          }
          
          const newConfigs: ApiConfig[] = imported.map((item: Partial<ApiConfig>) => ({
            id: uuidv4(),
            name: item.name || '未命名API',
            url: item.url || '',
            method: (item.method as HttpMethod) || 'GET',
            headers: Array.isArray(item.headers) ? item.headers.map(h => ({ key: h?.key || '', value: '' })) : [],
            params: Array.isArray(item.params) ? item.params.map(p => ({ key: p?.key || '', value: p?.value || '' })) : []
          }));
          
          setConfigs(newConfigs);
          setResults([]);
          setExpandedCards(new Set());
          resolve();
        } catch (error) {
          reject(new Error('JSON文件解析失败'));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }, []);

  const state: AppState = useMemo(() => ({
    configs,
    results,
    isLoading,
    expandedCards,
    chartTypes
  }), [configs, results, isLoading, expandedCards, chartTypes]);

  const value: AppContextType = useMemo(() => ({
    state,
    addConfig,
    updateConfig,
    removeConfig,
    reorderConfigs,
    toggleCard,
    setChartType,
    executeQueries,
    clearResult,
    exportConfig,
    importConfig
  }), [state, addConfig, updateConfig, removeConfig, reorderConfigs, toggleCard, setChartType, executeQueries, clearResult, exportConfig, importConfig]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
