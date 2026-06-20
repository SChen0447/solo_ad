import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload } from 'lucide-react';
import Timeline from './components/Timeline';
import ImageDisplay from './components/ImageDisplay';
import { processFiles } from './utils/manager';
import type { ImageItem } from './types';

export default function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playIntervalRef = useRef<number | null>(null);

  const showErrorToast = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  }, []);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const result = await processFiles(files);

      if (!result.success && result.errors.length > 0) {
        showErrorToast(result.errors[0]);
      } else if (result.images.length > 0) {
        setImages(result.images);
        setSelectedIndex(0);
        setIsPlaying(false);
        if (result.errors.length > 0) {
          showErrorToast(result.errors[0]);
        }
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [showErrorToast]
  );

  const handleSelectIndex = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  useEffect(() => {
    if (isPlaying && images.length > 1) {
      playIntervalRef.current = window.setInterval(() => {
        setSelectedIndex((prev) => {
          if (prev >= images.length - 1) {
            return 0;
          }
          return prev + 1;
        });
      }, 3000);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, images.length]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">创作过程时间轴</h1>
        <button className="upload-button" onClick={handleUploadClick}>
          <Upload size={18} />
          <span>上传图片</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          multiple
          className="file-input"
          onChange={handleUpload}
        />
      </header>

      <main className="main-content">
        {images.length > 0 ? (
          <>
            <ImageDisplay
              imageUrl={images[selectedIndex].url}
              stepName={images[selectedIndex].stepName}
            />
            <div className="divider" />
            <Timeline
              images={images}
              selectedIndex={selectedIndex}
              onSelectIndex={handleSelectIndex}
              isPlaying={isPlaying}
              onTogglePlay={togglePlay}
            />
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <Upload size={48} />
            </div>
            <p className="empty-text">点击上方按钮上传图片</p>
            <p className="empty-subtext">支持 PNG 和 JPG 格式，最多 10 张，单张不超过 5MB</p>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showToast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
