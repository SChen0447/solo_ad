import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, AlertCircle, FileImage } from 'lucide-react';
import { ImageItem, MAX_FILE_SIZE, MAX_IMAGES, ALLOWED_TYPES } from '@/types';
import { eventBus } from '@/utils/EventBus';

interface ImageUploaderProps {
  images: ImageItem[];
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ images }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `不支持的文件格式: ${file.name}，仅支持JPG/PNG`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `文件过大: ${file.name}，最大支持10MB`;
    }
    return null;
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setError(null);

    const availableSlots = MAX_IMAGES - images.length;
    if (fileArray.length > availableSlots) {
      setError(`最多只能上传${MAX_IMAGES}张图片，当前还可上传${availableSlots}张`);
      return;
    }

    const validFiles: File[] = [];
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      validFiles.push(file);
    }

    const newImages: ImageItem[] = [];

    for (const file of validFiles) {
      const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setUploadProgress((prev) => new Map(prev).set(imageId, 0));

      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        setUploadProgress((prev) => new Map(prev).set(imageId, progress));
      }

      const url = URL.createObjectURL(file);
      newImages.push({
        id: imageId,
        file,
        url,
        name: file.name,
        rotation: 0,
        status: 'pending',
      });

      setUploadProgress((prev) => {
        const next = new Map(prev);
        next.delete(imageId);
        return next;
      });
    }

    if (newImages.length > 0) {
      eventBus.emit('IMAGE_UPLOADED', newImages);
    }
  }, [images.length]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (id: string) => {
    const image = images.find((img) => img.id === id);
    if (image) {
      URL.revokeObjectURL(image.url);
      if (image.processedUrl) {
        URL.revokeObjectURL(image.processedUrl);
      }
    }
    eventBus.emit('IMAGE_REMOVED', id);
  };

  return (
    <div className="uploader-container">
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/jpg"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="upload-icon">
          <Upload size={40} />
        </div>
        <p className="upload-text">拖拽图片到此处或点击上传</p>
        <p className="upload-hint">支持 JPG/PNG 格式，单张不超过 10MB，最多 10 张</p>
      </div>

      {error && (
        <div className="upload-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {images.length > 0 && (
        <div className="image-list">
          <div className="image-list-header">
            <span className="image-count">已上传 {images.length}/{MAX_IMAGES} 张</span>
          </div>
          <div className="image-thumbnails">
            {images.map((image) => (
              <div key={image.id} className="image-thumbnail">
                <img src={image.url} alt={image.name} />
                {uploadProgress.has(image.id) && (
                  <div className="upload-progress-overlay">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${uploadProgress.get(image.id)}%` }}
                      />
                    </div>
                    <span className="progress-text">{uploadProgress.get(image.id)}%</span>
                  </div>
                )}
                <button
                  className="remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(image.id);
                  }}
                >
                  <X size={14} />
                </button>
                <div className="image-name">{image.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {images.length === 0 && uploadProgress.size === 0 && (
        <div className="empty-state">
          <FileImage size={48} className="empty-icon" />
          <p>暂无图片，请上传图片开始编辑</p>
        </div>
      )}
    </div>
  );
};
