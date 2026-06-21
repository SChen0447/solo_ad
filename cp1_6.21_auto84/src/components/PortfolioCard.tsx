import { useState, useRef, useEffect } from 'react';
import '../styles/PortfolioCard.css';

export interface PortfolioItem {
  id: string;
  title: string;
  coverImage: string;
  createdAt: string;
  tools: string[];
  description: string;
  category: 'digital' | 'traditional' | 'mixed';
}

interface PortfolioCardProps {
  item: PortfolioItem;
  onInquiry?: (item: PortfolioItem) => void;
}

const PortfolioCard = ({ item, onInquiry }: PortfolioCardProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'digital':
        return '数字绘画';
      case 'traditional':
        return '传统手绘';
      case 'mixed':
        return '混合媒介';
      default:
        return '';
    }
  };

  return (
    <div className={`portfolio-card card ${item.category}`} ref={imgRef}>
      <div className="card-image-wrapper">
        {isVisible && (
          <img
            src={item.coverImage}
            alt={item.title}
            className={`card-image ${isLoaded ? 'loaded' : ''}`}
            onLoad={() => setIsLoaded(true)}
            loading="lazy"
          />
        )}
        {!isLoaded && <div className="card-image-placeholder" />}
        <div className="card-overlay">
          <div className="card-overlay-content">
            <h3 className="card-title">{item.title}</h3>
            <p className="card-date">{formatDate(item.createdAt)}</p>
          </div>
        </div>
      </div>
      <div className="card-footer">
        <div className="card-tags">
          <span className={`tag tag-category tag-${item.category}`}>
            {getCategoryLabel(item.category)}
          </span>
          {item.tools.slice(0, 2).map((tool, index) => (
            <span key={index} className="tag tag-tool">
              {tool}
            </span>
          ))}
        </div>
        {onInquiry && (
          <button
            className="btn-inquiry"
            onClick={() => onInquiry(item)}
          >
            发起询价
          </button>
        )}
      </div>
    </div>
  );
};

export default PortfolioCard;
