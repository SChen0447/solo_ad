import React from 'react';
import { motion } from 'framer-motion';
import { useLazyLoad } from '@/hooks/useLazyLoad';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className = '', style }) => {
  const { ref, isLoaded, setIsLoaded, isInView } = useLazyLoad();

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={style}>
      <div
        className="absolute inset-0 bg-gray-200"
        style={{ backgroundColor: '#e0e0e0' }}
      />
      {isInView && (
        <motion.img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />
      )}
    </div>
  );
};

export default LazyImage;
