import { useState, useCallback, useRef } from 'react';
import type { SampleConfig } from './types';
import { createDefaultSample, generateId } from './types';
import EditorPanel from './components/EditorPanel';
import PreviewCard from './components/PreviewCard';
import ExportButton from './components/ExportButton';

const INITIAL_SAMPLES: SampleConfig[] = [
  createDefaultSample(generateId()),
  { ...createDefaultSample(generateId()), fontFamily: 'Open Sans', fontSize: 18, fontWeight: 300, color: '#1a1a2e' },
  { ...createDefaultSample(generateId()), fontFamily: 'Playfair Display', fontSize: 20, fontWeight: 700, color: '#2d3436' },
];

export default function App() {
  const [samples, setSamples] = useState<SampleConfig[]>(INITIAL_SAMPLES);
  const [unifiedMode, setUnifiedMode] = useState(false);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [enterDelays, setEnterDelays] = useState<Map<string, number>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSampleChange = useCallback((updatedSample: SampleConfig) => {
    setSamples(prev => {
      if (unifiedMode) {
        const { text, id } = prev.find(s => s.id === updatedSample.id) || { text: '', id: '' };
        return prev.map(s =>
          s.id === updatedSample.id
            ? updatedSample
            : { ...s, fontFamily: updatedSample.fontFamily, fontSize: updatedSample.fontSize, lineHeight: updatedSample.lineHeight, fontWeight: updatedSample.fontWeight, color: updatedSample.color }
        );
      }
      return prev.map(s => s.id === updatedSample.id ? updatedSample : s);
    });
  }, [unifiedMode]);

  const handleAddSample = useCallback(() => {
    const newSample = createDefaultSample(generateId());
    setSamples(prev => [...prev, newSample]);
  }, []);

  const handleDeleteSample = useCallback((id: string) => {
    setExitingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setSamples(prev => prev.filter(s => s.id !== id));
      setExitingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  }, []);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          const newDelays = new Map<string, number>();
          const imported: SampleConfig[] = data.map((item, idx) => {
            const id = generateId();
            newDelays.set(id, idx * 150);
            return {
              id,
              text: String(item.text || ''),
              fontFamily: String(item.fontFamily || 'Roboto'),
              fontSize: Number(item.fontSize) || 16,
              lineHeight: Number(item.lineHeight) || 1.6,
              fontWeight: Number(item.fontWeight) || 400,
              color: String(item.color || '#333333'),
            };
          });
          setEnterDelays(newDelays);
          setSamples(imported);
          setTimeout(() => setEnterDelays(new Map()), imported.length * 150 + 300);
        }
      } catch {
        // ignore invalid JSON
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        borderBottom: '1px solid #e8e8e8',
        background: '#fff',
        flexWrap: 'wrap',
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1a73e8', margin: 0, marginRight: 8, letterSpacing: -0.5 }}>
          字体排版预览
        </h1>

        <button
          onClick={() => setUnifiedMode(v => !v)}
          style={{
            padding: '8px 16px',
            background: unifiedMode ? '#1a73e8' : '#e8e8e8',
            color: unifiedMode ? '#fff' : '#555',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'background 0.3s, color 0.3s',
          }}
        >
          {unifiedMode ? '统一编辑：开' : '统一编辑：关'}
        </button>

        <button
          onClick={handleAddSample}
          style={toolbarBtnStyle}
          onMouseEnter={e => { e.currentTarget.style.background = '#1557b0'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1a73e8'; }}
        >
          + 添加样本
        </button>

        <ExportButton samples={samples} />

        <button
          onClick={handleImport}
          style={{
            padding: '8px 16px',
            background: '#fff',
            color: '#1a73e8',
            border: '1px solid #1a73e8',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#eef4fd'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
        >
          导入配置
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      <div style={{
        display: 'flex',
        flex: 1,
        flexDirection: 'row',
        overflow: 'hidden',
      }}
        className="main-layout"
      >
        <div style={{
          width: '33.333%',
          background: '#f5f5f5',
          padding: 16,
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 53px)',
        }}
          className="editor-area"
        >
          {samples.map(sample => (
            <EditorPanel
              key={sample.id}
              sample={sample}
              onChange={handleSampleChange}
              onDelete={() => handleDeleteSample(sample.id)}
            />
          ))}
        </div>

        <div style={{
          width: '66.666%',
          background: '#fff',
          padding: 20,
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 53px)',
        }}
          className="preview-area"
        >
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
          }}>
            {samples.map((sample, idx) => (
              <div
                key={sample.id}
                style={{
                  borderRight: idx < samples.length - 1 ? '2px dashed #e0e0e0' : 'none',
                  paddingRight: idx < samples.length - 1 ? 24 : 0,
                }}
              >
                <PreviewCard
                  sample={sample}
                  index={idx}
                  isExiting={exitingIds.has(sample.id)}
                  enterDelay={enterDelays.get(sample.id) || 0}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const toolbarBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#1a73e8',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  transition: 'background 0.2s',
};
