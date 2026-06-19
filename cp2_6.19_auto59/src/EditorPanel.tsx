import { useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { TypographyConfig, FONT_OPTIONS, FONT_WEIGHTS } from './types';
import './EditorPanel.css';

interface EditorPanelProps {
  sampleId: string;
  config: TypographyConfig;
  onChange: (config: TypographyConfig) => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

function EditorPanel({ sampleId, config, onChange, onDelete, showDelete = true }: EditorPanelProps) {
  const debouncedChange = useMemo(
    () => debounce((newConfig: TypographyConfig) => {
      onChange(newConfig);
    }, 50),
    [onChange]
  );

  const handleChange = useCallback((key: keyof TypographyConfig, value: string | number) => {
    const newConfig = { ...config, [key]: value };
    debouncedChange(newConfig);
  }, [config, debouncedChange]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, 200);
    handleChange('text', value);
  }, [handleChange]);

  return (
    <div className="editor-panel" data-sample-id={sampleId}>
      <div className="editor-panel__header">
        <span className="editor-panel__title">排版参数</span>
        {showDelete && onDelete && (
          <button className="editor-panel__close" onClick={onDelete} title="删除样本">
            ×
          </button>
        )}
      </div>

      <div className="editor-panel__field">
        <label className="editor-panel__label">文字内容</label>
        <textarea
          className="editor-panel__text-input"
          value={config.text}
          onChange={handleTextChange}
          maxLength={200}
          placeholder="输入预览文字（最多200字）"
        />
        <div className="editor-panel__char-count">{config.text.length}/200</div>
      </div>

      <div className="editor-panel__field">
        <label className="editor-panel__label">字体</label>
        <select
          className="editor-panel__select"
          value={config.fontFamily}
          onChange={(e) => handleChange('fontFamily', e.target.value)}
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </select>
      </div>

      <div className="editor-panel__field">
        <label className="editor-panel__label">字号</label>
        <div className="editor-panel__slider-row">
          <input
            type="range"
            className="editor-panel__slider"
            min="12"
            max="72"
            step="1"
            value={config.fontSize}
            onChange={(e) => handleChange('fontSize', Number(e.target.value))}
          />
          <span className="editor-panel__value">{config.fontSize}px</span>
        </div>
      </div>

      <div className="editor-panel__field">
        <label className="editor-panel__label">行高</label>
        <div className="editor-panel__slider-row">
          <input
            type="range"
            className="editor-panel__slider"
            min="1.0"
            max="2.0"
            step="0.05"
            value={config.lineHeight}
            onChange={(e) => handleChange('lineHeight', Number(e.target.value))}
          />
          <span className="editor-panel__value">{config.lineHeight.toFixed(2)}</span>
        </div>
      </div>

      <div className="editor-panel__field">
        <label className="editor-panel__label">字重</label>
        <select
          className="editor-panel__select"
          value={config.fontWeight}
          onChange={(e) => handleChange('fontWeight', Number(e.target.value))}
        >
          {FONT_WEIGHTS.map((weight) => (
            <option key={weight} value={weight}>
              {weight}
            </option>
          ))}
        </select>
      </div>

      <div className="editor-panel__field">
        <label className="editor-panel__label">颜色</label>
        <input
          type="color"
          className="editor-panel__color-input"
          value={config.color}
          onChange={(e) => handleChange('color', e.target.value)}
        />
      </div>
    </div>
  );
}

export default EditorPanel;
