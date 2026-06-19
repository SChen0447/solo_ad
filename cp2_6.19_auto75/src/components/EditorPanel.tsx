import { useCallback, useEffect, useRef } from 'react';
import debounce from 'lodash.debounce';
import { TypographySample, FONT_FAMILIES } from '@/types';

interface EditorPanelProps {
  sample: TypographySample;
  index: number;
  onChange: (sample: TypographySample) => void;
  onRemove: (id: string) => void;
  canDelete: boolean;
}

const FONT_WEIGHTS = Array.from({ length: 9 }, (_, i) => (i + 1) * 100);

export default function EditorPanel({ sample, index, onChange, onRemove, canDelete }: EditorPanelProps) {
  const debouncedChangeRef = useRef(
    debounce((updatedSample: TypographySample) => {
      onChange(updatedSample);
    }, 30)
  ).current;

  useEffect(() => {
    return () => {
      debouncedChangeRef.cancel();
    };
  }, [debouncedChangeRef]);

  const handleChange = useCallback(
    (updates: Partial<TypographySample>) => {
      const updatedSample = { ...sample, ...updates };
      debouncedChangeRef(updatedSample);
    },
    [debouncedChangeRef, sample]
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value.slice(0, 200);
      onChange({ ...sample, text: value });
    },
    [onChange, sample]
  );

  return (
    <div className="editor-panel-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Sample {index + 1}
        </span>
        {canDelete && (
          <button
            onClick={() => onRemove(sample.id)}
            className="delete-btn"
            aria-label="Delete sample"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="editor-label">Text Content</label>
          <textarea
            value={sample.text}
            onChange={handleTextChange}
            maxLength={200}
            rows={3}
            className="editor-textarea"
          />
          <div className="text-right text-[10px] text-gray-400 mt-0.5">
            {sample.text.length}/200
          </div>
        </div>

        <div>
          <label className="editor-label">Font Family</label>
          <select
            value={sample.fontFamily}
            onChange={(e) => handleChange({ fontFamily: e.target.value })}
            className="editor-select"
            style={{ fontFamily: sample.fontFamily }}
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center">
            <label className="editor-label">Font Size</label>
            <span className="editor-value">{sample.fontSize}px</span>
          </div>
          <input
            type="range"
            min={12}
            max={72}
            value={sample.fontSize}
            onChange={(e) => handleChange({ fontSize: Number(e.target.value) })}
            className="editor-slider"
          />
        </div>

        <div>
          <div className="flex justify-between items-center">
            <label className="editor-label">Line Height</label>
            <span className="editor-value">{sample.lineHeight.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={10}
            max={20}
            value={Math.round(sample.lineHeight * 10)}
            onChange={(e) =>
              handleChange({ lineHeight: Number(e.target.value) / 10 })
            }
            className="editor-slider"
          />
        </div>

        <div>
          <label className="editor-label">Font Weight</label>
          <div className="grid grid-cols-5 gap-1">
            {FONT_WEIGHTS.map((w) => (
              <button
                key={w}
                onClick={() => handleChange({ fontWeight: w })}
                className={`weight-btn ${sample.fontWeight === w ? 'weight-btn-active' : ''}`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="editor-label">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={sample.color}
              onChange={(e) => handleChange({ color: e.target.value })}
              className="editor-color"
            />
            <span className="text-xs text-gray-500 font-mono">{sample.color}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
