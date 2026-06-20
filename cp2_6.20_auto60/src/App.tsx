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

// 分块解码 base64，避免超大图片导致的内存峰值和 atob 的字符串长度限制
function base64ToBlob(base64Data: string, chunkSize = 1024 * 512): Blob {
  try {
    const commaIdx = base64Data.indexOf(',');
    const header = commaIdx >= 0 ? base64Data.slice(0, commaIdx) : 'data:image/png;base64';
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const base64 = commaIdx >= 0 ? base64Data.slice(commaIdx + 1) : base64Data;

    // 按 chunkSize 分段解码，减小单次 atob 的内存占用
    const byteArrays: Uint8Array[] = [];
    for (let offset = 0; offset < base64.length; offset += chunkSize) {
      const chunk = base64.slice(offset, offset + chunkSize);
      const decoded = atob(chunk);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }
      byteArrays.push(bytes);
    }

    return new Blob(byteArrays, { type: mime });
  } catch (e) {
    console.error('base64ToBlob failed, fallback to simple mode:', e);
    // 降级方案
    const fallback = atob(base64Data.split(',')[1] || base64Data);
    const arr = new Uint8Array(fallback.length);
    for (let i = 0; i < fallback.length; i++) arr[i] = fallback.charCodeAt(i);
    return new Blob([arr], { type: 'image/png' });
  }
}

// 复制内容到剪贴板（带降级）
async function copyTextToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch (_) { /* ignore */ }

  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
  }
}

// 尝试将图片 Blob 复制到剪贴板（现代浏览器支持）
async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (navigator.clipboard && (window as any).ClipboardItem && window.isSecureContext) {
      const item = new (window as any).ClipboardItem({ [blob.type]: blob });
      await (navigator.clipboard as any).write([item]);
      return true;
    }
  } catch (_) { /* ignore */ }
  return false;
}

