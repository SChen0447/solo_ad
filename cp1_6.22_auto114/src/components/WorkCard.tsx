import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Work } from '../types';
import '../styles/WorkCard.css';

interface WorkCardProps {
  work: Work;
}

const WorkCard: React.FC<WorkCardProps> = ({ work }) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
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
      { rootMargin: '200px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleClick = () => {
    navigate(`/works/${work.id}`);
  };

  return (
    <div className="work-card" onClick={handleClick}>
      <div
        className={`work-card-image ${imageLoaded ? 'loaded' : ''}`}
        ref={imgRef}
      >
        {!imageLoaded && <div className="image-placeholder" />}
        {isVisible && (
          <img
            src={work.thumbnail}
            alt={work.title}
            width={160}
            height={160}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
          />
        )}
      </div>
      <div className="work-card-content">
        <h3 className="work-card-title">{work.title}</h3>
        <p className="work-card-price">¥{work.price}</p>
        <span className="work-card-duration">制作周期: {work.productionDays}天</span>
      </div>
    </div>
  );
};

export default WorkCard;
