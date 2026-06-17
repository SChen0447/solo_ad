import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import ImageUploader from './components/ImageUploader';
import ImagePreview from './components/ImagePreview';
import FilterPanel from './components/FilterPanel';
import type { FilterParams } from './components/ImagePreview';

const DEFAULT_FILTER: FilterParams = {
  type: 'pixelate',
  pixelSize: 8,
  oilBrushSize: 10,
  oilDetail: 3,
  watercolorSpread: 6,
  watercolorEdgeBlur: 2,
  sketchLineWidth: 3,
  sketchShadow: 1.2,
};

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const CompareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const LogoIcon = () => (
  <svg viewBox="0 0 28 28" fill="none">
    <rect x="2" y="2" width="10" height="10" rx="2" fill="#e94560" />
    <rect x="16" y="2" width="10" height="10" rx="2" fill="#e94560" opacity="0.6" />
    <rect x="2" y="16" width="10" height="10" rx="2" fill="#e94560" opacity="0.6" />
    <rect x="16" y="16" width="10" height="10" rx="2" fill="#e94560" opacity="0.3" />
  </svg>
);

function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [filter, setFilter] = useState<FilterParams>(DEFAULT_FILTER);
  const [compareMode, setCompareMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const handleImageLoad = useCallback((img: HTMLImageElement, name: string) => {
    setImage(img);
    setFileName(name);
  }, []);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `pixelart_${fileName || 'image'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Image saved!');
  }, [fileName, showToast]);

  const handleShare = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const resp = await axios.post('/api/share', {
        image: dataUrl,
        filter: filter.type,
      });
      const shareUrl = resp.data.url;
      await navigator.clipboard.writeText(shareUrl);
      showToast('Share link copied to clipboard!');
    } catch {
      const canvas2 = canvasRef.current;
      if (!canvas2) return;
      const dataUrl = canvas2.toDataURL('image/png');
      await navigator.clipboard.writeText(dataUrl.substring(0, 200) + '...');
      showToast('Copied image data (share server unavailable)');
    }
  }, [filter, showToast]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <LogoIcon />
          PixelArt Filter Studio
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {image && (
            <div className="image-info">
              <span>{fileName}</span>
              <span className="dot" />
              <span>{image.naturalWidth}×{image.naturalHeight}</span>
            </div>
          )}
          <button className="help-btn" title="Help">?</button>
        </div>
      </header>

      <div className="app-body">
        <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <ImageUploader onImageLoad={handleImageLoad} hasImage={!!image} />
          <FilterPanel filter={filter} onFilterChange={setFilter} hasImage={!!image} />

          {image && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <div className="section-title">Actions</div>
              <button
                className={`toggle-btn${compareMode ? ' active' : ''}`}
                onClick={() => setCompareMode(!compareMode)}
                style={{ width: '100%' }}
              >
                <CompareIcon />
                {compareMode ? 'Single View' : 'Compare Mode'}
              </button>
              <div className="btn-group">
                <button className="btn btn-primary" onClick={handleSave}>
                  <SaveIcon /> Save
                </button>
                <button className="btn btn-secondary" onClick={handleShare}>
                  <ShareIcon /> Share
                </button>
              </div>
            </div>
          )}
        </aside>

        <main className="preview-area">
          <ImagePreview
            image={image}
            filter={filter}
            compareMode={compareMode}
            onCanvasReady={handleCanvasReady}
          />
        </main>
      </div>

      <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <MenuIcon />
      </button>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}

export default App;
