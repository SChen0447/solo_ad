import React, { useRef, useState, useCallback } from 'react';

interface ImageUploaderProps {
  onImageLoad: (image: HTMLImageElement, fileName: string) => void;
  hasImage: boolean;
}

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="uploader-icon">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageLoad, hasImage }) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        alert('Unsupported format. Please upload JPG, PNG, or WebP images.');
        return;
      }
      if (file.size > MAX_SIZE) {
        alert('File too large. Maximum size is 10MB.');
        return;
      }
      const img = new Image();
      img.onload = () => {
        onImageLoad(img, file.name);
      };
      img.src = URL.createObjectURL(file);
    },
    [onImageLoad]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="uploader-container">
      <div className="section-title">Upload Image</div>
      <div
        className={`uploader-zone${dragOver ? ' drag-over' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadIcon />
        <div className="uploader-text">
          {hasImage ? 'Replace Image' : 'Click or drag to upload'}
        </div>
        <div className="uploader-hint">JPG, PNG, WebP · Max 10MB</div>
        <input
          ref={inputRef}
          type="file"
          className="uploader-input"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default ImageUploader;
