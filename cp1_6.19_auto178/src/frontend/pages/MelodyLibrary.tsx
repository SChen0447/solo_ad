import { useState, useEffect } from 'react';
import { Melody, Note } from '../utils/Api';

interface MelodyLibraryProps {
  melodies: Melody[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onLoad: (melody: Melody) => void;
  onToggleFavorite: (id: string) => void;
  onMixPlay: () => void;
  onExportShare: () => void;
  isMixPlaying: boolean;
}

const PITCH_COLORS = [
  '#00d2ff', '#3ab0ff', '#5c8ff0', '#7a70d0',
  '#9960b0', '#b85090', '#d94570', '#ff6b6b',
];

export function MelodyLibrary({
  melodies,
  selectedIds,
  onToggleSelect,
  onLoad,
  onToggleFavorite,
  onMixPlay,
  onExportShare,
  isMixPlaying,
}: MelodyLibraryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const generateThumbnail = (notes: Note[]) => {
    const beats = Array.from({ length: 8 }, (_, i) => i);
    return beats.map((beat) => {
      const note = notes.find((n) => n.beat === beat);
      if (note) {
        return PITCH_COLORS[note.pitch] || '#333';
      }
      return '#2a2a4e';
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="library-container">
      <div className="library-header">
        <h2 className="library-title">旋律库</h2>
        <span className="library-count">{melodies.length} 个片段</span>
      </div>

      <div className="library-actions">
        <button
          className="mix-btn"
          onClick={onMixPlay}
          disabled={selectedIds.length < 2 || isMixPlaying}
        >
          🎵 混合播放
        </button>
        <button
          className="export-btn"
          onClick={onExportShare}
          disabled={selectedIds.length === 0}
        >
          🔗 导出分享
        </button>
      </div>

      {selectedIds.length > 0 && (
        <div className="selection-info">
          已选择 {selectedIds.length}/4 个旋律
        </div>
      )}

      <div className="melody-list">
        {melodies.length === 0 ? (
          <div className="empty-state">
            <p>暂无旋律片段</p>
            <p className="empty-hint">在编辑器中创作并保存你的第一个旋律</p>
          </div>
        ) : (
          melodies.map((melody) => {
            const isSelected = selectedIds.includes(melody.id);
            const isHovered = hoveredId === melody.id;
            const thumbnail = generateThumbnail(melody.notes);

            return (
              <div
                key={melody.id}
                className={`melody-card ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredId(melody.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onLoad(melody)}
              >
                <div className="card-thumbnail">
                  {thumbnail.map((color, i) => (
                    <div
                      key={i}
                      className="thumbnail-bar"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <div className="card-content">
                  <div className="card-header">
                    <h3 className="card-title">{melody.name}</h3>
                    <button
                      className={`favorite-btn ${melody.favorite ? 'favorited' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(melody.id);
                      }}
                    >
                      {melody.favorite ? '♥' : '♡'}
                    </button>
                  </div>

                  <div className="card-tags">
                    {melody.tags.map((tag) => (
                      <span key={tag} className="card-tag">
                      </span>
                    ))}
                  </div>

                  <div className="card-footer">
                    <span className="card-date">{formatDate(melody.createdAt)}</span>
                    <span className="card-bpm">BPM: {melody.bpm}</span>
                    <input
                      type="checkbox"
                      className="card-checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (selectedIds.length < 4 || isSelected) {
                          onToggleSelect(melody.id);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .library-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #16213e;
          border-radius: 16px;
          padding: 24px;
          box-sizing: border-box;
          overflow: hidden;
        }

        .library-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .library-title {
          margin: 0;
          color: #fff;
          font-size: 20px;
          font-weight: 600;
        }

        .library-count {
          color: #888;
          font-size: 13px;
        }

        .library-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .mix-btn, .export-btn {
          flex: 1;
          padding: 10px 12px;
          border-radius: 8px;
          border: none;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mix-btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .mix-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .export-btn {
          background: #2a2a4e;
          color: #fff;
        }

        .export-btn:hover:not(:disabled) {
          background: #3a3a5e;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .mix-btn:disabled, .export-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        .selection-info {
          padding: 8px 12px;
          background: rgba(233, 69, 96, 0.2);
          border-radius: 6px;
          color: #e94560;
          font-size: 13px;
          text-align: center;
          margin-bottom: 12px;
        }

        .melody-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-right: 4px;
        }

        .melody-list::-webkit-scrollbar {
          width: 6px;
        }

        .melody-list::-webkit-scrollbar-track {
          background: #1a1a2e;
          border-radius: 3px;
        }

        .melody-list::-webkit-scrollbar-thumb {
          background: #3a3a5e;
          border-radius: 3px;
        }

        .melody-card {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: #1a1a2e;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .melody-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .melody-card.selected {
          border: 2px solid #e94560;
        }

        .card-thumbnail {
          display: flex;
          flex-direction: column;
          gap: 2px;
          width: 8px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .melody-card.hovered .card-thumbnail {
          opacity: 1;
        }

        .thumbnail-bar {
          flex: 1;
          border-radius: 2px;
          min-height: 3px;
        }

        .card-content {
          flex: 1;
          min-width: 0;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .card-title {
          margin: 0;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }

        .favorite-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
          transition: all 0.2s ease;
          padding: 0;
          line-height: 1;
        }

        .favorite-btn.favorited {
          color: #e94560;
          animation: heartPop 0.3s ease;
        }

        @keyframes heartPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .favorite-btn:hover {
          transform: scale(1.1);
        }

        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
        }

        .card-tag {
          padding: 4px 10px;
          background: #2a2a4e;
          color: #aaa;
          border-radius: 12px;
          font-size: 11px;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-date {
          color: #666;
          font-size: 12px;
        }

        .card-bpm {
          color: #888;
          font-size: 12px;
        }

        .card-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #e94560;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #666;
        }

        .empty-state p {
          margin: 0 0 8px 0;
        }

        .empty-hint {
          font-size: 13px;
          color: #555;
        }

        @media (max-width: 768px) {
          .library-container {
            height: auto;
          }

          .melody-list {
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;
            padding-bottom: 8px;
          }

          .melody-card {
            min-width: 200px;
            flex-shrink: 0;
          }
        }
      `}</style>
    </div>
  );
}
