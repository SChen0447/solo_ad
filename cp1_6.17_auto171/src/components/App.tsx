import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PaintingModal } from './PaintingModal';
import { SceneManager } from '../scene/SceneManager';
import { dataService, type GalleryData, type Painting, type Exhibition } from '../services/dataService';

interface AppProps {
  onSceneReady?: (sceneManager: SceneManager) => void;
}

export const App: React.FC<AppProps> = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const [galleryData, setGalleryData] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPainting, setSelectedPainting] = useState<Painting | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentExhibitionId, setCurrentExhibitionId] = useState<string>('renaissance');
  const [filterAuthor, setFilterAuthor] = useState<string>('all');
  const [filterStartYear, setFilterStartYear] = useState<number>(1400);
  const [filterEndYear, setFilterEndYear] = useState<number>(2000);
  const [isMobile, setIsMobile] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [fps, setFps] = useState(60);
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await dataService.getGalleryData();
        setGalleryData(data);
        if (data.exhibitions.length > 0) {
          setCurrentExhibitionId(data.exhibitions[0].id);
        }
        const yearRange = dataService.getYearRange(data);
        setFilterStartYear(yearRange.min);
        setFilterEndYear(yearRange.max);
        setLoading(false);
      } catch (error) {
        console.error('加载画廊数据失败:', error);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handlePaintingClick = useCallback((painting: Painting) => {
    setSelectedPainting(painting);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleExhibitionChange = useCallback((exhibitionId: string) => {
    setCurrentExhibitionId(exhibitionId);
    dataService.emitExhibitionChange(exhibitionId);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setCurrentExhibition(exhibitionId);
    }
  }, []);

  const handleFilterChange = useCallback(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.applyFilters({
        author: filterAuthor,
        startYear: filterStartYear,
        endYear: filterEndYear
      });
    }
  }, [filterAuthor, filterStartYear, filterEndYear]);

  useEffect(() => {
    if (galleryData && canvasContainerRef.current && !isMobile && !sceneManagerRef.current) {
      const container = canvasContainerRef.current;
      sceneManagerRef.current = new SceneManager(container, {
        paintings: galleryData.paintings,
        exhibitions: galleryData.exhibitions,
        onPaintingClick: handlePaintingClick,
        onExhibitionChange: handleExhibitionChange,
        onFpsUpdate: (newFps) => setFps(newFps)
      });

      return () => {
        if (sceneManagerRef.current) {
          sceneManagerRef.current.dispose();
          sceneManagerRef.current = null;
        }
      };
    }
  }, [galleryData, isMobile, handlePaintingClick, handleExhibitionChange]);

  useEffect(() => {
    handleFilterChange();
  }, [filterAuthor, filterStartYear, filterEndYear, handleFilterChange]);

  const getFilteredPaintings = useCallback(() => {
    if (!galleryData) return [];
    let paintings = galleryData.paintings.filter(p => p.exhibitionId === currentExhibitionId);
    if (filterAuthor !== 'all') {
      paintings = paintings.filter(p => p.author === filterAuthor);
    }
    paintings = paintings.filter(p => p.year >= filterStartYear && p.year <= filterEndYear);
    return paintings;
  }, [galleryData, currentExhibitionId, filterAuthor, filterStartYear, filterEndYear]);

  const getCurrentExhibition = useCallback((): Exhibition | undefined => {
    return galleryData?.exhibitions.find(e => e.id === currentExhibitionId);
  }, [galleryData, currentExhibitionId]);

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1A1A1A',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#D4A017',
          fontFamily: '"Georgia", serif'
        }}
      >
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div
          style={{
            width: '60px',
            height: '60px',
            border: '4px solid #3E2723',
            borderTop: '4px solid #D4A017',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }}
        />
        <div style={{ fontSize: '24px', letterSpacing: '3px' }}>古典油画虚拟画廊</div>
        <div style={{ fontSize: '14px', color: '#A08060', marginTop: '10px' }}>正在加载艺术珍品...</div>
      </div>
    );
  }

  const currentExhibition = getCurrentExhibition();
  const authors = galleryData ? dataService.getAllAuthors(galleryData) : [];
  const yearRange = galleryData ? dataService.getYearRange(galleryData) : { min: 1400, max: 2000 };
  const filteredPaintings = getFilteredPaintings();

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes pulseGold {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {!isMobile && (
        <div
          ref={canvasContainerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        />
      )}

      {isMobile && (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#1A1A1A',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            style={{
              padding: '16px',
              backgroundColor: '#3E2723',
              borderBottom: '3px solid #D4A017',
              textAlign: 'center'
            }}
          >
            <h1 style={{ color: '#D4A017', fontSize: '20px', margin: 0, fontFamily: '"Georgia", serif' }}>
              古典油画虚拟画廊
            </h1>
          </div>

          <div
            style={{
              display: 'flex',
              overflowX: 'auto',
              padding: '12px',
              gap: '8px',
              backgroundColor: '#2A1810',
              borderBottom: '1px solid #D4A017'
            }}
          >
            {galleryData?.exhibitions.map(exh => (
              <button
                key={exh.id}
                onClick={() => handleExhibitionChange(exh.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: currentExhibitionId === exh.id ? '2px solid #D4A017' : '1px solid #5D4037',
                  backgroundColor: currentExhibitionId === exh.id ? 'rgba(212, 160, 23, 0.2)' : '#3E2723',
                  color: currentExhibitionId === exh.id ? '#D4A017' : '#A08060',
                  fontWeight: currentExhibitionId === exh.id ? 'bold' : 'normal',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontFamily: '"Georgia", serif'
                }}
              >
                {exh.name}
              </button>
            ))}
          </div>

          <div
            ref={mobileScrollRef}
            style={{
              flex: 1,
              overflowX: 'auto',
              overflowY: 'hidden',
              display: 'flex',
              padding: '20px',
              gap: '20px',
              alignItems: 'center',
              scrollSnapType: 'x mandatory'
            }}
          >
            {filteredPaintings.map(painting => (
              <div
                key={painting.id}
                onClick={() => handlePaintingClick(painting)}
                style={{
                  flex: '0 0 auto',
                  scrollSnapAlign: 'center',
                  border: '6px solid #D4A017',
                  borderRadius: '2px',
                  boxShadow: '0 0 30px rgba(212, 160, 23, 0.3)',
                  cursor: 'pointer',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  backgroundColor: '#000'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 0 50px rgba(212, 160, 23, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(212, 160, 23, 0.3)';
                }}
              >
                <img
                  src={painting.thumbnailUrl}
                  alt={painting.title}
                  style={{
                    width: '260px',
                    height: '320px',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: '#3E2723',
                    color: '#F5E6D3',
                    fontFamily: '"Georgia", serif'
                  }}
                >
                  <div style={{ color: '#D4A017', fontWeight: 'bold', fontSize: '16px' }}>
                    {painting.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#A08060', marginTop: '4px' }}>
                    {painting.author} · {painting.year}年
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isMobile && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '20px 30px',
              background: 'linear-gradient(to bottom, rgba(30, 15, 10, 0.9), transparent)',
              zIndex: 100,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              pointerEvents: 'none'
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  color: '#D4A017',
                  fontSize: '28px',
                  fontFamily: '"Georgia", serif',
                  letterSpacing: '3px',
                  textShadow: '0 0 20px rgba(212, 160, 23, 0.5)'
                }}
              >
                ✦ 古典油画虚拟画廊 ✦
              </h1>
              <div style={{ color: '#A08060', fontSize: '14px', marginTop: '6px' }}>
                CLASSICAL ART VIRTUAL GALLERY
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', pointerEvents: 'auto' }}>
              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '4px',
                  border: '2px solid #D4A017',
                  backgroundColor: 'rgba(62, 39, 35, 0.9)',
                  color: '#D4A017',
                  fontFamily: '"Georgia", serif',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  fontWeight: 'bold'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#D4A017';
                  e.currentTarget.style.color = '#3E2723';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(62, 39, 35, 0.9)';
                  e.currentTarget.style.color = '#D4A017';
                }}
              >
                ⚙ 筛选作品
              </button>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: '16px 30px',
              background: 'linear-gradient(to top, rgba(30, 15, 10, 0.9), transparent)',
              zIndex: 100,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end'
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}
            >
              {galleryData?.exhibitions.map(exh => (
                <button
                  key={exh.id}
                  onClick={() => {
                    handleExhibitionChange(exh.id);
                    if (sceneManagerRef.current) {
                      sceneManagerRef.current.teleportToExhibition(exh.id);
                    }
                  }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '4px',
                    border: currentExhibitionId === exh.id ? '2px solid #D4A017' : '1px solid #5D4037',
                    backgroundColor: currentExhibitionId === exh.id ? 'rgba(212, 160, 23, 0.2)' : 'rgba(62, 39, 35, 0.8)',
                    color: currentExhibitionId === exh.id ? '#D4A017' : '#A08060',
                    fontFamily: '"Georgia", serif',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    fontWeight: currentExhibitionId === exh.id ? 'bold' : 'normal'
                  }}
                  onMouseEnter={(e) => {
                    if (currentExhibitionId !== exh.id) {
                      e.currentTarget.style.color = '#D4A017';
                      e.currentTarget.style.borderColor = '#D4A017';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentExhibitionId !== exh.id) {
                      e.currentTarget.style.color = '#A08060';
                      e.currentTarget.style.borderColor = '#5D4037';
                    }
                  }}
                >
                  {exh.name}
                </button>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                color: '#A08060',
                fontFamily: '"Georgia", serif',
                fontSize: '13px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>FPS:</span>
                <span style={{ color: fps >= 30 ? '#4CAF50' : '#F44336', fontWeight: 'bold' }}>
                  {fps.toFixed(0)}
                </span>
              </div>
              <div>|</div>
              <div>
                <span style={{ color: '#D4A017', fontWeight: 'bold' }}>WASD</span> 移动 · 
                <span style={{ color: '#D4A017', fontWeight: 'bold', marginLeft: '4px' }}>鼠标拖拽</span> 转向 · 
                <span style={{ color: '#D4A017', fontWeight: 'bold', marginLeft: '4px' }}>点击画作</span> 查看详情
              </div>
            </div>
          </div>

          {isFilterPanelOpen && (
            <div
              style={{
                position: 'absolute',
                top: '90px',
                right: '30px',
                width: '340px',
                backgroundColor: 'rgba(30, 15, 10, 0.95)',
                border: '2px solid #D4A017',
                borderRadius: '8px',
                padding: '24px',
                zIndex: 200,
                fontFamily: '"Georgia", serif',
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(212, 160, 23, 0.3)'
              }}
            >
              <div
                style={{
                  color: '#D4A017',
                  fontSize: '20px',
                  marginBottom: '20px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #D4A017',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>筛选条件</span>
                <button
                  onClick={() => setIsFilterPanelOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#A08060',
                    fontSize: '20px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#A08060', marginBottom: '8px', fontSize: '14px' }}>
                  按作者筛选
                </label>
                <select
                  value={filterAuthor}
                  onChange={(e) => setFilterAuthor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#3E2723',
                    border: '1px solid #D4A017',
                    borderRadius: '4px',
                    color: '#F5E6D3',
                    fontFamily: '"Georgia", serif',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">全部作者</option>
                  {authors.map(author => (
                    <option key={author} value={author}>{author}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#A08060', marginBottom: '8px', fontSize: '14px' }}>
                  年代范围：{filterStartYear}年 - {filterEndYear}年
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="range"
                    min={yearRange.min}
                    max={yearRange.max}
                    value={filterStartYear}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFilterStartYear(Math.min(val, filterEndYear));
                    }}
                    style={{ flex: 1, accentColor: '#D4A017' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
                  <input
                    type="range"
                    min={yearRange.min}
                    max={yearRange.max}
                    value={filterEndYear}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFilterEndYear(Math.max(val, filterStartYear));
                    }}
                    style={{ flex: 1, accentColor: '#D4A017' }}
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setFilterAuthor('all');
                  setFilterStartYear(yearRange.min);
                  setFilterEndYear(yearRange.max);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  border: '1px solid #D4A017',
                  borderRadius: '4px',
                  color: '#D4A017',
                  fontFamily: '"Georgia", serif',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(212, 160, 23, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                重置筛选条件
              </button>

              <div
                style={{
                  marginTop: '20px',
                  paddingTop: '16px',
                  borderTop: '1px solid #5D4037',
                  color: '#A08060',
                  fontSize: '13px'
                }}
              >
                当前筛选结果：<span style={{ color: '#D4A017', fontWeight: 'bold' }}>{filteredPaintings.length}</span> 幅作品
              </div>
            </div>
          )}
        </>
      )}

      <PaintingModal
        painting={selectedPainting}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};
