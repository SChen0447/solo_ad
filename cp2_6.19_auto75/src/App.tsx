import { useState, useCallback, useRef } from 'react';
import { TypographySample, createDefaultSample } from '@/types';
import EditorPanel from '@/components/EditorPanel';
import PreviewCard from '@/components/PreviewCard';
import ExportButton from '@/components/ExportButton';
import ImportButton from '@/components/ImportButton';

export default function App() {
  const [samples, setSamples] = useState<TypographySample[]>(() => [
    createDefaultSample(),
    createDefaultSample({
      fontFamily: 'Playfair Display',
      fontSize: 24,
      lineHeight: 1.6,
      fontWeight: 700,
      color: '#1a1a1a',
      text: 'The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.',
    }),
    createDefaultSample({
      fontFamily: 'Source Code Pro',
      fontSize: 14,
      lineHeight: 1.4,
      fontWeight: 300,
      color: '#555555',
      text: 'Good typography is invisible. Bad typography is everywhere. Choose wisely and let the words speak.',
    }),
  ]);

  const [unifiedMode, setUnifiedMode] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [importTrigger, setImportTrigger] = useState(0);
  const importTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const updateSample = useCallback(
    (id: string, updated: TypographySample) => {
      setSamples((prev) => {
        if (!unifiedMode) {
          return prev.map((s) => (s.id === id ? updated : s));
        }

        return prev.map((s) =>
          s.id === id
            ? updated
            : {
                ...s,
                fontFamily: updated.fontFamily,
                fontSize: updated.fontSize,
                lineHeight: updated.lineHeight,
                fontWeight: updated.fontWeight,
                color: updated.color,
              }
        );
      });
    },
    [unifiedMode]
  );

  const addSample = useCallback(() => {
    setSamples((prev) => [...prev, createDefaultSample()]);
  }, []);

  const removeSample = useCallback(
    (id: string) => {
      if (removingIds.has(id)) return;
      setRemovingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setSamples((prev) => prev.filter((s) => s.id !== id));
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 300);
    },
    [removingIds]
  );

  const importSamples = useCallback((newSamples: TypographySample[]) => {
    importTimersRef.current.forEach((t) => clearTimeout(t));
    importTimersRef.current = [];

    setSamples([]);
    setImportTrigger((t) => t + 1);

    newSamples.forEach((s, i) => {
      const timer = setTimeout(() => {
        setSamples((prev) => [...prev, s]);
      }, i * 150);
      importTimersRef.current.push(timer);
    });
  }, []);

  const handleEditorChange = useCallback(
    (updatedSample: TypographySample) => {
      updateSample(updatedSample.id, updatedSample);
    },
    [updateSample]
  );

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnifiedMode(!unifiedMode)}
            className={`unified-toggle ${unifiedMode ? 'unified-toggle-active' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            <span>Unified Edit</span>
          </button>

          <button onClick={addSample} className="toolbar-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Sample</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <ImportButton onImport={importSamples} />
          <ExportButton samples={samples} />
        </div>
      </div>

      <div className="app-body">
        <div className="editor-area">
          <div className="editor-scroll">
            {samples.map((sample, index) => (
              <div
                key={sample.id}
                className={`${index < samples.length - 1 ? 'editor-panel-wrapper' : ''} ${removingIds.has(sample.id) ? 'removing' : ''}`}
              >
                <EditorPanel
                  sample={sample}
                  index={index}
                  onChange={handleEditorChange}
                  onRemove={removeSample}
                  canDelete={samples.length > 1}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="preview-area">
          <div className="preview-scroll">
            {samples.map((sample, index) => (
              <div
                key={`${sample.id}-${importTrigger}`}
                data-sample-id={sample.id}
                className={`preview-card-wrapper ${removingIds.has(sample.id) ? 'removing' : ''}`}
              >
                <PreviewCard
                  sample={sample}
                  index={index}
                  staggerDelay={importTrigger > 0 ? index * 150 : 0}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
