import { useState } from 'react';
import { useGalaxyStore } from '../store/galaxyStore';
import { Trash2, Play } from 'lucide-react';

export default function GalleryPanel() {
  const snapshots = useGalaxyStore((state) => state.snapshots);
  const loadSnapshot = useGalaxyStore((state) => state.loadSnapshot);
  const deleteSnapshot = useGalaxyStore((state) => state.deleteSnapshot);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [ripples, setRipples] = useState<{ id: string; x: number; y: number; snapId: string }[]>([]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleThumbnailClick = (e: React.MouseEvent<HTMLDivElement>, snapId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rippleId = `ripple-${Date.now()}`;

    setRipples((prev) => [...prev, { id: rippleId, x, y, snapId }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== rippleId));
    }, 300);

    loadSnapshot(snapId);
  };

  const handleDelete = (e: React.MouseEvent, snapId: string) => {
    e.stopPropagation();
    deleteSnapshot(snapId);
  };

  return (
    <div className="gallery-panel">
      <div className="gallery-header">
        <h2>快照画廊</h2>
        <span className="snapshot-count">{snapshots.length} 张</span>
      </div>

      <div className="gallery-container">
        {snapshots.length === 0 ? (
          <div className="empty-gallery">
            <div className="empty-icon">📷</div>
            <p>暂无快照</p>
            <span>点击下方"快照"按钮保存当前星系形态</span>
          </div>
        ) : (
          <div className="snapshot-grid">
            {snapshots.map((snapshot, index) => (
              <div
                key={snapshot.id}
                className={`snapshot-item ${hoveredId === snapshot.id ? 'hovered' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
                onMouseEnter={() => setHoveredId(snapshot.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => handleThumbnailClick(e, snapshot.id)}
              >
                <div className="thumbnail-wrapper">
                  <img
                    src={snapshot.thumbnail}
                    alt={`快照 ${index + 1}`}
                    className="thumbnail"
                    draggable={false}
                  />
                  <div className="thumbnail-overlay">
                    <button className="overlay-btn load-btn" title="加载此快照">
                      <Play size={20} fill="currentColor" />
                    </button>
                    <button
                      className="overlay-btn delete-btn"
                      title="删除此快照"
                      onClick={(e) => handleDelete(e, snapshot.id)}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  {ripples
                    .filter((r) => r.snapId === snapshot.id)
                    .map((ripple) => (
                      <span
                        key={ripple.id}
                        className="ripple"
                        style={{ left: ripple.x, top: ripple.y }}
                      />
                    ))}
                </div>
                <div className="snapshot-info">
                  <span className="snapshot-index">#{index + 1}</span>
                  <span className="snapshot-time">{formatDate(snapshot.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .gallery-panel {
          width: 260px;
          padding: 16px;
          background: rgba(26, 26, 46, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid #2a2a4e;
          border-radius: 12px;
          font-family: 'Courier New', monospace;
          color: #d0d0ff;
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: fit-content;
          max-height: calc(100vh - 120px);
        }

        .gallery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .gallery-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 1px;
        }

        .snapshot-count {
          font-size: 12px;
          color: #8a8aff;
          background: rgba(106, 106, 255, 0.2);
          padding: 4px 10px;
          border-radius: 12px;
        }

        .gallery-container {
          flex: 1;
          overflow-y: auto;
          padding-right: 4px;
        }

        .gallery-container::-webkit-scrollbar {
          width: 6px;
        }

        .gallery-container::-webkit-scrollbar-track {
          background: rgba(42, 42, 78, 0.3);
          border-radius: 3px;
        }

        .gallery-container::-webkit-scrollbar-thumb {
          background: #4a4a7e;
          border-radius: 3px;
        }

        .gallery-container::-webkit-scrollbar-thumb:hover {
          background: #6a6a9e;
        }

        .empty-gallery {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          color: #606080;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-gallery p {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #8080a0;
        }

        .empty-gallery span {
          font-size: 11px;
          line-height: 1.5;
        }

        .snapshot-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .snapshot-item {
          animation: fadeIn 0.3s ease-out forwards;
          opacity: 0;
          cursor: pointer;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .thumbnail-wrapper {
          position: relative;
          width: 100%;
          height: 150px;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .snapshot-item.hovered .thumbnail-wrapper {
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(106, 106, 255, 0.3);
        }

        .thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .thumbnail-overlay {
          position: absolute;
          inset: 0;
          background: rgba(10, 10, 26, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .snapshot-item.hovered .thumbnail-overlay {
          opacity: 1;
        }

        .overlay-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .load-btn {
          background: rgba(106, 106, 255, 0.9);
          color: white;
        }

        .load-btn:hover {
          background: rgba(138, 138, 255, 1);
          transform: scale(1.1);
        }

        .delete-btn {
          background: rgba(255, 106, 106, 0.9);
          color: white;
        }

        .delete-btn:hover {
          background: rgba(255, 138, 138, 1);
          transform: scale(1.1);
        }

        .snapshot-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          padding: 0 4px;
        }

        .snapshot-index {
          font-size: 12px;
          font-weight: 600;
          color: #8a8aff;
        }

        .snapshot-time {
          font-size: 11px;
          color: #707090;
        }

        .ripple {
          position: absolute;
          width: 25px;
          height: 25px;
          background: rgba(106, 106, 255, 0.6);
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(0);
          animation: ripple-animation 0.3s ease-out forwards;
          pointer-events: none;
        }

        @keyframes ripple-animation {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }

        @media (max-width: 768px) {
          .gallery-panel {
            width: 100%;
            max-height: none;
            border-radius: 12px 12px 0 0;
          }

          .snapshot-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .thumbnail-wrapper {
            height: 100px;
          }
        }
      `}</style>
    </div>
  );
}
