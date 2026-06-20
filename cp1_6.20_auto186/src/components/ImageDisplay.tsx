import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageDisplayProps {
  imageUrl: string;
  stepName: string;
}

export default function ImageDisplay({ imageUrl, stepName }: ImageDisplayProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageKey, setImageKey] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setImageKey((prev) => prev + 1);
  }, [imageUrl]);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    },
    [isFullscreen]
  );

  useEffect(() => {
    if (isFullscreen) {
      window.addEventListener('keydown', handleKeydown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen, handleKeydown]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsFullscreen(false);
    }
  };

  return (
    <>
      <div className="image-display" onClick={toggleFullscreen}>
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              key="placeholder"
              className="image-placeholder"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="placeholder-spinner" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.img
          key={imageKey}
          src={imageUrl}
          alt={stepName}
          className="display-image"
          onLoad={handleImageLoad}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: isLoading ? 0 : 1, scale: isLoading ? 1.05 : 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ display: isLoading ? 'none' : 'block' }}
        />

        <div className="step-name-overlay">{stepName}</div>
      </div>

      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            className="fullscreen-overlay"
            onClick={handleOverlayClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.img
              key={`fullscreen-${imageKey}`}
              src={imageUrl}
              alt={stepName}
              className="fullscreen-image"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            <div className="fullscreen-step-name">{stepName}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
