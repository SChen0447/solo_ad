import { useRef, useState, useCallback, DragEvent, ChangeEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Upload, X, Download, Image as ImageIcon } from 'lucide-react';
import type { ImageItem } from '../utils/watermark';
import { downloadSingleImage } from '../utils/zipUtils';
import './ImageUploader.css';

interface ImageUploaderProps {
  images: ImageItem[];
  onImagesChange: (images: ImageItem[]) => void;
  onSelectImage: (id: string) => void;
  selectedId: string | null;
  allProcessed: boolean;
  onDownloadAll: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = URL.createObjectURL(file);
  });
}

export default function ImageUploader({
  images,
  onImagesChange,
  onSelectImage,
  selectedId,
  allProcessed,
  onDownloadAll,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        console.warn(`不支持的文件格式: ${file.name}`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`文件过大: ${file.name}`);
        return false;
      }
      return true;
    });

    const newImages: ImageItem[] = [];
    for (const file of fileArray) {
      const dims = await loadImageDimensions(file);
      newImages.push({
        id: uuidv4(),
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        width: dims.width,
        height: dims.height,
      });
    }

    onImagesChange([...images, ...newImages]);
  }, [images, onImagesChange]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  }, [processFiles]);

  const handleRemove = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = images.find((img) => img.id === id);
    if (target) {
      URL.revokeObjectURL(target.url);
    }
    onImagesChange(images.filter((img) => img.id !== id));
  }, [images, onImagesChange]);

  const handleDownloadSingle = useCallback((img: ImageItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (img.processedBlob) {
      const ext = img.name.includes('.') ? img.name.split('.').pop() : 'png';
      const baseName = img.name.replace(/\.[^/.]+$/, '');
      downloadSingleImage(img.processedBlob, `${baseName}_watermarked.${ext}`);
    }
  }, []);

  return (
    <div className="uploader-container">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />
        <div className="drop-icon">
          <Upload size={40} strokeWidth={1.5} />
        </div>
        <p className="drop-text">拖拽图片到此处，或点击上传</p>
        <p className="drop-hint">支持 JPG / PNG 格式，单张不超过 10MB</p>
      </div>

      {images.length > 0 && (
        <div className="thumbnail-section">
          <div className="thumbnail-header">
            <span className="thumbnail-count">已上传 {images.length} 张图片</span>
            {allProcessed && (
              <button className="download-all-btn" onClick={onDownloadAll}>
                <Download size={16} />
                全部打包下载
              </button>
            )}
          </div>
          <div className="thumbnail-grid">
            {images.map((img) => (
              <div
                key={img.id}
                className={`thumbnail-item ${selectedId === img.id ? 'selected' : ''}`}
                onClick={() => onSelectImage(img.id)}
              >
                <div className="thumbnail-image">
                  {img.url ? (
                    <img src={img.url} alt={img.name} />
                  ) : (
                    <div className="thumbnail-placeholder">
                      <ImageIcon size={24} />
                    </div>
                  )}
                  <div className="thumbnail-overlay">
                    <p className="overlay-name">{img.name}</p>
                    <p className="overlay-size">{img.width} × {img.height}</p>
                  </div>
                  <button
                    className="thumbnail-remove"
                    onClick={(e) => handleRemove(img.id, e)}
                  >
                    <X size={16} />
                  </button>
                  {img.processedBlob && (
                    <button
                      className="thumbnail-download"
                      onClick={(e) => handleDownloadSingle(img, e)}
                    >
                      <Download size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
