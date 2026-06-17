import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface ApiConfig {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  params: Record<string, string>;
  collapsed: boolean;
}

export interface ApiResult {
  configId: string;
  status: 'loading' | 'success' | 'error';
  data: Record<string, unknown>[] | null;
  error: string | null;
  chartType: 'bar' | 'line' | 'pie';
}

interface AppContextType {
  configs: ApiConfig[];
  results: ApiResult[];
  isQuerying: boolean;
  addConfig: () => void;
  updateConfig: (id: string, updates: Partial<ApiConfig>) => void;
  removeConfig: (id: string) => void;
  reorderConfigs: (fromIndex: number, toIndex: number) => void;
  toggleCollapse: (id: string) => void;
  setQuerying: (val: boolean) => void;
  setResults: (results: ApiResult[]) => void;
  updateResult: (configId: string, updates: Partial<ApiResult>) => void;
  removeResult: (configId: string) => void;
  clearAllResults: () => void;
  exportConfig: () => void;
  importConfig: (file: File) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [results, setResultsState] = useState<ApiResult[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const addConfig = useCallback(() => {
    const newConfig: ApiConfig = {
      id: uuidv4(),
      name: `API ${configs.length + 1}`,
      url: '',
      method: 'GET',
      headers: {},
      params: {},
      collapsed: true,
    };
    setConfigs(prev => [...prev, newConfig]);
  }, [configs.length]);

  const updateConfig = useCallback((id: string, updates: Partial<ApiConfig>) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const removeConfig = useCallback((id: string) => {
    setConfigs(prev => prev.filter(c => c.id !== id));
    setResultsState(prev => prev.filter(r => r.configId !== id));
  }, []);

  const reorderConfigs = useCallback((fromIndex: number, toIndex: number) => {
    setConfigs(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setConfigs(prev => prev.map(c =>
      c.id === id ? { ...c, collapsed: !c.collapsed } : c
    ));
  }, []);

  const setQuerying = useCallback((val: boolean) => {
    setIsQuerying(val);
  }, []);

  const setResults = useCallback((results: ApiResult[]) => {
    setResultsState(results);
  }, []);

  const updateResult = useCallback((configId: string, updates: Partial<ApiResult>) => {
    setResultsState(prev => prev.map(r =>
      r.configId === configId ? { ...r, ...updates } : r
    ));
  }, []);

  const removeResult = useCallback((configId: string) => {
    setResultsState(prev => prev.filter(r => r.configId !== configId));
  }, []);

  const clearAllResults = useCallback(() => {
    setResultsState([]);
  }, []);

  const exportConfig = useCallback(() => {
    const exportData = configs.map(({ headers, ...rest }) => {
      const safeHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(headers)) {
        if (k.toLowerCase() !== 'apikey' && k.toLowerCase() !== 'api_key' && k.toLowerCase() !== 'x-api-key') {
          safeHeaders[k] = v;
        }
      }
      return { ...rest, headers: safeHeaders };
    });
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [configs]);

  const importConfig = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (Array.isArray(data)) {
          const imported: ApiConfig[] = data.map((item: Record<string, unknown>) => ({
            id: (item.id as string) || uuidv4(),
            name: (item.name as string) || 'Imported API',
            url: (item.url as string) || '',
            method: (item.method as 'GET' | 'POST') || 'GET',
            headers: (item.headers as Record<string, string>) || {},
            params: (item.params as Record<string, string>) || {},
            collapsed: true,
          }));
          setConfigs(imported);
          setResultsState([]);
        }
      } catch {
        alert('Invalid JSON configuration file');
      }
    };
    reader.readAsText(file);
  }, []);

  return (
    <AppContext.Provider value={{
      configs,
      results,
      isQuerying,
      addConfig,
      updateConfig,
      removeConfig,
      reorderConfigs,
      toggleCollapse,
      setQuerying,
      setResults,
      updateResult,
      removeResult,
      clearAllResults,
      exportConfig,
      importConfig,
    }}>
      {children}
      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importConfig(file);
          e.target.value = '';
        }}
      />
    </AppContext.Provider>
  );
}
