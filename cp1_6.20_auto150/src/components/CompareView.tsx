import React, { forwardRef } from 'react';
import type { Annotation, ImageData } from '../types';
import { AnnotationCanvas } from './AnnotationCanvas';

interface CompareViewProps {
  imageData: ImageData | null;
  target: 'A' | 'B';
  annotations: Annotation[];
  onTitleChange: (title: string) => void;
  onDelete: () => void;
  onAddAnnotation: (annotation: Annotation) => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
  onFileDrop: (file: File) => void;
  onFileSelect: (file: File) => void;
}

export const CompareView = forwardRef<HTMLDivElement, CompareViewProps>(({
  imageData,
  target,
  annotations,
  onTitleChange,
  onDelete,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onFileDrop,
  onFileSelect,
}, ref) => {
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onFileDrop(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
    e.target.value = '';
  };

  const defaultTitle = target === 'A' ? '方案A' : '方案B';

  return (
    <div style={{ width: '50%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        gap: 12,
      }}>
        <input
          type="text"
          value={imageData?.title || defaultTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={defaultTitle}
          style={{
            width: '80%',
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: 6,
            fontSize: 16,
            outline: 'none',
            textAlign: 'center',
          }}
        />
        {imageData && (
          <button
            onClick={onDelete}
            style={{
              padding: '8px 14px',
              background: '#e63946',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            删除
          </button>
        )}
      </div>

      <div
        ref={ref}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          flex: 1,
          overflow: 'auto',
          background: '#f0f0f0',
          position: 'relative',
          border: isDraggingOver ? '2px dashed #3a86ff' : 'none',
        }}
      >
        {!imageData ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              minHeight: 400,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#888',
              cursor: 'pointer',
              padding: 40,
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🖼️</div>
            <div style={{ fontSize: 16, marginBottom: 8 }}>拖拽图片到这里</div>
            <div style={{ fontSize: 14 }}>或点击选择文件（PNG/JPG，最大10MB）</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
          </div>
        ) : (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={imageData.url}
              alt={imageData.title}
              style={{
                display: 'block',
                maxWidth: '45vw',
                width: 'auto',
                height: 'auto',
                transformOrigin: 'top left',
              }}
              draggable={false}
            />
            <AnnotationCanvas
              annotations={annotations}
              target={target}
              imageWidth={imageData.width}
              imageHeight={imageData.height}
              onAddAnnotation={onAddAnnotation}
              onUpdateAnnotation={onUpdateAnnotation}
              onDeleteAnnotation={onDeleteAnnotation}
            />
          </div>
        )}
      </div>
    </div>
  );
});

CompareView.displayName = 'CompareView';
