import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Zap, Loader2 } from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';
import { FilterList } from '@/components/FilterList';
import { ColorPreview } from '@/components/ColorPreview';
import { FilterControls } from '@/components/FilterControls';
import { ImageItem, FilterParams, FilterPreset, DEFAULT_PARAMS, BatchProgress } from '@/types';
import { eventBus } from '@/utils/EventBus';
import { filterEngine } from '@/engine/FilterEngine';

function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [filterParams, setFilterParams] = useState<FilterParams>(DEFAULT_PARAMS);
  const [selectedPreset, setSelectedPreset] = useState<FilterPreset | null>(null);
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressAnimating, setProgressAnimating] = useState(false);

  const previewUpdateTimeout = useRef<number | null>(null);
  const processedUrlsRef = useRef<Map<string, string>>(new Map());

  const updatePreview = useCallback(async () => {
    if (images.length === 0) {
      setProcessedPreviewUrl(null);
      return;
    }

    const currentImage = images[currentImageIndex];
    if (!currentImage) return;

    try {
      const resultUrl = await filterEngine.processImageForPreview(currentImage, filterParams);
      
      const oldUrl = processedUrlsRef.current.get(currentImage.id);
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
      }
      
      setProcessedPreviewUrl(resultUrl);
      processedUrlsRef.current.set(currentImage.id, resultUrl);

      eventBus.emit('FILTER_APPLIED', { imageId: currentImage.id, dataUrl: resultUrl });
    } catch (error) {
      console.error('Preview update failed:', error);
    }
  }, [images, currentImageIndex, filterParams]);

  useEffect(() => {
    if (previewUpdateTimeout.current) {
      window.clearTimeout(previewUpdateTimeout.current);
    }
    
    previewUpdateTimeout.current = window.setTimeout(() => {
      updatePreview();
    }, 50);

    return () => {
      if (previewUpdateTimeout.current) {
        window.clearTimeout(previewUpdateTimeout.current);
      }
    };
  }, [updatePreview]);

  useEffect(() => {
    const unsubscribeUploaded = eventBus.on('IMAGE_UPLOADED', (newImages) => {
      setImages((prev) => {
        const updated = [...prev, ...newImages];
        if (prev.length === 0 && newImages.length > 0) {
          setCurrentImageIndex(0);
        }
        return updated;
      });
    });

    const unsubscribeRemoved = eventBus.on('IMAGE_REMOVED', (imageId) => {
      setImages((prev) => {
        const idx = prev.findIndex((img) => img.id === imageId);
        const updated = prev.filter((img) => img.id !== imageId);
        
        if (idx >= 0 && idx === currentImageIndex) {
          setCurrentImageIndex(Math.max(0, Math.min(idx, updated.length - 1)));
        } else if (idx < currentImageIndex) {
          setCurrentImageIndex((prevIdx) => Math.max(0, prevIdx - 1));
        }

        const oldUrl = processedUrlsRef.current.get(imageId);
        if (oldUrl) {
          URL.revokeObjectURL(oldUrl);
          processedUrlsRef.current.delete(imageId);
        }

        return updated;
      });
    });

    const unsubscribeRotated = eventBus.on('IMAGE_ROTATED', ({ imageId, rotation }) => {
      setImages((prev) =>
        prev.map((img) => (img.id === imageId ? { ...img, rotation } : img))
      );
    });

    const unsubscribeBatchProgress = eventBus.on('BATCH_PROGRESS', (progress) => {
      setProgressAnimating(true);
      setTimeout(() => setProgressAnimating(false), 300);
      setBatchProgress(progress);
    });

    const unsubscribeBatchComplete = eventBus.on('BATCH_COMPLETE', () => {
      setIsProcessing(false);
      setTimeout(() => setBatchProgress(null), 1000);
    });

    return () => {
      unsubscribeUploaded();
      unsubscribeRemoved();
      unsubscribeRotated();
      unsubscribeBatchProgress();
      unsubscribeBatchComplete();
    };
  }, [currentImageIndex]);

  useEffect(() => {
    return () => {
      processedUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      filterEngine.destroy();
    };
  }, []);

  const handleParamsChange = (newParams: FilterParams) => {
    setFilterParams(newParams);
    setSelectedPreset(null);
    eventBus.emit('FILTER_PARAMS_CHANGED', newParams);
  };

  const handlePresetSelect = (preset: FilterPreset | null) => {
    setSelectedPreset(preset);
    if (preset) {
      setFilterParams(preset.params);
      eventBus.emit('FILTER_PARAMS_CHANGED', preset.params);
    }
  };

  const handleResetParams = () => {
    setFilterParams(DEFAULT_PARAMS);
    setSelectedPreset(null);
    eventBus.emit('FILTER_PARAMS_CHANGED', DEFAULT_PARAMS);
  };

  const handleBatchApply = async () => {
    if (images.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setBatchProgress({ current: 0, total: images.length });
    await filterEngine.batchProcess(images, filterParams);
  };

  const progressPercent = batchProgress
    ? Math.round((batchProgress.current / batchProgress.total) * 100)
    : 0;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <Camera size={28} />
          </div>
          <div className="title-group">
            <h1 className="app-title">拍立调</h1>
            <p className="app-subtitle">一键批量调色，风格同步呈现</p>
          </div>
        </div>
        <div className="header-actions">
          {images.length > 0 && (
            <button
              className={`batch-apply-btn ${isProcessing ? 'processing' : ''}`}
              onClick={handleBatchApply}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  批量应用并下载 ({images.length})
                </>
              )}
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        <section className="left-panel">
          <ImageUploader images={images} />
          <FilterControls
            params={filterParams}
            onParamsChange={handleParamsChange}
            onReset={handleResetParams}
          />
        </section>

        <section className="center-panel">
          <ColorPreview
            images={images}
            currentImageIndex={currentImageIndex}
            params={filterParams}
            processedPreviewUrl={processedPreviewUrl}
            onImageIndexChange={setCurrentImageIndex}
          />
        </section>

        <section className="right-panel">
          <FilterList
            selectedPresetId={selectedPreset?.id || null}
            onPresetSelect={handlePresetSelect}
          />
        </section>
      </main>

      {batchProgress && (
        <div className="batch-progress-bar">
          <div className="progress-info">
            <span>批量处理中</span>
            <span>
              {batchProgress.current}/{batchProgress.total} 张图片 · {progressPercent}%
            </span>
          </div>
          <div className={`progress-track ${progressAnimating ? 'jump' : ''}`}>
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
