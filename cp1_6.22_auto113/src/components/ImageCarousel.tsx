import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  autoPlay?: boolean;
  interval?: number;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  autoPlay = false,
  interval = 5000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (autoPlay && images.length > 1) {
      const timer = setInterval(goToNext, interval);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [autoPlay, interval, images.length, goToNext]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  if (images.length === 0) {
    return (
      <div className="carousel-container">
        <div className="flex items-center justify-center h-full text-gray-400">
          暂无图片
        </div>
      </div>
    );
  }

  return (
    <div className="carousel-container">
      {images.map((image, index) => (
        <div
          key={index}
          className={`carousel-slide ${index === currentIndex ? 'active' : ''}`}
        >
          <img
            src={image}
            alt={`图片 ${index + 1}`}
            loading="lazy"
          />
        </div>
      ))}

      {images.length > 1 && (
        <>
          <button
            className="carousel-arrow prev"
            onClick={goToPrevious}
            aria-label="上一张"
          >
            <ChevronLeft size={24} color="#374151" />
          </button>
          <button
            className="carousel-arrow next"
            onClick={goToNext}
            aria-label="下一张"
          >
            <ChevronRight size={24} color="#374151" />
          </button>

          <div className="carousel-dots">
            {images.map((_, index) => (
              <button
                key={index}
                className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`跳转到第 ${index + 1} 张`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageCarousel;
