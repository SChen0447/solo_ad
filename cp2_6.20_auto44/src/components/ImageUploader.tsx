import { useCallback, useState, useRef, type ChangeEvent, type DragEvent, type FC } from 'react';

interface ImageUploaderProps {
  onImageUpload: (file: File, previewUrl: string) => void;
  previewUrl: string | null;
}

export const ImageUploader: FC<ImageUploaderProps> = ({ onImageUpload, previewUrl }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [dragCount, setDragCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    onImageUpload(file, url);
  }, [onImageUpload]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCount(prev => {
      const next = prev + 1;
      if (next === 1) {
        setIsDragging(true);
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 150);
        setTimeout(() => setIsFlashing(true), 150);
        setTimeout(() => setIsFlashing(false), 300);
      }
      return next;
    });
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCount(prev => {
      const next = prev - 1;
      if (next === 0) {
        setIsDragging(false);
      }
      return Math.max(0, next);
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCount(0);
    setIsDragging(false);
    setIsFlashing(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      className={`image-uploader ${isDragging ? 'dragging' : ''} ${isFlashing ? 'flashing' : ''} ${previewUrl ? 'has-image' : ''}`}
      onClick={!previewUrl ? handleClick : undefined}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
      {previewUrl ? (
        <img src={previewUrl} alt="Preview" className="preview-image" />
      ) : (
        <div className="upload-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p>点击或拖拽上传图片</p>
          <span className="upload-hint">支持 JPEG、PNG、GIF、WebP 格式</span>
        </div>
      )}
    </div>
  );
};
