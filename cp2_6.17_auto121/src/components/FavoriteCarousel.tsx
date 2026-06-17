import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import type { Recipe } from '@/types';
import { useNavigate } from 'react-router-dom';

interface FavoriteCarouselProps {
  favorites: Recipe[];
}

const FavoriteCarousel: React.FC<FavoriteCarouselProps> = ({ favorites }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState);
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      observer.disconnect();
    };
  }, [favorites, updateScrollState]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const scrollAmount = 260;
    let target = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
    const maxScroll = scrollWidth - clientWidth;
    if (target < 0) target = 0;
    if (target > maxScroll) target = maxScroll;
    scrollRef.current.scrollTo({ left: target, behavior: 'smooth' });
  };

  if (favorites.length === 0) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Heart size={20} fill="#ef4444" color="#ef4444" />
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937' }}>我的收藏</h2>
        <span style={{ fontSize: 14, color: '#9ca3af' }}>({favorites.length})</span>
      </div>

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          style={{
            position: 'absolute',
            left: -12,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: canScrollLeft ? '#fff' : '#f9fafb',
            border: '1px solid #e5e7eb',
            boxShadow: canScrollLeft ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canScrollLeft ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            color: canScrollLeft ? '#374151' : '#d1d5db',
            opacity: canScrollLeft ? 1 : 0.5,
          }}
          onMouseEnter={e => {
            if (canScrollLeft) {
              (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-50%) scale(1.1)';
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = canScrollLeft ? '#fff' : '#f9fafb';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-50%) scale(1)';
          }}
        >
          <ChevronLeft size={18} />
        </button>

        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            padding: '8px 8px 16px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#e5e7eb transparent',
          }}
        >
          {favorites.map(recipe => (
            <div
              key={recipe.id}
              onClick={() => navigate(`/recipe/${recipe.id}`)}
              style={{
                flexShrink: 0,
                width: 200,
                borderRadius: 16,
                background: '#fff',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.25s ease-out',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <img
                src={recipe.image}
                alt={recipe.title}
                style={{ width: '100%', height: 120, objectFit: 'cover' }}
                loading="lazy"
              />
              <div style={{ padding: 12 }}>
                <h4
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#1f2937',
                    marginBottom: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {recipe.title}
                </h4>
                <span style={{ fontSize: 12, color: '#6b7280' }}>⏱ {recipe.cookingTime} 分钟</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          style={{
            position: 'absolute',
            right: -12,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: canScrollRight ? '#fff' : '#f9fafb',
            border: '1px solid #e5e7eb',
            boxShadow: canScrollRight ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canScrollRight ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            color: canScrollRight ? '#374151' : '#d1d5db',
            opacity: canScrollRight ? 1 : 0.5,
          }}
          onMouseEnter={e => {
            if (canScrollRight) {
              (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-50%) scale(1.1)';
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = canScrollRight ? '#fff' : '#f9fafb';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-50%) scale(1)';
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default FavoriteCarousel;
