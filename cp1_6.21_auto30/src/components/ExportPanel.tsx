import { useState, useEffect, useRef } from 'react';
import { ExportSize } from '../types';
import './ExportPanel.css';

interface ExportPanelProps {
  onExport: (size: { width: number; height: number }) => void;
  isExporting: boolean;
  progress: number;
  disabled?: boolean;
}

const EXPORT_SIZES: ExportSize[] = [
  { width: 800, height: 1200, label: '标准 800×1200' },
  { width: 1200, height: 1800, label: '高清 1200×1800' },
];

export default function ExportPanel({ onExport, isExporting, progress, disabled }: ExportPanelProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedSize, setSelectedSize] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showDialog && dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setShowDialog(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDialog(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showDialog]);

  const handleConfirmExport = () => {
    const size = EXPORT_SIZES[selectedSize];
    setShowDialog(false);
    onExport({ width: size.width, height: size.height });
  };

  return (
    <>
      <button
        className={`export-btn ${disabled ? 'disabled' : ''}`}
        disabled={disabled || isExporting}
        onClick={() => !disabled && !isExporting && setShowDialog(true)}
      >
        {isExporting ? (
          <>
            <svg className="spinner" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
              <path
                d="M22 12a10 10 0 0 1-10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            导出中 {progress}%
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" className="btn-icon">
              <path
                d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            导出海报
          </>
        )}
      </button>

      {isExporting && (
        <div className="progress-overlay">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {showDialog && (
        <div className="dialog-overlay">
          <div className="dialog" ref={dialogRef}>
            <h3 className="dialog-title">导出海报</h3>
            <p className="dialog-desc">选择导出图片的分辨率尺寸</p>

            <div className="size-options">
              {EXPORT_SIZES.map((size, idx) => (
                <div
                  key={`${size.width}-${size.height}`}
                  className={`size-option ${selectedSize === idx ? 'active' : ''}`}
                  onClick={() => setSelectedSize(idx)}
                >
                  <div className="size-preview" style={{ aspectRatio: `${size.width} / ${size.height}` }}>
                    <div className="size-preview-inner">
                      <span className="size-icon">📐</span>
                    </div>
                  </div>
                  <div className="size-info">
                    <div className="size-label">{size.label}</div>
                    <div className="size-dimension">{size.width} × {size.height} px</div>
                  </div>
                  <div className="size-radio">
                    <div className={`radio-inner ${selectedSize === idx ? 'checked' : ''}`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="dialog-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowDialog(false)}
              >
                取消
              </button>
              <button
                className="btn-confirm"
                onClick={handleConfirmExport}
              >
                确认导出
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
