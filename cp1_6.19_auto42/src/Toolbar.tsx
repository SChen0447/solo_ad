import { useCanvasStore } from './store';
import type { ToolType } from './types';

const tools: { key: ToolType; label: string; icon: string }[] = [
  { key: 'brush', label: '画笔', icon: '✏️' },
  { key: 'sticky', label: '便签', icon: '📝' },
  { key: 'image', label: '图片', icon: '🖼️' },
  { key: 'pan', label: '移动', icon: '✋' },
];

const colors = ['#333333', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#007bff'];

export function Toolbar() {
  const {
    currentTool,
    setCurrentTool,
    brushColor,
    setBrushColor,
    brushThickness,
    setBrushThickness,
  } = useCanvasStore();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const maxSize = 200;
        if (w > maxSize || h > maxSize) {
          const ratio = Math.min(maxSize / w, maxSize / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const { viewport } = useCanvasStore.getState();
        const x = (-viewport.offsetX + window.innerWidth / 2) / viewport.scale - w / 2;
        const y = (-viewport.offsetY + window.innerHeight / 2) / viewport.scale - h / 2;
        import('./websocket').then(({ wsManager }) => {
          wsManager.sendAddImage({ x, y, width: w, height: h, dataUrl });
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="toolbar">
      {tools.map((t) => {
        if (t.key === 'image') {
          return (
            <label key={t.key} className={`tool-btn ${currentTool === t.key ? 'active' : ''}`} title={t.label}>
              <span className="tool-icon">{t.icon}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
            </label>
          );
        }
        return (
          <button
            key={t.key}
            className={`tool-btn ${currentTool === t.key ? 'active' : ''}`}
            title={t.label}
            onClick={() => setCurrentTool(t.key)}
          >
            <span className="tool-icon">{t.icon}</span>
          </button>
        );
      })}

      {currentTool === 'brush' && (
        <div className="tool-options">
          <div className="color-palette">
            {colors.map((c) => (
              <button
                key={c}
                className={`color-swatch ${brushColor === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setBrushColor(c)}
              />
            ))}
          </div>
          <div className="thickness-slider">
            <input
              type="range"
              min="2"
              max="10"
              step="1"
              value={brushThickness}
              onChange={(e) => setBrushThickness(Number(e.target.value))}
            />
            <span className="thickness-label">{brushThickness}px</span>
          </div>
        </div>
      )}
    </div>
  );
}
