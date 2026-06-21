import { useEffect, useRef, useState } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderQuality?: number;
}

export default function LazyImage({ src, alt, className = '', placeholderQuality = 20 }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  const placeholderSrc = src.includes('?') 
    ? `${src}&w=${placeholderQuality}` 
    : `${src}?w=${placeholderQuality}`;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={`lazy-image ${isLoaded ? 'loaded' : ''} ${className}`}>
      <img
        src={placeholderSrc}
        alt=""
        className="lazy-image-placeholder"
        aria-hidden="true"
      />
      {isInView && (
        <img
          src={src}
          alt={alt}
          className="lazy-image-real"
          onLoad={() => setIsLoaded(true)}
        />
      )}
    </div>
  );
}
