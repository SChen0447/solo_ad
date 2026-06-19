import React, { useRef } from 'react';
import type { DisplayMode, ProcessedImageData } from '../modules/imageProcessor/types';

interface ToolbarProps {
  onUpload: (file: File) => void;
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onExport: () => void;
  processedData: ProcessedImageData | null;
  processing: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onUpload,
  displayMode,
  onDisplayModeChange,
  onExport,
  processedData,
  processing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateThumbnail = (imageData: ImageData, size: number = 80): string => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    const aspect = imageData.width / imageData.height;
    let dw: number, dh: number, dx: number, dy: number;
    if (aspect >= 1) {
      dw = size;
      dh = size / aspect;
      dx = 0;
      dy = (size - dh) / 2;
    } else {
      dh = size;
      dw = size * aspect;
      dy = 0;
      dx = (size - dw) / 2;
    }
    
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = imageData.width;
    srcCanvas.height = imageData.height;
    srcCanvas.getContext('2d')!.putImageData(imageData, 0, 0);
    
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(srcCanvas, dx, dy, dw, dh);
    return canvas.toDataURL('image/png');
  };

  const modeLabels: Record<DisplayMode, string> = {
    original: '原图',
    lineart: '线框',
    filled: '填色'
  };

  const getThumbnailForMode = (mode: DisplayMode): string | null => {
    if (!processedData) return null;
    if (mode === 'original') return generateThumbnail(processedData.originalImageData);
    return generateThumbnail(processedData.lineArtImageData);
  };

  const filledThumbnail = processedData ? (() => {
    const canvas = document.createElement('canvas');
    const scale = 80 / Math.max(processedData.width, processedData.height);
    const w = Math.round(processedData.width * scale);
    const h = Math.round(processedData.height * scale);
    canvas.width = 80;
    canvas.height = 80;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, 80, 80);
    const lc = document.createElement('canvas');
    lc.width = processedData.width;
    lc.height = processedData.height;
    lc.getContext('2d')!.putImageData(processedData.lineArtImageData, 0, 0);
    ctx.drawImage(lc, (80 - w) / 2, (80 - h) / 2, w, h);
    return canvas.toDataURL('image/png');
  })() : null;

  return (
    <div style={styles.container}>
      <div style={styles.logo}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="2" width="28" height="28" rx="6" fill="#A7B7A0" opacity="0.2" />
          <circle cx="10" cy="12" r="3" fill="#D4A5A5" />
          <circle cx="18" cy="18" r="2.5" fill="#B7C8D4" />
          <circle cx="22" cy="11" r="2" fill="#E8D4B8" />
          <path d="M6 24 C10 20, 16 20, 26 24" stroke="#9CA38F" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
        <span style={styles.logoText}>数字油画</span>
      </div>

      <div style={styles.section}>
        <button
          style={{
            ...styles.uploadBtn,
            opacity: processing ? 0.6 : 1,
            cursor: processing ? 'not-allowed' : 'pointer'
          }}
          onClick={() => !processing && fileInputRef.current?.click()}
          disabled={processing}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>{processing ? '处理中...' : '上传照片'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>图层切换</div>
        <div style={styles.thumbnails}>
          {(['original', 'lineart', 'filled'] as DisplayMode[]).map((mode) => {
            const thumbnail = mode === 'filled' ? filledThumbnail : getThumbnailForMode(mode);
            const isActive = displayMode === mode;
            const isDisabled = !processedData;

            return (
              <button
                key={mode}
                style={{
                  ...styles.thumbnailItem,
                  borderColor: isActive ? '#A7B7A0' : 'transparent',
                  boxShadow: isActive ? '0 2px 8px rgba(167,183,160,0.3)' : 'none',
                  opacity: isDisabled ? 0.4 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer'
                }}
                onClick={() => !isDisabled && onDisplayModeChange(mode)}
                disabled={isDisabled}
              >
                <div style={styles.thumbnailImgWrap}>
                  {thumbnail ? (
                    <img src={thumbnail} alt={modeLabels[mode]} style={styles.thumbnailImg} />
                  ) : (
                    <div style={styles.thumbnailPlaceholder}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                </div>
                <span style={{
                  ...styles.thumbnailLabel,
                  color: isActive ? '#6B7F63' : '#666',
                  fontWeight: isActive ? 600 : 400
                }}>
                  {modeLabels[mode]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ ...styles.section, marginTop: 'auto' }}>
        <button
          style={{
            ...styles.exportBtn,
            opacity: !processedData ? 0.4 : 1,
            cursor: !processedData ? 'not-allowed' : 'pointer'
          }}
          onClick={onExport}
          disabled={!processedData}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>导出作品</span>
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '220px',
    height: '100%',
    background: '#FAF8F5',
    borderRight: '1px solid #E8E2D8',
    padding: '24px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    overflowY: 'auto' as const
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  logoText: {
    fontSize: '17px',
    fontWeight: 600,
    color: '#4A5043',
    letterSpacing: '0.5px'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#8A8A8A',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: '2px'
  },
  uploadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    background: '#FFFFFF',
    color: '#6B7F63',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    border: '1.5px solid transparent'
  },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 16px',
    border: '1.5px solid transparent',
    borderRadius: '10px',
    background: '#FFFFFF',
    color: '#D4A5A5',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease'
  },
  thumbnails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  thumbnailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px',
    borderRadius: '10px',
    background: '#FFFFFF',
    border: '2px solid transparent',
    transition: 'all 0.2s ease'
  },
  thumbnailImgWrap: {
    width: '44px',
    height: '44px',
    borderRadius: '6px',
    overflow: 'hidden',
    background: '#F0EBE2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  thumbnailLabel: {
    fontSize: '13px',
    transition: 'color 0.2s ease'
  }
};

const hoverStyles = document.createElement('style');
hoverStyles.textContent = `
  .btn-upload:hover:not(:disabled) {
    background: #A7B7A0 !important;
    color: #FFFFFF !important;
  }
  .btn-export:hover:not(:disabled) {
    background: #D4A5A5 !important;
    color: #FFFFFF !important;
  }
  .thumb-btn:hover:not(:disabled) {
    border-color: #E0D8C8 !important;
    transform: translateY(-1px);
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('#toolbar-styles')) {
  hoverStyles.id = 'toolbar-styles';
  document.head.appendChild(hoverStyles);
}

export default Toolbar;
