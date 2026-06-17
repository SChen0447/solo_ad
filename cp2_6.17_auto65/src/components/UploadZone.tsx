import React, { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface UploadZoneProps {
  onImageReady: (pixels: number[]) => void;
  loading: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onImageReady, loading }) => {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE = 10 * 1024 * 1024;

  const validateFile = (file: File): string | null => {
    if (!VALID_TYPES.includes(file.type)) {
      return '仅支持 JPG/PNG/WebP 格式';
    }
    if (file.size > MAX_SIZE) {
      return '文件大小不能超过 10MB';
    }
    return null;
  };

  const processImage = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const rgba = imageData.data;
        const rgb: number[] = [];

        for (let i = 0; i < rgba.length; i += 4) {
          rgb.push(rgba[i], rgba[i + 1], rgba[i + 2]);
        }

        onImageReady(rgb);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleClick = useCallback(() => {
    if (loading) return;
    inputRef.current?.click();
  }, [loading]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
    if (inputRef.current) inputRef.current.value = '';
  }, [onImageReady]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) processImage(file);
  }, [onImageReady]);

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: dragOver ? '2px solid #64ffda' : '2px dashed #555',
        borderRadius: 12,
        minHeight: 200,
        background: dragOver ? '#2a2a2a' : '#1e1e1e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'border 0.2s, background 0.2s',
        padding: 32,
        boxSizing: 'border-box',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {loading ? (
        <div
          style={{
            width: 36,
            height: 36,
            border: '3px solid #555',
            borderTopColor: '#64ffda',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      ) : (
        <Upload size={32} color="#9e9e9e" style={{ marginBottom: 12 }} />
      )}

      <p
        style={{
          color: '#e0e0e0',
          fontSize: 15,
          margin: 0,
          userSelect: 'none',
        }}
      >
        拖拽图片到此处或点击上传
      </p>

      <p
        style={{
          color: '#9e9e9e',
          fontSize: 12,
          margin: '4px 0 0 0',
          userSelect: 'none',
        }}
      >
        支持 JPG/PNG/WebP，最大10MB
      </p>

      {error && (
        <p
          style={{
            color: '#ff5252',
            fontSize: 13,
            margin: '8px 0 0 0',
          }}
        >
          {error}
        </p>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UploadZone;
