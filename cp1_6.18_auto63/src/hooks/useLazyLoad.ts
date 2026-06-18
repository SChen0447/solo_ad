import { useEffect, useRef, useState } from 'react';

interface UseLazyLoadReturn {
  ref: React.RefObject<HTMLDivElement>;
  isVisible: boolean;
}

export const useLazyLoad = (threshold = 0.1): UseLazyLoadReturn => {
  const ref = useRef<HTMLDivElement>(null!);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin: '50px' }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold]);

  return { ref, isVisible };
};