function App(): React.ReactElement {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string>('');
  const [processedImage, setProcessedImage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragBlink, setDragBlink] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<StyleType>('watercolor');
  const [intensity, setIntensity] = useState(60);
  const [contrast, setContrast] = useState(0);
  const [detail, setDetail] = useState(100);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [displaySrc, setDisplaySrc] = useState<string>('');
  const [fadeKey, setFadeKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      try { URL.revokeObjectURL(objectUrlRef.current); } catch (_) { /* ignore */ }
      objectUrlRef.current = null;
    }
  }, []);

  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 2000);
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
      scalar: 0.9,
      startVelocity: 35,
      decay: 0.94,
      shapes: ['circle', 'square']
    });
  }, []);

  const triggerDragBlink = useCallback(() => {
    let count = 0;
    const totalBlinks = 4;
    setDragBlink(true);
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
    }
    blinkIntervalRef.current = setInterval(() => {
      count++;
      setDragBlink((prev) => !prev);
      if (count >= totalBlinks) {
        if (blinkIntervalRef.current) {
          clearInterval(blinkIntervalRef.current);
          blinkIntervalRef.current = null;
        }
        setDragBlink(true);
      }
    }, 150);
  }, []);

  const stopDragBlink = useCallback(() => {
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
    }
    setDragBlink(false);
  }, []);

  const processImage = useCallback(async () => {
    if (!originalImage) return;

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
      if (data && data.success) {
        cleanupObjectUrl();
        setProcessedImage(data.image);
        setDisplaySrc(data.image);
        setFadeKey((k) => k + 1);
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Processing failed:', error);
      showToastMessage('处理失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  }, [originalImage, selectedStyle, intensity, contrast, detail, showToastMessage, cleanupObjectUrl]);

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

    cleanupObjectUrl();
    setOriginalImage(file);
    setProcessedImage('');
    setDisplaySrc('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setOriginalPreview(src);
      setDisplaySrc(src);
      setFadeKey((k) => k + 1);
    };
    reader.onerror = () => showToastMessage('图片读取失败');
    reader.readAsDataURL(file);
  }, [showToastMessage, cleanupObjectUrl]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    stopDragBlink();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect, stopDragBlink]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
      triggerDragBlink();
    }
  }, [isDragging, triggerDragBlink]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
      stopDragBlink();
    }
  }, [stopDragBlink]);

  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  }, [handleFileSelect]);

  const handleStyleSelect = useCallback((style: StyleOption, e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedStyle !== style.id) {
      fireConfetti(e.currentTarget);
    }
    setSelectedStyle(style.id);
  }, [selectedStyle, fireConfetti]);

  const handleSave = useCallback(async () => {
    const sourceData = processedImage || originalPreview;
    if (!sourceData) return;

    setIsSaving(true);
    let blob: Blob | null = null;
    let url: string | null = null;

    try {
      // 让浏览器有机会先渲染加载状态
      await new Promise(r => setTimeout(r, 10));
      blob = base64ToBlob(sourceData);
      url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const link = document.createElement('a');
      link.href = url;
      const ext = blob.type.includes('jpeg') ? 'jpg' : 'png';
      link.download = `styled-${selectedStyle}-${Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        cleanupObjectUrl();
      }, 1500);

      showToastMessage('图片已保存');
    } catch (err) {
      console.error('Save failed:', err);
      // 降级：直接用 data URL 触发下载
      try {
        const link = document.createElement('a');
        link.href = sourceData;
        link.download = `styled-${selectedStyle}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToastMessage('图片已保存');
      } catch (e2) {
        showToastMessage('保存失败，请重试');
      }
    } finally {
      setIsSaving(false);
    }
  }, [processedImage, originalPreview, selectedStyle, cleanupObjectUrl, showToastMessage]);

  // 前端本地分享：优先复制图片到剪贴板，其次复制 dataURL
  const handleShare = useCallback(async () => {
    const sourceData = processedImage || originalPreview;
    if (!sourceData) return;

    setIsSharing(true);

    try {
      await new Promise(r => setTimeout(r, 10));
      const blob = base64ToBlob(sourceData);

      // 1. 尝试复制图片本身
      const copiedImage = await copyImageToClipboard(blob);
      if (copiedImage) {
        showToastMessage('图片已复制到剪贴板，可直接粘贴分享');
        setIsSharing(false);
        return;
      }

      // 2. 复制图片的 data URL（可在同设备浏览器打开）
      await copyTextToClipboard(sourceData);
      showToastMessage('图片链接已复制（data URL 可直接粘贴打开）');
    } catch (err) {
      console.error('Share failed:', err);
      showToastMessage('分享失败，请重试');
    } finally {
      setIsSharing(false);
    }
  }, [processedImage, originalPreview, showToastMessage]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blinkIntervalRef.current) clearInterval(blinkIntervalRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      cleanupObjectUrl();
    };
  }, [cleanupObjectUrl]);

  const busy = isProcessing || isSaving || isSharing;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">AI 风格化图像转换</h1>
        <p className="app-subtitle">上传图片，选择艺术风格，创造独特作品</p>
      </header>

      <main className="main-content">
        <div
          className={`upload-area ${isDragging ? 'dragging' : ''} ${isDragging && dragBlink ? 'blink-on' : ''} ${originalImage ? 'has-image' : ''}`}
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
          {displaySrc ? (
            <div className="preview-wrapper">
              {busy && (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                  <div className="loading-text">
                    {isProcessing ? '正在处理中...' : isSaving ? '正在保存...' : '正在分享...'}
                  </div>
                </div>
              )}
              <img
                key={fadeKey}
                src={displaySrc}
                alt="预览"
                className={`preview-image fade-in ${busy ? 'dimmed' : ''}`}
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
                  disabled={busy}
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
                  disabled={busy}
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
                  disabled={busy}
                />
              </div>
            </div>

            {displaySrc && (
              <div className="actions-section">
                <button
                  className="btn btn-save"
                  onClick={handleSave}
                  disabled={busy}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {isSaving ? '保存中...' : '保存图片'}
                </button>
                <button
                  className="btn btn-share"
                  onClick={handleShare}
                  disabled={busy}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  {isSharing ? '分享中...' : '分享'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <div className={`toast ${showToast ? 'toast-show' : ''}`} role="alert">
        {toastMessage}
      </div>
    </div>
  );
}

export default App;
