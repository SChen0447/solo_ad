import React from 'react';
import { useAppContext } from '../context/AppContext';
import { ChartType } from '../types';
import ResultTable from './ResultTable';
import ResultChart from './ResultChart';

const Dashboard: React.FC = () => {
  const {
    state,
    clearResult,
    setChartType
  } = useAppContext();

  const { configs, results, isLoading } = state;

  const getConfigById = (id: string) => configs.find(c => c.id === id);

  const getChartType = (configId: string): ChartType => {
    return state.chartTypes.get(configId) || 'bar';
  };

  const getStatusInfo = (status: 'success' | 'error' | 'loading') => {
    switch (status) {
      case 'success':
        return { text: '成功', dotClass: 'success' };
      case 'error':
        return { text: '失败', dotClass: 'error' };
      case 'loading':
        return { text: '查询中', dotClass: 'loading' };
    }
  };

  const sortedResults = configs
    .map(config => results.find(r => r.configId === config.id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined);

  const hasResults = sortedResults.length > 0;
  const successCount = sortedResults.filter(r => r.status === 'success').length;
  const errorCount = sortedResults.filter(r => r.status === 'error').length;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <div className="dashboard-title">数据仪表盘</div>
          {hasResults && (
            <div className="query-status" style={{ marginTop: '8px' }}>
              <span>共 {sortedResults.length} 个请求</span>
              {successCount > 0 && (
                <>
                  <span className="status-dot success" />
                  <span>成功 {successCount}</span>
                </>
              )}
              {errorCount > 0 && (
                <>
                  <span className="status-dot error" />
                  <span>失败 {errorCount}</span>
                </>
              )}
              {isLoading && (
                <>
                  <span className="status-dot loading" />
                  <span>查询中...</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {!hasResults ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-text">
            配置API并点击"批量查询"按钮开始获取数据
          </div>
        </div>
      ) : (
        <div className="results-grid">
          {sortedResults.map((result, index) => {
            const config = getConfigById(result.configId);
            if (!config) return null;

            const statusInfo = getStatusInfo(result.status);
            const animationDelay = `${index * 0.1}s`;

            return (
              <div
                key={result.configId}
                className="result-column"
                style={{ animationDelay }}
              >
                <div className="result-column-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="result-column-title">{config.name}</div>
                    <div className="query-status">
                      <span className={`status-dot ${statusInfo.dotClass}`} />
                      <span>{statusInfo.text}</span>
                    </div>
                  </div>
                  <button
                    className="clear-btn"
                    onClick={() => clearResult(result.configId)}
                    title="清除此列"
                  >
                    ✕
                  </button>
                </div>

                {result.status === 'loading' ? (
                  <div className="result-content">
                    <div style={{
                      gridColumn: '1 / -1',
                      background: 'white',
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-md)',
                      padding: '40px',
                      textAlign: 'center',
                      color: '#888',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '16px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid #f0f0f0',
                        borderTopColor: 'var(--primary-color)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      <div>正在请求数据...</div>
                    </div>
                  </div>
                ) : result.status === 'error' ? (
                  <div className="result-content">
                    <div className="error-card">
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>请求失败</div>
                      <div style={{ fontSize: '13px', color: '#c62828' }}>
                        {result.error}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="result-content">
                    <ResultTable data={result.data || []} />
                    <ResultChart
                      data={result.chartData || []}
                      title={config.name}
                      chartType={getChartType(result.configId)}
                      onTypeChange={(type) => setChartType(result.configId, type)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
