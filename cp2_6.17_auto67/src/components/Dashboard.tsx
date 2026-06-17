import { useAppContext, type ApiResult } from '../context/AppContext';
import ResultTable from './ResultTable';
import ResultChart from './ResultChart';

function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="清除结果"
      style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        border: 'none',
        background: '#ff4d4d',
        color: '#fff',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 1px 4px rgba(255,77,77,0.3)',
        lineHeight: 1,
        padding: 0,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget;
        el.style.transform = 'scale(1.1)';
        el.style.boxShadow = '0 2px 8px rgba(255,77,77,0.5)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '0 1px 4px rgba(255,77,77,0.3)';
      }}
    >
      ✕
    </button>
  );
}

function LoadingOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(26, 26, 46, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 48,
            height: 48,
            border: '3px solid rgba(0,173,181,0.2)',
            borderTopColor: '#00adb5',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ color: '#eee', fontSize: 15, fontWeight: 500 }}>正在查询中…</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 6 }}>
          所有API请求并行处理
        </div>
      </div>
    </div>
  );
}

function ResultColumn({
  result,
  configName,
  onRemove,
  onChartTypeChange,
  animIndex,
}: {
  result: ApiResult;
  configName: string;
  onRemove: () => void;
  onChartTypeChange: (type: 'bar' | 'line' | 'pie') => void;
  animIndex: number;
}) {
  if (result.status === 'loading') {
    return (
      <div
        className="slide-in"
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          animationDelay: `${animIndex * 0.1}s`,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '3px solid rgba(0,173,181,0.2)',
            borderTopColor: '#00adb5',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }}
        />
        <div style={{ color: '#666', fontSize: 13 }}>加载中…</div>
      </div>
    );
  }

  if (result.status === 'error') {
    return (
      <div
        className="slide-in"
        style={{
          background: '#ffe0e0',
          borderRadius: 8,
          padding: 24,
          textAlign: 'center',
          color: '#c0392b',
          position: 'relative',
          animationDelay: `${animIndex * 0.1}s`,
        }}
      >
        <ClearButton onClick={onRemove} />
        <div style={{ fontSize: 20, marginBottom: 8 }}>⚠</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>请求失败</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{result.error}</div>
      </div>
    );
  }

  return (
    <div
      className="slide-in"
      style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        animationDelay: `${animIndex * 0.1}s`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>{configName}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
            {result.data ? `${result.data.length} 条记录` : ''}
          </div>
        </div>
        <ClearButton onClick={onRemove} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          minHeight: 280,
        }}
      >
        <div
          style={{
            padding: 12,
            borderRight: '1px solid #f0f0f0',
            overflow: 'auto',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>
            数据表格
          </div>
          {result.data && <ResultTable data={result.data} />}
        </div>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>
            数据图表
          </div>
          <div style={{ flex: 1, minHeight: 240 }}>
            {result.data && (
              <ResultChart
                data={result.data}
                chartType={result.chartType}
                onChartTypeChange={onChartTypeChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { configs, results, isQuerying, removeResult, updateResult } = useAppContext();

  return (
    <div
      style={{
        flex: 1,
        padding: 24,
        overflow: 'auto',
        height: '100vh',
        background: '#f5f7fa',
      }}
    >
      {isQuerying && <LoadingOverlay />}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#222', margin: 0 }}>
          跨域数据集成仪表盘
        </h1>
        {results.length > 0 && (
          <span style={{ fontSize: 12, color: '#999' }}>
            {results.filter(r => r.status === 'success').length} / {results.length} 查询成功
          </span>
        )}
      </div>

      {results.length === 0 && !isQuerying ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            color: '#bbb',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>暂无查询结果</div>
          <div style={{ fontSize: 13, marginTop: 6, color: '#ccc' }}>
            在左侧配置面板添加API并点击批量查询
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {configs.map((config, index) => {
            const result = results.find(r => r.configId === config.id);
            if (!result) return null;
            return (
              <ResultColumn
                key={config.id}
                result={result}
                configName={config.name}
                animIndex={index}
                onRemove={() => removeResult(config.id)}
                onChartTypeChange={(type: 'bar' | 'line' | 'pie') =>
                  updateResult(config.id, { chartType: type })
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
