import { useState, useCallback } from 'react';
import { useTypographyStore } from '@/store/typographyStore';
import Toolbar from '@/components/Toolbar';
import EditorPanel from '@/components/EditorPanel';
import PreviewCard from '@/components/PreviewCard';

export default function App() {
  const samples = useTypographyStore((s) => s.samples);
  const removeSample = useTypographyStore((s) => s.removeSample);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const handleRemove = useCallback(
    (id: string) => {
      setRemovingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        removeSample(id);
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 300);
    },
    [removeSample]
  );

  return (
    <div className="app-container">
      <Toolbar />
      <div className="app-body">
        <div className="editor-area">
          <div className="editor-scroll">
            {samples.map((sample, index) => (
              <div
                key={sample.id}
                className={index < samples.length - 1 ? 'editor-panel-wrapper' : ''}
              >
                <EditorPanel
                  sample={sample}
                  index={index}
                  onRemove={handleRemove}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="preview-area">
          <div className="preview-scroll">
            {samples.map((sample, index) => (
              <div
                key={sample.id}
                data-sample-id={sample.id}
                className={`preview-card-wrapper ${removingIds.has(sample.id) ? 'removing' : ''}`}
              >
                <PreviewCard
                  sample={sample}
                  index={index}
                  staggerDelay={0}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
