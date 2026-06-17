import React, { useState, useCallback } from 'react';
import type { ComponentInfo, TestResult } from '../App';

const PRESET_STATES = [
  { key: 'loading', label: 'Loading', color: '#a6e3a1' },
  { key: 'empty', label: 'Empty', color: '#6c7086' },
  { key: 'error', label: 'Error', color: '#f38ba8' },
  { key: 'small', label: 'Small Screen', color: '#f9e2af' },
  { key: 'dark', label: 'Dark Theme', color: '#cba6f7' },
  { key: 'contrast', label: 'High Contrast', color: '#fab387' },
] as const;

interface TestConfigProps {
  component: ComponentInfo | null;
  testResults: TestResult[];
  onRunTest: (states: string[]) => void;
  running: boolean;
}

const TestConfig: React.FC<TestConfigProps> = ({ component, testResults, onRunTest, running }) => {
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());

  const toggleState = useCallback((key: string) => {
    setSelectedStates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleRun = () => {
    if (selectedStates.size === 0 || !component) return;
    onRunTest(Array.from(selectedStates));
  };

  if (!component) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6c7086', fontSize: 15 }}>
        请在左侧选择一个组件开始测试
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div
        style={{
          background: '#2d2d44',
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          animation: 'fadeIn 0.3s ease',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#cdd6f4', marginBottom: 12 }}>{component.name}</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: '#6c7086', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Props</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {component.props.length > 0 ? component.props.map((p) => (
                <span key={p} style={{ background: '#45475a', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: '#89b4fa' }}>{p}</span>
              )) : <span style={{ fontSize: 12, color: '#6c7086' }}>无</span>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6c7086', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Dependencies</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {component.dependencies.length > 0 ? component.dependencies.map((d) => (
                <span key={d} style={{ background: '#45475a', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: '#cba6f7' }}>{d}</span>
              )) : <span style={{ fontSize: 12, color: '#6c7086' }}>无</span>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6c7086', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Size</div>
            <span style={{ fontSize: 12, color: '#a6e3a1' }}>{component.size} B</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, color: '#a6adc8', marginBottom: 10 }}>选择测试状态</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESET_STATES.map(({ key, label, color }) => {
            const active = selectedStates.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleState(key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: active ? color : '#45475a',
                  color: active ? '#1e1e2e' : '#cdd6f4',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? '#1e1e2e' : color, flexShrink: 0 }} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleRun}
        disabled={running || selectedStates.size === 0}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 24px',
          borderRadius: 8,
          border: 'none',
          background: running ? '#45475a' : '#89b4fa',
          color: running ? '#6c7086' : '#1e1e2e',
          fontSize: 14,
          fontWeight: 600,
          cursor: running ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
          marginBottom: 24,
        }}
      >
        {running && (
          <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #6c7086', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        )}
        {running ? '测试中...' : '运行测试'}
      </button>

      {testResults.length > 0 && (
        <div>
          <h3 style={{ fontSize: 13, color: '#a6adc8', marginBottom: 12 }}>测试快照</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {testResults.map((r) => (
              <div
                key={r.state}
                style={{
                  background: '#2d2d44',
                  borderRadius: 8,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.3s ease',
                }}
              >
                <img
                  src={r.thumbnail}
                  alt={r.state}
                  style={{ width: 200, height: 150, objectFit: 'cover', display: 'block' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px' }}>
                  <span style={{ fontSize: 12, color: '#cdd6f4' }}>{r.state}</span>
                  <span style={{ fontSize: 11, color: '#6c7086' }}>{r.renderTime}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestConfig;
