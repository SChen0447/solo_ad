import { useState, useCallback } from 'react';
import { Droplets } from 'lucide-react';
import ImageUploader from './components/ImageUploader';
import WatermarkPanel from './components/WatermarkPanel';
import PreviewArea from './components/PreviewArea';
import type { ImageItem, WatermarkConfig, WatermarkPosition } from './utils/watermark';
import { renderWatermark } from './utils/watermark';
import { downloadAllAsZip } from './utils/zipUtils';
import './App.css';

const DEFAULT_CONFIG: WatermarkConfig = {
  text: '© Your Name',
  fontFamily: 'Noto Sans SC',
  fontSize: 36,
  color: '#FFFFFF',
  opacity: 0.8,
  position: 'bottom-right' as WatermarkPosition,
  rotation: 0,
};

export default function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [config, setConfig] = useState<WatermarkConfig>(DEFAULT_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const selectedImage = images.find((img) => img.id === selectedId) || null;
  const allProcessed = images.length > 0 && images.every((img) => img.processedBlob);

  const handleImagesChange = useCallback((newImages: ImageItem[]) => {
    setImages(newImages);
    if (newImages.length > 0 && !selectedId) {
      setSelectedId(newImages[0].id);
    } else if (newImages.length === 0) {
      setSelectedId(null);
    } else if (!newImages.find((img) => img.id === selectedId)) {
      setSelectedId(newImages[0].id);
    }
  }, [selectedId]);

  const handleBatchGenerate = useCallback(async () => {
    if (images.length === 0 || isGenerating) return;

    setIsGenerating(true);
    setProgress(0);

    try {
      const updated: ImageItem[] = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const blob = await renderWatermark(img.url, config);
        updated.push({ ...img, processedBlob: blob });
        setProgress(Math.round(((i + 1) / images.length) * 100));
      }
      setImages(updated);
    } catch (err) {
      console.error('批量生成失败:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [images, config, isGenerating]);

  const handleDownloadAll = useCallback(() => {
    downloadAllAsZip(images, 'watermarked-images.zip');
  }, [images]);

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <Droplets size={26} strokeWidth={1.8} />
            <h1 className="app-title">水印批量生成工具</h1>
          </div>
          <p className="app-subtitle">为摄影师与设计师打造的高效水印解决方案</p>
        </div>
      </header>

      <main className="app-main">
        <section className="left-panel">
          <div className="panel-card">
            <ImageUploader
              images={images}
              onImagesChange={handleImagesChange}
              onSelectImage={setSelectedId}
              selectedId={selectedId}
              allProcessed={allProcessed}
              onDownloadAll={handleDownloadAll}
            />
          </div>
        </section>

        <section className="right-panel">
          <div className="panel-card preview-card">
            <PreviewArea image={selectedImage} config={config} />
          </div>
          <div className="panel-card">
            <WatermarkPanel
              config={config}
              onChange={setConfig}
              onBatchGenerate={handleBatchGenerate}
              isGenerating={isGenerating}
              progress={progress}
              hasImages={images.length > 0}
              allProcessed={allProcessed}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
