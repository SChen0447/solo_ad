import { useState, useEffect, useRef } from 'react';
import type { Bean } from '../types';
import './BeanCard.scss';

interface BeanCardProps {
  bean: Bean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const flavorColors: Record<string, string> = {
  '花香': '#FFB74D',
  '果酸': '#E57373',
  '巧克力': '#8D6E63',
  '坚果': '#A1887F',
  '焦糖': '#FFCC80',
  '柑橘': '#FFAB91',
  '浆果': '#F48FB1',
  '草本': '#A5D6A7',
  '香料': '#CE93D8',
  '酒香': '#9FA8DA',
};

function StarRating({ rating }: { rating: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const fillPercent = Math.min(Math.max(rating - (i - 1), 0), 1) * 100;
    stars.push(
      <span key={i} className="star">
        <span className="star__bg">★</span>
        <span className="star__fill" style={{ width: `${fillPercent}%` }}>★</span>
      </span>
    );
  }
  return <div className="star-rating">{stars}</div>;
}

function BeanCard({ bean, onClick, style }: BeanCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const getThumbImageUrl = () => {
    if (bean.thumb_image) return bean.thumb_image;
    return bean.image.includes('?')
      ? `${bean.image}&thumb=true&w=100`
      : `${bean.image}?thumb=true&w=100`;
  };

  const handleFlavorClick = (e: React.MouseEvent, flavor: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipple({ x, y, id: Date.now() });
    setTimeout(() => setRipple(null), 600);
    console.log('Flavor tag clicked:', flavor);
  };

  return (
    <div className="bean-card" ref={cardRef} onClick={onClick} style={style}>
      <div className="bean-card__image-wrapper">
        <img
          src={getThumbImageUrl()}
          alt={`${bean.name} 缩略图`}
          className={`bean-card__image bean-card__image--thumb ${thumbLoaded ? 'bean-card__image--loaded' : ''} ${imageLoaded ? 'bean-card__image--fading' : ''}`}
          onLoad={() => setThumbLoaded(true)}
          loading="lazy"
        />
        {isVisible && (
          <img
            src={bean.image}
            alt={bean.name}
            className={`bean-card__image bean-card__image--main ${imageLoaded ? 'bean-card__image--loaded' : ''}`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />
        )}
        <div className="bean-card__price">¥{bean.price}</div>
      </div>

      <div className="bean-card__content">
        <h3 className="bean-card__name">{bean.name}</h3>
        
        <div className="bean-card__origin">
          <span className="bean-card__origin-icon">📍</span>
          <span>{bean.origin}</span>
          <span className="bean-card__process">{bean.process}</span>
        </div>

        <div className="bean-card__flavors">
          {bean.flavor_tags.slice(0, 4).map((flavor) => (
            <span
              key={flavor}
              className="flavor-tag"
              style={{ backgroundColor: flavorColors[flavor] || '#BCAAA4' }}
              onClick={(e) => handleFlavorClick(e, flavor)}
            >
              {flavor}
              {ripple && (
                <span
                  key={ripple.id}
                  className="flavor-tag__ripple"
                  style={{ left: ripple.x, top: ripple.y }}
                />
              )}
            </span>
          ))}
        </div>

        <div className="bean-card__rating">
          <StarRating rating={bean.avg_rating} />
          <span className="bean-card__rating-text">{bean.avg_rating.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

export default BeanCard;
