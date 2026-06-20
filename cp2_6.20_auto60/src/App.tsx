import React, { useState, useRef, useCallback, useEffect } from 'react';
import confetti from 'canvas-confetti';

type StyleType = 'watercolor' | 'oil' | 'sketch' | 'pixel' | 'impressionism';

interface StyleOption {
  id: StyleType;
  name: string;
  nameCn: string;
  gradient: string;
}

const STYLES: StyleOption[] = [
  { id: 'watercolor', name: 'Watercolor', nameCn: '水彩', gradient: 'linear-gradient(135deg, #87CEEB 0%, #FFB6C1 50%, #98FB98 100%)' },
  { id: 'oil', name: 'Oil', nameCn: '油画', gradient: 'linear-gradient(135deg, #8B4513 0%, #DAA520 50%, #CD853F 100%)' },
  { id: 'sketch', name: 'Sketch', nameCn: '素描', gradient: 'linear-gradient(135deg, #696969 0%, #A9A9A9 50%, #D3D3D3 100%)' },
  { id: 'pixel', name: 'Pixel Art', nameCn: '像素风', gradient: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)' },
  { id: 'impressionism', name: 'Impressionism', nameCn: '印象派', gradient: 'linear-gradient(135deg, #FFE4B5 0%, #FFA07A 50%, #FF6347 100%)' },
];

function App(): React.ReactElement {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string>('');
  const [processedImage, setProcessedImage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<StyleType>('watercolor');
  const [intensity, setIntensity] = useState(60);
  const [contrast, setContrast] = useState(0);
  const [detail, setDetail] = useState(100);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [imageFading, setImageFading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, []);

  const fireConfetti = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 30,
      spread: 60,
      origin: { x, y },
      colors: ['#FFD700', '#FFA500', '#FFEC8B', '#FFFF00'],
      ticks: 30,
      gravity: 0.8,
      scalar: 0.8
    });
  }, []);

  const processImage = useCallback(async () => {
    if (!originalImage) return;

    setImageFading(true);
    setTimeout(() => setImageFading(false), 50);

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('image', originalImage);
      formData.append('style', selectedStyle);
      formData.append('intensity', intensity.toString());
      formData.append('contrast', contrast.toString());
      formData.append('detail', detail.toString());

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setProcessedImage(data.image);
      }
    } catch (error) {
      console.error('Processing failed:', error);
      showToastMessage('处理失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  }, [originalImage, selectedStyle, intensity, contrast, detail, showToastMessage]);

  useEffect(() => {
    if (!originalImage) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      processImage();
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [originalImage, selectedStyle, intensity, contrast, detail, processImage]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showToastMessage('请选择图片文件');
      return;
    }

    setOriginalImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalPreview(e.target?.result as string);
      setProcessedImage('');
    };
    reader.readAsDataURL(file);
  }, [showToastMessage]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (dragTimerRef.current) {
      clearInterval(dragTimerRef.current);
    }

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleStyleSelect = useCallback((style: StyleOption, e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedStyle !== style.id) {
      fireConfetti(e.currentTarget);
    }
    setSelectedStyle(style.id);
  }, [selectedStyle, fireConfetti]);

  const handleSave = useCallback(() => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.download = `styled-${selectedStyle}-${Date.now()}.png`;
    link.href = processedImage;
    link.click();
    showToastMessage('图片已保存');
  }, [processedImage, selectedStyle, showToastMessage]);

  const handleShare = useCallback(async () => {
    if (!processedImage || !originalImage) return;

    try {
      const response = await fetch(processedImage);
      const blob = await response.blob();
      const file = new File([blob], originalImage.name, { type: blob.type || 'image/png' });

      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/share', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        const fullUrl = `${window.location.origin}/api/share/${data.token}`;
        await navigator.clipboard.writeText(fullUrl);
        showToastMessage('分享链接已复制到剪贴板（5分钟内有效）');
      }
    } catch (error) {
      console.error('Share failed:', error);
      showToastMessage('分享失败，请重试');
    }
  }, [processedImage, originalImage, showToastMessage]);

  const displayImage = processedImage || originalPreview;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">AI 风格化图像转换</h1>
        <p className="app-subtitle">上传图片，选择艺术风格，创造独特作品</p>
      </header>

      <main className="main-content">
        <div
          className={`upload-area ${isDragging ? 'dragging' : ''} ${originalImage ? 'has-image' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClickUpload}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />
          {displayImage ? (
            <div className={`preview-container ${imageFading ? 'fading' : ''}`}>
              {isProcessing && (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                </div>
              )}
              <img
                src={displayImage}
                alt="预览"
                className="preview-image"
              />
            </div>
          ) : (
            <div className="upload-placeholder">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="upload-text">点击或拖拽图片到此处上传</p>
              <p className="upload-hint">支持 JPG、PNG、GIF 等格式</p>
            </div>
          )}
        </div>

        <div className="styles-section">
          <h3 className="section-title">选择艺术风格</h3>
          <div className="styles-scroll">
            <div className="styles-container">
              {STYLES.map((style) => (
                <div
                  key={style.id}
                  className={`style-card ${selectedStyle === style.id ? 'selected' : ''}`}
                  onClick={(e) => handleStyleSelect(style, e)}
                >
                  <div
                    className="style-thumbnail"
                    style={{ background: style.gradient }}
                  >
                    <span className="style-icon">
                      {style.id === 'watercolor' && '🎨'}
                      {style.id === 'oil' && '🖼️'}
                      {style.id === 'sketch' && '✏️'}
                      {style.id === 'pixel' && '👾'}
                      {style.id === 'impressionism' && '🌅'}
                    </span>
                  </div>
                  <span className="style-name">{style.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {originalImage && (
          <>
            <div className="control-panel">
              <h3 className="panel-title">参数调节</h3>

              <div className="slider-group">
                <div className="slider-header">
                  <span className="slider-label">强度</span>
                  <span className="slider-value">{intensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value, 10))}
                  className="custom-slider"
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span className="slider-label">对比度</span>
                  <span className="slider-value">{contrast > 0 ? `+${contrast}` : contrast}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                  className="custom-slider"
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span className="slider-label">细节保留</span>
                  <span className="slider-value">{detail}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="1"
                  value={detail}
                  onChange={(e) => setDetail(parseInt(e.target.value, 10))}
                  className="custom-slider"
                />
              </div>
            </div>

            {processedImage && !isProcessing && (
              <div className="actions-section">
                <button className="btn btn-save" onClick={handleSave}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  保存图片
                </button>
                <button className="btn btn-share" onClick={handleShare}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  分享
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <div className={`toast ${showToast ? 'show' : ''}`}>
        {toastMessage}
      </div>
    </div>
  );
}

export default App;
