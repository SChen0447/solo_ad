import React, { useRef } from 'react';
import { Upload, Download, Image as ImageIcon } from 'lucide-react';
import type { DisplayMode } from '../modules/imageProcessor/types';

interface ThumbnailData {
  mode: DisplayMode;
  label: string;
  dataUrl?: string;
}

interface ToolbarProps {
  onUpload: (file: File) => void;
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onExport: () => void;
  hasImage: boolean;
  thumbnails: ThumbnailData[];
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onUpload,
  displayMode,
  onDisplayModeChange,
  onExport,
  hasImage,
  thumbnails,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="toolbar">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="toolbar-header">
        <ImageIcon size={20} color="#6b7280" />
        <span className="toolbar-title">数字油画</span>
      </div>

      <div className="toolbar-buttons">
        <button className="toolbar-btn upload-btn" onClick={handleUploadClick}>
          <Upload size={18} />
          <span>上传照片</span>
        </button>

        <div className="thumbnails-section">
          <span className="section-label">显示模式</span>
          <div className="thumbnails-grid">
            {thumbnails.map((t) => (
              <button
                key={t.mode}
                className={`thumbnail-btn ${displayMode === t.mode ? 'active' : ''} ${!hasImage ? 'disabled' : ''}`}
                onClick={() => hasImage && onDisplayModeChange(t.mode)}
                disabled={!hasImage}
                title={t.label}
              >
                {t.dataUrl ? (
                  <img src={t.dataUrl} alt={t.label} />
                ) : (
                  <div className="thumbnail-placeholder">
                    <ImageIcon size={16} color="#aaa" />
                  </div>
                )}
                <span className="thumbnail-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          className={`toolbar-btn export-btn ${!hasImage ? 'disabled' : ''}`}
          onClick={onExport}
          disabled={!hasImage}
        >
          <Download size={18} />
          <span>导出成品</span>
        </button>
      </div>

      <div className="toolbar-footer">
        <span className="footer-text">按编号填色，释放艺术灵感</span>
      </div>
    </div>
  );
};
