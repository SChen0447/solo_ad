import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import type { TestResult } from '../App';

interface DiffPanelProps {
  testResults: TestResult[];
}

interface DiffData {
  heatmapImage: string;
  diffPercent: number;
}

const DiffPanel: React.FC<DiffPanelProps> = ({ testResults }) => {
  const [selected, setSelected] = useState<number[]>([]);
  const [threshold, setThreshold] = useState(10);
  const [diffData, setDiffData] = useState<DiffData | null>(null);
  const [computing, setComputing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const toggleSelect = useCallback((index: number) => {
    setSelected((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      if (prev.length >= 2) return [prev[1], index];
      return [...prev, index];
    });
  }, []);

  useEffect(() => {
    setDiffData(null);
  }, [selected, threshold]);

  const computeDiff = useCallback(async () => {
    if (selected.length !== 2) return;
    setComputing(true);
    try {
      const res = await axios.post('/api/diff', {
        imageA: testResults[selected[0]].thumbnail,
        imageB: testResults[selected[1]].thumbnail,
        threshold: threshold / 100,
      });
      setDiffData(res.data);
    } catch {
      console.error('Diff computation failed');
    } finally {
      setComputing(false);
    }
  }, [selected, testResults, threshold]);

  const downloadReport = useCallback(async () => {
    try {
      const res = await axios.post('/api/report', {
        results: testResults,
        diff: diffData,
      }, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'component-test-report.html';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.error('Report generation failed');
    }
  }, [testResults, diffData]);

  const selectedResults = selected.map((i) => testResults[i]);

  return (
    <div ref={panelRef} style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#cdd6f4', margin: 0 }}>差异对比</h3>

      {testResults.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#6c7086', padding: '40px 0', fontSize: 13 }}>
          请先运行测试生成快照
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: '#a6adc8', marginBottom: 4 }}>选择两张缩略图对比（点击选择，最多2张）</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto' }}>
            {testResults.map((r, i) => (
              <div
                key={r.state}
                onClick={() => toggleSelect(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: selected.includes(i) ? 'rgba(137,180,250,0.2)' : 'transparent',
                  border: selected.includes(i) ? '1px solid #89b4fa' : '1px solid transparent',
                  transition: 'background 0.2s, border 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(i)}
                  onChange={() => toggleSelect(i)}
                  style={{ accentColor: '#89b4fa' }}
                />
                <img src={r.thumbnail} alt={r.state} style={{ width: 40, height: 30, objectFit: 'cover', borderRadius: 3 }} />
                <span style={{ fontSize: 12, color: '#cdd6f4' }}>{r.state}</span>
              </div>
            ))}
          </div>

          {selectedResults.length === 2 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6c7086', marginBottom: 4 }}>左图</div>
                  <img src={selectedResults[0].thumbnail} alt="A" style={{ width: '100%', borderRadius: 4 }} />
                </div>
                <div style={{ width: 1, background: 'rgba(205,214,244,0.3)' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6c7086', marginBottom: 4 }}>右图</div>
                  <img src={selectedResults[1].thumbnail} alt="B" style={{ width: '100%', borderRadius: 4 }} />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#a6adc8' }}>差异阈值</span>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#89b4fa' }}
                  />
                  <span style={{ fontSize: 12, color: '#cdd6f4', width: 32, textAlign: 'right' }}>{threshold}%</span>
                </div>

                <button
                  onClick={computeDiff}
                  disabled={computing}
                  style={{
                    width: '100%',
                    padding: '8px 0',
                    borderRadius: 8,
                    border: 'none',
                    background: computing ? '#45475a' : '#89b4fa',
                    color: computing ? '#6c7086' : '#1e1e2e',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: computing ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  {computing ? '计算中...' : '计算差异'}
                </button>
              </div>

              {diffData && (
                <div style={{ marginTop: 12, position: 'relative' }}>
                  <div style={{ fontSize: 12, color: '#a6adc8', marginBottom: 6 }}>像素差异热力图</div>
                  <img
                    src={diffData.heatmapImage}
                    alt="heatmap"
                    style={{ width: '100%', borderRadius: 4, display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: 20,
                    right: 4,
                    background: 'rgba(30,30,46,0.85)',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                    color: diffData.diffPercent > 20 ? '#f38ba8' : diffData.diffPercent > 5 ? '#f9e2af' : '#a6e3a1',
                    fontWeight: 600,
                  }}>
                    {diffData.diffPercent.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={downloadReport}
            disabled={testResults.length === 0}
            style={{
              marginTop: 'auto',
              width: '100%',
              padding: '8px 0',
              borderRadius: 8,
              border: 'none',
              background: testResults.length === 0 ? '#45475a' : '#a6e3a1',
              color: testResults.length === 0 ? '#6c7086' : '#1e1e2e',
              fontSize: 13,
              fontWeight: 600,
              cursor: testResults.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            生成报告
          </button>
        </>
      )}
    </div>
  );
};

export default DiffPanel;
