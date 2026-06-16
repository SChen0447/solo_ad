import React, { useState, useEffect, useRef } from 'react';
import { GeneratedImage, getDownloadUrl } from '../services/api';
import { saveAs } from 'file-saver';

interface PreviewPanelProps {
  images: GeneratedImage[];
  selectedImageKey: string | null;
  onSelectImage: (key: string) => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  images,
  selectedImageKey,
  onSelectImage,
}) => {
  const [modalImage, setModalImage] = useState<GeneratedImage | null>(null);
  const [closing, setClosing] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleImageClick = (img: GeneratedImage) => {
    setModalImage(img);
    setClosing(false);
  };

  const handleCloseModal = () => {
    setClosing(true);
    setTimeout(() => {
      setModalImage(null);
      setClosing(false);
    }, 250);
  };

  const handleDownload = async (img: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = img.adjustedUrl || img.url;
    const filename = img.id;
    if (img.adjustedUrl) {
      try {
        const res = await fetch(img.adjustedUrl);
        const blob = await res.blob();
        saveAs(blob, filename);
      } catch {
        saveAs(url, filename);
      }
    } else {
      saveAs(getDownloadUrl(img.id), filename);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalImage && !closing) handleCloseModal();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modalImage, closing]);

  if (images.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3A3A5C, #2D2D44)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '44px',
            opacity: 0.8,
          }}
        >
          🎨
        </div>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#FFFFFF',
              marginBottom: '6px',
            }}
          >
            暂无配图
          </div>
          <div style={{ fontSize: '13px', color: '#B0B0C0', maxWidth: '280px' }}>
            在左侧输入主题文本、选择风格和尺寸后点击生成按钮，即可在此预览生成的社交媒体配图
          </div>
        </div>
      </div>
    );
  }

  const columns = images.length === 1 ? 1 : images.length === 2 ? 2 : 3;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '24px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
            预览对比
          </div>
          <div style={{ fontSize: '12px', color: '#B0B0C0', marginTop: '2px' }}>
            共 {images.length} 张配图 · 点击图片可放大查看 · 选中后可在右侧微调
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '16px',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        {images.map((img, idx) => {
          const isSelected = selectedImageKey === img.id;
          const isHovered = hoveredKey === img.id;
          const aspectRatio = img.width / img.height;
          return (
            <div
              key={img.id}
              onClick={() => onSelectImage(img.id)}
              onMouseEnter={() => setHoveredKey(img.id)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                animation: `slideIn 0.4s ease ${idx * 0.08}s both`,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: `${aspectRatio}`,
                  background: '#3A3A5C',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out',
                  border: isSelected ? '2px solid #00B4D8' : '2px solid transparent',
                  transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: isHovered
                    ? '0 8px 24px rgba(0,0,0,0.4), 0 0 0 2px rgba(0,180,216,0.3)'
                    : isSelected
                    ? '0 0 0 2px rgba(0,180,216,0.3)'
                    : '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                <img
                  src={img.adjustedUrl || img.url}
                  alt={img.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'opacity 0.2s ease',
                  }}
                  draggable={false}
                />
                <div
                  onClick={(e) => handleImageClick(img)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    cursor: 'zoom-in',
                    backdropFilter: 'blur(6px)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                  }}
                  title="放大查看"
                >
                  🔍
                </div>
                <button
                  onClick={(e) => handleDownload(img, e)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.55)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    cursor: 'pointer',
                    backdropFilter: 'blur(6px)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                  }}
                  title="下载图片"
                >
                  ⬇️
                </button>
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: '#00B4D8',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.5px',
                    }}
                  >
                    已选中
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: '#3A3A5C',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                  }}
                >
                  {img.name}
                </div>
                <div style={{ fontSize: '11px', color: '#B0B0C0' }}>{img.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {modalImage && (
        <div
          ref={modalRef}
          onClick={handleCloseModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: closing ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            animation: closing ? 'fadeOut 0.25s ease forwards' : 'fadeIn 0.25s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '80vh',
              animation: closing ? 'fadeOut 0.25s ease forwards' : 'slideIn 0.3s ease',
            }}
          >
            <img
              src={modalImage.adjustedUrl || modalImage.url}
              alt={modalImage.name}
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                borderRadius: '12px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
              draggable={false}
            />
            <div
              style={{
                position: 'absolute',
                top: '-16px',
                right: '-16px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#00B4D8',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(0,180,216,0.4)',
                transition: 'transform 0.15s ease',
              }}
              onClick={handleCloseModal}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.transform = 'scale(1)')
              }
            >
              ✕
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: '-40px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '10px',
              }}
            >
              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'rgba(45,45,68,0.9)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {modalImage.name}
              </div>
              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'rgba(45,45,68,0.9)',
                  color: '#B0B0C0',
                  fontSize: '13px',
                }}
              >
                {modalImage.sub}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewPanel;
