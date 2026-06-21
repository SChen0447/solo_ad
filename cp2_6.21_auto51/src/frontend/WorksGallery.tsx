import { useState, useEffect, useRef, useCallback } from 'react';
import type { Work, MaterialRecommendation, ComboItem } from '../shared/types';
import { getRecommendations } from './RecommendationEngine';

interface WorksGalleryProps {
  works: Work[];
  selectedWorkId: string | null;
  onSelectWork: (id: string | null) => void;
  onBookMaterial: (pack: MaterialRecommendation) => void;
  onRecordView: (work: Work) => void;
  activeFilters: string[];
  comboItemIds: string[];
  onAddToCombo: (pack: MaterialRecommendation) => void;
  onOneClickCombo: (packs: MaterialRecommendation[]) => void;
}

const TAG_COLOR_MAP: Record<string, string> = {
  植鞣革: 'veg-tanned',
  十字纹: 'veg-tanned',
  原色: 'veg-tanned',
  铬鞣革: 'chrome-tanned',
  编织: 'braided',
};

function getTagClass(tag: string): string {
  const cls = TAG_COLOR_MAP[tag];
  return cls ? `tag-pill ${cls}` : 'tag-pill';
}

function createRipple(e: React.MouseEvent) {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const ripple = document.createElement('span');
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  ripple.className = 'ripple';
  target.appendChild(ripple);
  setTimeout(() => ripple.remove(), 400);
}

interface InertiaScrollProps {
  children: React.ReactNode;
}

function InertiaScroll({ children }: InertiaScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const velocity = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const animFrame = useRef<number | null>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    isDown.current = true;
    const el = scrollRef.current;
    if (!el) return;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeft.current = el.scrollLeft;
    lastX.current = e.pageX;
    lastTime.current = performance.now();
    velocity.current = 0;
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
  };

  const onMouseLeave = () => {
    if (!isDown.current) return;
    isDown.current = false;
    startInertia();
  };

  const onMouseUp = () => {
    if (!isDown.current) return;
    isDown.current = false;
    startInertia();
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX.current) * 1.2;
    el.scrollLeft = scrollLeft.current - walk;

    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (e.pageX - lastX.current) / dt;
    }
    lastX.current = e.pageX;
    lastTime.current = now;
  };

  const startInertia = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    let v = velocity.current * 0.6;
    const friction = 0.3;

    const tick = () => {
      if (Math.abs(v) < 0.05) return;
      el.scrollLeft -= v * 16;
      v *= 1 - friction;
      animFrame.current = requestAnimationFrame(tick);
    };
    animFrame.current = requestAnimationFrame(tick);
  }, []);

  return (
    <div
      ref={scrollRef}
      className="recommendation-scroll"
      onMouseDown={onMouseDown}
      onMouseLeave={onMouseLeave}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
    >
      {children}
    </div>
  );
}

