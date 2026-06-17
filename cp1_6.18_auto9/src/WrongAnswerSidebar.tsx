import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  getAllTags,
  filterWrongAnswers,
  markAsMastered,
  removeWrongAnswer,
  type WrongAnswerRecord,
} from './wrongAnswerStorage';

interface WrongAnswerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ITEM_HEIGHT = 120;
const VISIBLE_COUNT = 6;
const BUFFER = 3;

const optionLabels = ['A', 'B', 'C', 'D'];

export function WrongAnswerSidebar({ isOpen, onClose }: WrongAnswerSidebarProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showMastered, setShowMastered] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [records, setRecords] = useState<WrongAnswerRecord[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    setTags(getAllTags());
    setRecords(filterWrongAnswers(selectedTag, showMastered));
  }, [selectedTag, showMastered]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
  const endIndex = Math.min(
    records.length,
    startIndex + VISIBLE_COUNT + BUFFER * 2
  );

  const visibleItems = useMemo(
    () => records.slice(startIndex, endIndex),
    [records, startIndex, endIndex]
  );

  const handleMarkMastered = (id: string) => {
    markAsMastered(id);
    refresh();
  };

  const handleRemove = (id: string) => {
    removeWrongAnswer(id);
    refresh();
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`wrong-answer-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>📚 错题本</h3>
          <button className="sidebar-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="sidebar-filters">
          <div className="filter-row">
            <label>知识点筛选：</label>
            <select
              value={selectedTag || ''}
              onChange={(e) => setSelectedTag(e.target.value || null)}
            >
              <option value="">全部知识点</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showMastered}
                onChange={(e) => setShowMastered(e.target.checked)}
              />
              显示已掌握
            </label>
          </div>
        </div>

        <div className="sidebar-stats">
          共 {records.length} 道错题
        </div>

        <div
          className="virtual-scroll-container"
          ref={containerRef}
          onScroll={handleScroll}
          style={{
            height: `${VISIBLE_COUNT * ITEM_HEIGHT}px`,
            overflowY: 'auto',
          }}
        >
          <div style={{ height: `${records.length * ITEM_HEIGHT}px`, position: 'relative' }}>
            {visibleItems.map((item, idx) => {
              const absoluteIndex = startIndex + idx;
              return (
                <div
                  key={item.id}
                  className="wrong-answer-item"
                  style={{
                    position: 'absolute',
                    top: `${absoluteIndex * ITEM_HEIGHT}px`,
                    height: `${ITEM_HEIGHT}px`,
                    left: 0,
                    right: 0,
                  }}
                >
                  <div className="wa-tags">
                    {item.tags.slice(0, 3).map((t) => (
                      <span key={t} className="tag-chip small">
                        {t}
                      </span>
                    ))}
                    {item.mastered && (
                      <span className="tag-chip mastered-tag">已掌握</span>
                    )}
                  </div>
                  <p className="wa-question">{item.question}</p>
                  <div className="wa-answer-line">
                    <span>你的：{item.userAnswer !== null ? optionLabels[item.userAnswer] : '未答'}</span>
                    <span>正确：{optionLabels[item.correctAnswer]}</span>
                  </div>
                  <div className="wa-actions">
                    {!item.mastered && (
                      <button className="wa-btn-master" onClick={() => handleMarkMastered(item.id)}>
                        标记已掌握
                      </button>
                    )}
                    <button className="wa-btn-remove" onClick={() => handleRemove(item.id)}>
                      移除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {records.length === 0 && (
          <div className="empty-state">
            <p>🎉 暂无错题</p>
            <p className="empty-sub">继续加油，保持正确率！</p>
          </div>
        )}
      </aside>
    </>
  );
}
