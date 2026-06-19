import { useState, useCallback, useMemo } from 'react';
import { Sample, TypographyConfig, DEFAULT_SAMPLES } from './types';
import EditorPanel from './EditorPanel';
import PreviewCard from './PreviewCard';
import ExportButton from './ExportButton';
import ImportButton from './ImportButton';
import './App.css';
import './buttons.css';

function App() {
  const [samples, setSamples] = useState<Sample[]>(DEFAULT_SAMPLES);
  const [unifiedMode, setUnifiedMode] = useState(false);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [importTrigger, setImportTrigger] = useState(0);

  const generateId = () => `sample-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const handleSampleChange = useCallback((id: string, newConfig: TypographyConfig) => {
    setSamples((prev) => {
      if (unifiedMode) {
        return prev.map((s) => ({
          ...s,
          config: {
            ...s.config,
            fontFamily: newConfig.fontFamily,
            fontSize: newConfig.fontSize,
            lineHeight: newConfig.lineHeight,
            fontWeight: newConfig.fontWeight,
            color: newConfig.color,
          },
        }));
      }
      return prev.map((s) => (s.id === id ? { ...s, config: newConfig } : s));
    });
  }, [unifiedMode]);

  const handleAddSample = useCallback(() => {
    const newSample: Sample = {
      id: generateId(),
      config: {
        text: '新的排版样本，您可以自定义文字内容和排版参数。',
        fontFamily: 'Roboto',
        fontSize: 16,
        lineHeight: 1.5,
        fontWeight: 400,
        color: '#333333',
      },
    };

    if (unifiedMode && samples.length > 0) {
      const ref = samples[0].config;
      newSample.config = {
        ...ref,
        text: '新的排版样本，您可以自定义文字内容和排版参数。',
      };
    }

    setSamples((prev) => [...prev, newSample]);
  }, [samples, unifiedMode]);

  const handleDeleteSample = useCallback((id: string) => {
    setExitingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setSamples((prev) => prev.filter((s) => s.id !== id));
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  }, []);

  const handleToggleUnified = useCallback(() => {
    setUnifiedMode((prev) => {
      const next = !prev;
      if (next && samples.length > 0) {
        const ref = samples[0].config;
        setSamples((prevSamples) =>
          prevSamples.map((s) => ({
            ...s,
            config: {
              ...s.config,
              fontFamily: ref.fontFamily,
              fontSize: ref.fontSize,
              lineHeight: ref.lineHeight,
              fontWeight: ref.fontWeight,
              color: ref.color,
            },
          }))
        );
      }
      return next;
    });
  }, [samples]);

  const handleImport = useCallback((importedSamples: Sample[]) => {
    setExitingIds(new Set());
    setSamples([]);
    setImportTrigger((prev) => prev + 1);

    setTimeout(() => {
      setSamples(importedSamples);
    }, 50);
  }, []);

  const toggleBtnClasses = useMemo(() => {
    return [
      'toolbar-btn',
      'toggle-btn',
      unifiedMode ? 'toggle-btn--active' : 'toggle-btn--inactive',
    ]
      .filter(Boolean)
      .join(' ');
  }, [unifiedMode]);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__toolbar">
          <div className="app__title">字体排版预览与对比</div>
          <button className={toggleBtnClasses} onClick={handleToggleUnified}>
            <span className="toggle-btn__switch">
              <span className="toggle-btn__knob" />
            </span>
            统一编辑
          </button>
          <div className="app__spacer" />
          <button className="toolbar-btn toolbar-btn--secondary" onClick={handleAddSample}>
            + 添加样本
          </button>
          <ImportButton onImport={handleImport} />
          <ExportButton samples={samples} />
        </div>
      </header>

      <div className="app__body">
        <aside className="app__editor-pane">
          {samples.map((sample) => (
            <EditorPanel
              key={sample.id}
              sampleId={sample.id}
              config={sample.config}
              onChange={(config) => handleSampleChange(sample.id, config)}
              onDelete={() => handleDeleteSample(sample.id)}
              showDelete={samples.length > 1}
            />
          ))}
        </aside>

        <main className="app__preview-pane">
          {samples.length === 0 ? (
            <div className="app__empty-preview">暂无样本，点击"添加样本"开始</div>
          ) : (
            <div className="app__preview-row" key={importTrigger}>
              {samples.map((sample, index) => (
                <div key={sample.id} style={{ display: 'flex' }}>
                  {index > 0 && <div className="app__sample-divider" />}
                  <PreviewCard
                    config={sample.config}
                    onDelete={() => handleDeleteSample(sample.id)}
                    showDelete={samples.length > 1}
                    isExiting={exitingIds.has(sample.id)}
                    animationDelay={index * 150}
                  />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
