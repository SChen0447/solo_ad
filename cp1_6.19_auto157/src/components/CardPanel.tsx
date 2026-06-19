import React, { useState, useEffect, useRef } from 'react';
import { HistoryEvent, formatYear, CIVILIZATION_COLORS } from '../engine/TimelineEngine';

interface CardPanelProps {
  selectedEvent: HistoryEvent | null;
  onClose: () => void;
}

const CardPanel: React.FC<CardPanelProps> = ({ selectedEvent, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width <= 1200);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      setImageError(false);
      setImageLoaded(false);
      animationFrameRef.current = requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedEvent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedEvent) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEvent, onClose]);

  if (!selectedEvent) return null;

  const civilizationColor = CIVILIZATION_COLORS[selectedEvent.civilization] || '#888888';

  const getPanelStyle = (): React.CSSProperties => {
    if (isMobile) {
      return {
        position: 'fixed',
        top: isVisible ? '0' : '100%',
        left: '0',
        width: '100%',
        height: '100%',
        zIndex: 1000,
        transition: 'top 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      };
    }

    const width = isTablet ? '60%' : '40%';

    return {
      position: 'fixed',
      top: '0',
      right: isVisible ? '0' : `-${width}`,
      width,
      height: '100%',
      zIndex: 1000,
      transition: 'right 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    };
  };

  const getOverlayStyle = (): React.CSSProperties => {
    return {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      opacity: isVisible ? 1 : 0,
      pointerEvents: isVisible ? 'auto' : 'none',
      transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 999
    };
  };

  const getInnerStyle = (): React.CSSProperties => {
    return {
      width: '100%',
      height: '100%',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderLeft: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
      borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
      boxShadow: isMobile
        ? '0 -4px 30px rgba(0, 0, 0, 0.5)'
        : '-4px 0 30px rgba(0, 0, 0, 0.5)',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      padding: isMobile ? '60px 20px 30px' : '30px'
    };
  };

  const getImageContainerStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
      background: imageError || !imageLoaded
        ? `linear-gradient(135deg, ${civilizationColor}30 0%, ${civilizationColor}10 100%)`
        : 'transparent',
      position: 'relative',
      flexShrink: 0
    };

    if (isMobile) {
      return {
        ...base,
        width: '100%',
        height: '220px',
        marginBottom: '24px'
      };
    }

    return {
      ...base,
      width: '45%',
      marginRight: '24px',
      minHeight: '300px',
      maxHeight: '450px'
    };
  };

  const getContentStyle = (): React.CSSProperties => {
    return {
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      minWidth: isMobile ? 'auto' : '0'
    };
  };

  const truncatedDescription = selectedEvent.description.length > 200
    ? selectedEvent.description.slice(0, 200) + '...'
    : selectedEvent.description;

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <>
      <div
        style={getOverlayStyle()}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        style={getPanelStyle()}
      >
        <div style={getInnerStyle()}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#e0e0e0',
              fontSize: '22px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 10,
              lineHeight: 1
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(231, 76, 60, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(231, 76, 60, 0.5)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ✕
          </button>

          <div style={getImageContainerStyle()}>
            {!imageError ? (
              <>
                {!imageLoaded && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: civilizationColor,
                      fontSize: '48px',
                      opacity: 0.6
                    }}
                  >
                    📜
                  </div>
                )}
                <img
                  src={selectedEvent.image}
                  alt={selectedEvent.name}
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: imageLoaded ? 1 : 0,
                    transition: 'opacity 0.5s ease'
                  }}
                />
              </>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${civilizationColor}40 0%, ${civilizationColor}15 50%, ${civilizationColor}30 100%)`,
                  color: civilizationColor,
                  fontSize: isMobile ? '64px' : '80px'
                }}
              >
                {selectedEvent.civilization === '埃及' && '🏛️'}
                {selectedEvent.civilization === '希腊' && '🏺'}
                {selectedEvent.civilization === '罗马' && '⚔️'}
                {selectedEvent.civilization === '中国' && '🏯'}
                {selectedEvent.civilization === '伊斯兰' && '🕌'}
                {selectedEvent.civilization === '欧洲' && '🏰'}
                {!['埃及', '希腊', '罗马', '中国', '伊斯兰', '欧洲'].includes(selectedEvent.civilization) && '📜'}
              </div>
            )}
          </div>

          <div style={getContentStyle()}>
            <div
              style={{
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: '20px',
                background: `${civilizationColor}25`,
                border: `1px solid ${civilizationColor}50`,
                color: civilizationColor,
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '16px',
                alignSelf: isMobile ? 'flex-start' : 'flex-start',
                letterSpacing: '0.5px'
              }}
            >
              {selectedEvent.civilization} · {selectedEvent.category}
            </div>

            <h2
              style={{
                fontSize: isMobile ? '24px' : '28px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '12px',
                lineHeight: '1.3',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)'
              }}
            >
              {selectedEvent.name}
            </h2>

            <div
              style={{
                fontSize: isMobile ? '15px' : '16px',
                color: civilizationColor,
                fontWeight: '600',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '4px',
                  height: '18px',
                  background: civilizationColor,
                  borderRadius: '2px'
                }}
              />
              {formatYear(selectedEvent.year)}
            </div>

            <div
              style={{
                width: '100%',
                height: '1px',
                background: `linear-gradient(90deg, ${civilizationColor}50, transparent)`,
                marginBottom: '20px'
              }}
            />

            <p
              style={{
                fontSize: isMobile ? '14px' : '15px',
                lineHeight: '1.8',
                color: 'rgba(224, 224, 224, 0.85)',
                flex: isMobile ? 'none' : '1',
                marginBottom: isMobile ? '30px' : 'auto'
              }}
            >
              {truncatedDescription}
            </p>

            {selectedEvent.description.length > 200 && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(224, 224, 224, 0.4)',
                  marginTop: '-20px',
                  marginBottom: '20px',
                  fontStyle: 'italic'
                }}
              >
                （内容已精简，完整 {selectedEvent.description.length} 字）
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginTop: isMobile ? 'auto' : '20px',
                flexWrap: 'wrap'
              }}
            >
              <div
                style={{
                  flex: '1',
                  minWidth: isMobile ? '100%' : '120px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: `${civilizationColor}15`,
                  border: `1px solid ${civilizationColor}30`,
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'rgba(224, 224, 224, 0.5)',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                >
                  文明
                </div>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: civilizationColor
                  }}
                >
                  {selectedEvent.civilization}
                </div>
              </div>

              <div
                style={{
                  flex: '1',
                  minWidth: isMobile ? '100%' : '120px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'rgba(100, 180, 255, 0.1)',
                  border: '1px solid rgba(100, 180, 255, 0.25)',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'rgba(224, 224, 224, 0.5)',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                >
                  分类
                </div>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#64b4ff'
                  }}
                >
                  {selectedEvent.category}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CardPanel;
