import { useCallback } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { fetchAllApis } from './services/apiService';
import type { ApiResult } from './context/AppContext';
import ConfigPanel from './components/ConfigPanel';
import Dashboard from './components/Dashboard';

function AppContent() {
  const { configs, setQuerying, setResults, updateResult } = useAppContext();

  const handleBatchQuery = useCallback(async () => {
    const validConfigs = configs.filter(c => c.url.trim());
    if (validConfigs.length === 0) return;

    setQuerying(true);

    const initialResults: ApiResult[] = validConfigs.map(c => ({
      configId: c.id,
      status: 'loading' as const,
      data: null,
      error: null,
      chartType: 'bar' as const,
    }));
    setResults(initialResults);

    const onResult = (configId: string, partial: Partial<ApiResult>) => {
      updateResult(configId, partial);
    };

    await fetchAllApis(validConfigs, onResult);
    setQuerying(false);
  }, [configs, setQuerying, setResults, updateResult]);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #f5f7fa 100%)',
      }}
    >
      <div style={{ display: 'flex', width: '100%', position: 'relative' }}>
        <ConfigPanel />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '16px 24px 0',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={handleBatchQuery}
              disabled={configs.filter(c => c.url.trim()).length === 0}
              style={{
                width: 180,
                height: 48,
                border: 'none',
                borderRadius: 24,
                background:
                  configs.filter(c => c.url.trim()).length === 0
                    ? '#ccc'
                    : 'linear-gradient(135deg, #00adb5, #0a9396)',
                color: '#fff',
                fontSize: 16,
                fontWeight: 600,
                cursor:
                  configs.filter(c => c.url.trim()).length === 0
                    ? 'not-allowed'
                    : 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 2px 12px rgba(0,173,181,0.3)',
                letterSpacing: 1,
              }}
              onMouseDown={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
                (e.currentTarget as HTMLElement).style.boxShadow =
                  '0 1px 6px rgba(0,173,181,0.4)';
              }}
              onMouseUp={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow =
                  '0 2px 12px rgba(0,173,181,0.3)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow =
                  '0 2px 12px rgba(0,173,181,0.3)';
              }}
            >
              批量查询
            </button>
          </div>

          <Dashboard />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