export default function WorksGallery({
  works,
  selectedWorkId,
  onSelectWork,
  onBookMaterial,
  onRecordView,
  activeFilters,
  comboItemIds,
  onAddToCombo,
  onOneClickCombo,
}: WorksGalleryProps) {
  const [recommendations, setRecommendations] = useState<MaterialRecommendation[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});

  const selectedWork = works.find((w) => w.id === selectedWorkId) || null;

  const filteredWorks =
    activeFilters.length === 0
      ? works
      : works.filter((w) => w.tags.some((t) => activeFilters.includes(t)));

  useEffect(() => {
    if (selectedWork) {
      onRecordView(selectedWork);
    }
  }, [selectedWork, onRecordView]);

  const handleShowRecommendations = async (e: React.MouseEvent) => {
    createRipple(e);
    if (!selectedWork) return;
    setShowRecommendations(true);
    setRecommendations([]);
    const recs = await getRecommendations(selectedWork.id, works);
    setRecommendations(recs);
  };

  const handleImageLoad = (id: string) => {
    setImageLoaded((prev) => ({ ...prev, [id]: true }));
  };

  if (selectedWork) {
    return (
      <div className="work-detail-overlay">
        <div className="work-detail-container">
          <button
            className="work-detail-back"
            onClick={(e) => {
              createRipple(e);
              onSelectWork(null);
              setShowRecommendations(false);
              setRecommendations([]);
            }}
          >
            ← 返回作品列表
          </button>

          <div className="work-detail-image">
            {!imageLoaded[selectedWork.id] && (
              <div style={{ width: '100%', height: '100%', background: '#E5E7EB' }} />
            )}
            <img
              src={selectedWork.imageUrl}
              alt={selectedWork.title}
              onLoad={() => handleImageLoad(selectedWork.id)}
              style={{ display: imageLoaded[selectedWork.id] ? 'block' : 'none' }}
            />
          </div>

          <h1 className="work-detail-title">{selectedWork.title}</h1>

          <div className="work-detail-tags">
            {selectedWork.tags.map((tag) => (
              <span key={tag} className={getTagClass(tag)}>
                {tag}
              </span>
            ))}
          </div>

          <p className="work-detail-desc">{selectedWork.description}</p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              className="primary-btn"
              onClick={handleShowRecommendations}
            >
              查看推荐材料包
            </button>
            {showRecommendations && recommendations.length > 0 && (
              <button
                className="one-click-combo-btn"
                onClick={(e) => {
                  createRipple(e);
                  onOneClickCombo(recommendations);
                }}
              >
                ✨ 一键搭配全部推荐
              </button>
            )}
          </div>

          {showRecommendations && (
            <div className="recommendation-section">
              <h2 className="recommendation-title">为您推荐的材料包</h2>
              <InertiaScroll>
                {recommendations.length === 0 && (
                  <div style={{ padding: '20px', color: '#6B7280' }}>加载中...</div>
                )}
                {recommendations.map((pack) => {
                  const isInCombo = comboItemIds.includes(pack.id);
                  return (
                    <div key={pack.id} className="rec-card">
                      <div className="rec-card-header">
                        <div className="rec-card-name">{pack.name}</div>
                        <div className="match-badge">{pack.matchScore}%</div>
                      </div>
                      <div className="rec-card-price">¥{pack.price}</div>
                      <div className="rec-card-components">
                        {pack.components.slice(0, 2).join('、')}...
                      </div>
                      <div className="rec-card-reason">
                        💡 {pack.recommendReason}
                      </div>
                      <div className="rec-card-btn-group">
                        <button
                          className={`rec-card-btn secondary ${isInCombo ? 'added' : ''}`}
                          onClick={(e) => {
                            createRipple(e);
                            onAddToCombo(pack);
                          }}
                        >
                          {isInCombo ? '✓ 已加入' : '+ 搭配'}
                        </button>
                        <button
                          className="rec-card-btn"
                          onClick={(e) => {
                            createRipple(e);
                            onBookMaterial(pack);
                          }}
                        >
                          立即预订
                        </button>
                      </div>
                    </div>
                  );
                })}
              </InertiaScroll>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>精选作品集</h2>
      <div className="works-grid">
        {filteredWorks.map((work, idx) => (
          <div
            key={work.id}
            className="work-card"
            style={{ animationDelay: `${idx * 0.1}s` }}
            onClick={() => onSelectWork(work.id)}
          >
            <div className="work-card-image">
              {!imageLoaded[work.id] && (
                <div style={{ width: '100%', height: '100%', background: '#E5E7EB' }} />
              )}
              <img
                src={work.imageUrl}
                alt={work.title}
                loading="lazy"
                onLoad={() => handleImageLoad(work.id)}
                style={{ display: imageLoaded[work.id] ? 'block' : 'none' }}
              />
            </div>
            <div className="work-card-body">
              <h3 className="work-card-title">{work.title}</h3>
              <p className="work-card-desc">{work.description}</p>
              <div className="work-card-tags">
                {work.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className={getTagClass(tag)}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="work-card-hover-overlay">
              <div className="work-card-hover-title">{work.title}</div>
              <div className="work-card-hover-desc">{work.description}</div>
              <div className="work-card-hover-tags">
                {work.tags.map((tag) => (
                  <span key={tag} className={getTagClass(tag)}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
