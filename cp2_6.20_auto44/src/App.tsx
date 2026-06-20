import { useState, useCallback, useEffect, useRef } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { StyleSelector } from './components/StyleSelector';
import { ControlPanel, type ControlParams } from './components/ControlPanel';
import { ImagePreview } from './components/ImagePreview';
import { ExportActions } from './components/ExportActions';
import { ToastContainer } from './components/Toast';
import { useDebounce } from './hooks/useDebounce';
import { useToast } from './hooks/useToast';
import { uploadImage, applyStyle } from './services/api';
import type { StyleType, StyleParams } from './types';

export default function App() {
  const [_imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StyleType | null>(null);
  const [controlParams, setControlParams] = useState<ControlParams>({
    intensity: 50,
    contrast: 0,
    detailLevel: 100
  });
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const { toasts, showToast, removeToast } = useToast();
  const prevDebouncedRef = useRef<string>('');

  const debouncedParams = useDebounce(controlParams, 300);
  const debouncedStyle = useDebounce(selectedStyle, 300);

  const handleImageUpload = useCallback(async (file: File, url: string) => {
    setImageFile(file);
    setPreviewUrl(url);
    setProcessedImage(null);
    setSelectedStyle(null);
    setControlParams({ intensity: 50, contrast: 0, detailLevel: 100 });

    try {
      const result = await uploadImage(file);
      if (result.success) {
        setImageId(result.imageId);
      }
    } catch (err) {
      showToast('图片上传失败，请重试');
    }
  }, [showToast]);

  const handleStyleSelect = useCallback((style: StyleType) => {
    setSelectedStyle(style);
    setProcessedImage(null);
  }, []);

  useEffect(() => {
    if (!imageId || !debouncedStyle) return;

    const paramKey = `${debouncedStyle}-${debouncedParams.intensity}-${debouncedParams.contrast}-${debouncedParams.detailLevel}`;
    if (paramKey === prevDebouncedRef.current) return;
    prevDebouncedRef.current = paramKey;

    const processImage = async () => {
      setIsProcessing(true);
      setIsFading(true);

      try {
        const params: StyleParams = {
          style: debouncedStyle,
          intensity: debouncedParams.intensity,
          contrast: debouncedParams.contrast,
          detailLevel: debouncedParams.detailLevel
        };
        const result = await applyStyle(imageId, params);
        if (result.success && result.processedImage) {
          setProcessedImage(result.processedImage);
          setTimeout(() => setIsFading(false), 300);
        }
      } catch (err) {
        showToast('风格转换失败，请重试');
        setIsFading(false);
      } finally {
        setIsProcessing(false);
      }
    };

    processImage();
  }, [imageId, debouncedStyle, debouncedParams, showToast]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AI 风格化图像转换</h1>
        <p>上传图片，选择艺术风格，一键生成创意作品</p>
      </header>

      <div className="main-content">
        <div className="main-left">
          {!previewUrl ? (
            <ImageUploader onImageUpload={handleImageUpload} previewUrl={null} />
          ) : (
            <>
              <ImagePreview
                imageUrl={previewUrl}
                processedUrl={processedImage}
                isProcessing={isProcessing || isFading}
              />
              <StyleSelector
                selectedStyle={selectedStyle}
                onSelectStyle={handleStyleSelect}
                disabled={isProcessing}
              />
              <ExportActions processedImage={processedImage} onToast={showToast} />
            </>
          )}
        </div>

        {previewUrl && (
          <div className="main-right">
            <ControlPanel
              params={controlParams}
              onChange={setControlParams}
              disabled={!selectedStyle || isProcessing}
            />
          </div>
        )}
      </div>

      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
      />
    </div>
  );
}
