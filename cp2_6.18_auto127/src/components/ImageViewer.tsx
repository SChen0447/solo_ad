import { useRef, useState } from 'react';
import type { Annotation, UploadedImage } from '../types';
import { STATUS_COLORS } from '../types';

interface ImageViewerProps {
  image: UploadedImage | null;
  annotations: Annotation[];
  onImageClick: (x: number, y: number) => void;
}

function ImageViewer({ image, annotations, onImageClick }: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!image || !containerRef.current) return;
    const container = containerRef.current;
    const img = container.querySelector('img');
    if (!img) return;

    const imgRect = img.getBoundingClientRect();
    const x = ((e.clientX - imgRect.left) / imgRect.width) * 100;
    const y = ((e.clientY - imgRect.top) / imgRect.height) * 100;

    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      onImageClick(x, y);
    }
  };

  return (
    <div style={styles.container}>
      {!image ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📐</div>
          <h3 style={styles.emptyTitle}>还没有上传设计稿</h3>
          <p style={styles.emptyDesc}>点击右上角的「上传设计稿」按钮开始标注工作</p>
          <p style={styles.emptyTip}>支持 PNG / JPG 格式，单张最大 5MB</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          style={styles.imageContainer}
          onClick={handleClick}
        >
          <div style={styles.imageWrapper}>
            <img
              src={image.url}
              alt={image.originalName}
              style={styles.image}
              draggable={false}
            />
            {annotations.map((annotation) => {
              const isHovered = hoveredId === annotation.id;
              const size = isHovered ? 20 : 16;
              const bgColor = STATUS_COLORS[annotation.status];
              return (
                <div
                  key={annotation.id}
                  style={{
                    ...styles.annotationPoint,
                    left: `${annotation.x}%`,
                    top: `${annotation.y}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: bgColor,
                    transform: `translate(-50%, -50%) scale(${isHovered ? 1 : 1})`,
                    boxShadow: isHovered
                      ? '0 4px 12px rgba(0,0,0,0.25)'
                      : '0 1px 3px rgba(0,0,0,0.15)',
                    fontSize: size === 20 ? '11px' : '10px',
                  }}
                  onMouseEnter={() => setHoveredId(annotation.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  title={`#${annotation.number} ${annotation.author || '未填写'}: ${annotation.comment || '无评论'}`}
                >
                  {annotation.number}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    width: '70%',
    backgroundColor: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    minHeight: 'calc(100vh - 56px)',
    overflow: 'auto',
  },
  emptyState: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '48px 32px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
  },
  emptyDesc: {
    fontSize: '14px',
    marginBottom: '8px',
  },
  emptyTip: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    cursor: 'crosshair',
  },
  imageWrapper: {
    position: 'relative',
    display: 'inline-block',
    maxWidth: '850px',
    width: '100%',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    borderRadius: '4px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  image: {
    display: 'block',
    width: '100%',
    height: 'auto',
    userSelect: 'none',
    pointerEvents: 'none',
  },
  annotationPoint: {
    position: 'absolute',
    borderRadius: '50%',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    transition: 'all 0.15s ease-out',
    zIndex: 10,
    border: '2px solid #ffffff',
  },
};

export default ImageViewer;
