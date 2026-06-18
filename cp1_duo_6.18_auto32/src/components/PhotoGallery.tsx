import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTravelStore } from '../store';

const MAX_CONCURRENT_LOADS = 5;
let activeLoads = 0;
const loadQueue: Array<() => void> = [];

async function loadImageWithConcurrency(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tryLoad = () => {
      if (activeLoads >= MAX_CONCURRENT_LOADS) {
        loadQueue.push(tryLoad);
        return;
      }

      activeLoads++;
      const img = new Image();
      
      img.onload = () => {
        activeLoads--;
        if (loadQueue.length > 0) {
          const next = loadQueue.shift();
          next?.();
        }
        resolve(src);
      };
      
      img.onerror = () => {
        activeLoads--;
        if (loadQueue.length > 0) {
          const next = loadQueue.shift();
          next?.();
        }
        reject(new Error('Failed to load image'));
      };
      
      img.src = src;
    };

    tryLoad();
  });
}

export function PhotoGallery(): JSX.Element | null {
  const travelData = useTravelStore((state) => state.travelData);
  const selectedPoint = useTravelStore((state) => state.selectedPoint);
  const isGalleryOpen = useTravelStore((state) => state.isGalleryOpen);
  const toggleGallery = useTravelStore((state) => state.toggleGallery);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentTravelPoint =
    selectedPoint !== null ? travelData[selectedPoint] : null;

  const photos = React.useMemo(() => {
    if (!currentTravelPoint) return [];
    
    const photoUrls: string[] = [currentTravelPoint.photoUrl];
    
    for (let i = 1; i < 5; i++) {
      const url = new URL(currentTravelPoint.photoUrl);
      url.searchParams.set('v', String(i));
      photoUrls.push(url.toString());
    }
    
    return photoUrls;
  }, [currentTravelPoint]);

  useEffect(() => {
    if (isGalleryOpen && photos.length > 0) {
      setCurrentIndex(0);
      loadImageWithConcurrency(photos[0])
        .then(() => {
          setLoadedImages((prev) => new Set([...prev, photos[0]]));
        })
        .catch(() => {});
    }
  }, [isGalleryOpen, photos]);

  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    const nextIndex = (currentIndex + 1) % photos.length;
    setCurrentIndex(nextIndex);

    if (!loadedImages.has(photos[nextIndex])) {
      loadImageWithConcurrency(photos[nextIndex])
        .then(() => {
          setLoadedImages((prev) => new Set([...prev, photos[nextIndex]]));
        })
        .catch(() => {});
    }

    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentIndex, photos, loadedImages, isTransitioning]);

  const goToPrev = useCallback(() => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
    setCurrentIndex(prevIndex);

    if (!loadedImages.has(photos[prevIndex])) {
      loadImageWithConcurrency(photos[prevIndex])
        .then(() => {
          setLoadedImages((prev) => new Set([...prev, photos[prevIndex]]));
        })
        .catch(() => {});
    }

    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentIndex, photos, loadedImages, isTransitioning]);

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning || index === currentIndex) return;
      
      setIsTransitioning(true);
      setCurrentIndex(index);

      if (!loadedImages.has(photos[index])) {
        loadImageWithConcurrency(photos[index])
          .then(() => {
            setLoadedImages((prev) => new Set([...prev, photos[index]]));
          })
          .catch(() => {});
      }

      setTimeout(() => setIsTransitioning(false), 300);
    },
    [currentIndex, photos, loadedImages, isTransitioning]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isGalleryOpen) return;
      
      if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'Escape') {
        toggleGallery();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGalleryOpen, goToNext, goToPrev, toggleGallery]);

  if (!isGalleryOpen || !currentTravelPoint) {
    return null;
  }

  return (
    <div className="gallery-overlay">
      <div className="gallery-panel">
        <div className="gallery-header">
          <div className="gallery-title">
            <h3>照片画廊</h3>
            <span>{currentTravelPoint.date}</span>
          </div>
          <button
            className="gallery-close"
            onClick={toggleGallery}
            aria-label="关闭"
          >
            <X size={24} />
          </button>
        </div>

        <div className="gallery-content">
          <div className="gallery-main">
            <button
              className="gallery-nav prev"
              onClick={goToPrev}
              aria-label="上一张"
            >
              <ChevronLeft size={32} />
            </button>

            <div className="gallery-image-container">
              <div
                className="gallery-track"
                style={{
                  transform: `translateX(-${currentIndex * 100}%)`,
                  transition: isTransitioning
                    ? 'transform 0.3s ease-in-out'
                    : 'none',
                }}
              >
                {photos.map((photo, index) => (
                  <div key={index} className="gallery-slide">
                    {!loadedImages.has(photo) ? (
                      <div className="gallery-skeleton">
                        <div className="spinner" />
                      </div>
                    ) : (
                      <img
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="gallery-image"
                        loading="lazy"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              className="gallery-nav next"
              onClick={goToNext}
              aria-label="下一张"
            >
              <ChevronRight size={32} />
            </button>
          </div>

          <div className="gallery-dots">
            {photos.map((_, index) => (
              <button
                key={index}
                className={`gallery-dot ${
                  index === currentIndex ? 'active' : ''
                }`}
                onClick={() => goToSlide(index)}
                aria-label={`跳转到第 ${index + 1} 张`}
              />
            ))}
          </div>

          <div className="gallery-info">
            <div className="gallery-note">
              <h4>旅行笔记</h4>
              <p>{currentTravelPoint.note}</p>
            </div>
            <div className="gallery-coords">
              <span>
                📍 {currentTravelPoint.lat.toFixed(4)},{' '}
                {currentTravelPoint.lng.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
