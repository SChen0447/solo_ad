import { useEffect, useMemo, useRef, useState } from 'react';
import { usePopupStore } from './PopupManager';
import { tracker } from '../tracker/Tracker';
import type { PopupRule } from '../../shared/types';

function getButtonColor(bgColor: string): string {
  return '#4a90d9';
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function Popup() {
  const { isVisible, activeRuleId, rules, hidePopup, dismissRule } = usePopupStore();
  const [animating, setAnimating] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const activeRule = useMemo((): PopupRule | undefined => {
    return rules.find((r) => r.id === activeRuleId);
  }, [rules, activeRuleId]);

  useEffect(() => {
    if (isVisible && !showContent) {
      setShowContent(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimating(true);
        });
      });
    } else if (!isVisible && showContent) {
      setAnimating(false);
      const t = setTimeout(() => {
        setShowContent(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isVisible, showContent]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isVisible, activeRuleId]);

  const handleClose = () => {
    if (activeRuleId) {
      dismissRule(activeRuleId);
    }
  };

  const handleCTAClick = () => {
    if (activeRuleId) {
      tracker.trackClick(activeRuleId);
    }
    hidePopup();
    if (activeRule?.productLink) {
      setTimeout(() => {
        window.location.href = activeRule.productLink;
      }, 150);
    }
  };

  const bgColor = activeRule?.bgColor || '#f0f4ff';
  const btnColor = getButtonColor(bgColor);

  if (!showContent || !activeRule) {
    return null;
  }

  const slideStyle: React.CSSProperties = {
    transform: animating ? 'translateY(0)' : 'translateY(-100%)',
    opacity: animating ? 1 : 0,
    transition: 'transform 300ms ease-out, opacity 300ms ease-out'
  };

  const overlayStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.4)',
    opacity: animating ? 1 : 0,
    transition: 'opacity 300ms ease-out'
  };

  return (
    <div className="popup-overlay" style={overlayStyle}>
      <div className="popup-wrapper" style={slideStyle} ref={popupRef}>
        <div
          className="popup-card"
          style={{
            backgroundColor: bgColor,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            borderRadius: '12px'
          }}
        >
          <button className="popup-close-btn" onClick={handleClose} aria-label="关闭">
            ×
          </button>

          <div className="popup-content">
            <h2 className="popup-title">{activeRule.title}</h2>
            {activeRule.subtitle && <p className="popup-subtitle">{activeRule.subtitle}</p>}
            <button
              className="popup-cta-btn"
              onClick={handleCTAClick}
              style={{ backgroundColor: btnColor }}
            >
              立即查看
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          pointer-events: auto;
        }

        .popup-wrapper {
          width: 400px;
          min-height: 250px;
        }

        .popup-card {
          position: relative;
          width: 100%;
          min-height: 250px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .popup-close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #ffffff;
          border: none;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 0;
          transition: transform 0.15s ease;
        }

        .popup-close-btn:hover {
          transform: scale(1.1);
        }

        .popup-close-btn:active {
          transform: scale(0.95);
        }

        .popup-content {
          text-align: center;
          width: 100%;
        }

        .popup-title {
          font-size: 22px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 12px 0;
          line-height: 1.3;
        }

        .popup-subtitle {
          font-size: 14px;
          color: #555;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }

        .popup-cta-btn {
          padding: 12px 32px;
          border: none;
          border-radius: 8px;
          color: #ffffff;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: filter 0.2s ease, transform 0.1s ease;
        }

        .popup-cta-btn:hover {
          filter: brightness(1.1);
        }

        .popup-cta-btn:active {
          transform: scale(0.96);
        }

        @media (max-width: 480px) {
          .popup-wrapper {
            width: 86vw;
            min-height: 200px;
          }

          .popup-card {
            min-height: 200px;
            padding: 24px 20px;
          }

          .popup-title {
            font-size: 18px;
          }

          .popup-subtitle {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}

export default Popup;
