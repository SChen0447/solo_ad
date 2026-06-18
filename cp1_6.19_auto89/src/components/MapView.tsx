import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useLibraryStore } from '../store';

interface ShelfInfo {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface BookLocation {
  shelf: ShelfInfo;
  book: { id: string; title: string; shelf: string; callNumber: string };
}

const SHELF_W = 200;
const SHELF_H = 60;
const SVG_W = 780;
const SVG_H = 700;
const ENTRANCE_X = 390;
const ENTRANCE_Y = 660;

export const MapView: React.FC = () => {
  const { bookId } = useParams<{ bookId?: string }>();
  const { addToast } = useLibraryStore();
  const [shelves, setShelves] = useState<ShelfInfo[]>([]);
  const [bookLocation, setBookLocation] = useState<BookLocation | null>(null);
  const [highlightShelf, setHighlightShelf] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/shelves')
      .then((r) => r.json())
      .then(setShelves)
      .catch(() => addToast('error', '获取书架数据失败'));
  }, [addToast]);

  useEffect(() => {
    if (bookId) {
      loadBookLocation(bookId);
    }
  }, [bookId]);

  const loadBookLocation = async (id: string) => {
    try {
      const res = await fetch(`/api/book-location/${id}`);
      const data = await res.json();
      if (!res.ok) {
        addToast('error', data.error || '获取图书位置失败');
        return;
      }
      setBookLocation(data);
      setHighlightShelf(data.shelf.id);
      addToast('info', `图书位于${data.shelf.label}书架`);
    } catch {
      addToast('error', '获取图书位置失败');
    }
  };

  const handleSearchSubmit = async () => {
    if (!searchInput.trim()) return;
    try {
      const res = await fetch(`/api/books/search?keyword=${encodeURIComponent(searchInput)}&page=1&pageSize=1`);
      const data = await res.json();
      if (data.data.length === 0) {
        addToast('error', '未找到该图书');
        return;
      }
      loadBookLocation(data.data[0].id);
    } catch {
      addToast('error', '搜索失败');
    }
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.min(2, Math.max(0.5, prev + delta)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTranslate({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const getShelfCenter = (shelf: ShelfInfo) => ({
    cx: shelf.x + SHELF_W / 2,
    cy: shelf.y + SHELF_H / 2,
  });

  const generatePath = (shelf: ShelfInfo) => {
    const center = getShelfCenter(shelf);
    const waypoints = [
      { x: ENTRANCE_X, y: ENTRANCE_Y },
      { x: ENTRANCE_X, y: center.cy },
      { x: center.cx, y: center.cy },
    ];
    return waypoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  const renderCrosshair = () => {
    const cx = SVG_W / 2;
    const cy = SVG_H / 2;
    return (
      <g opacity="0.15" stroke="#9e9e9e" strokeWidth="1">
        <line x1={cx - 30} y1={cy} x2={cx + 30} y2={cy} />
        <line x1={cx} y1={cy - 30} x2={cx} y2={cy + 30} />
      </g>
    );
  };

  return (
    <div className="map-page">
      <div className="map-header">
        <h2>馆内导航</h2>
        <div className="map-search">
          <input
            type="text"
            placeholder="输入书名搜索图书位置..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            className="map-search-input"
          />
          <button className="map-search-btn" onClick={handleSearchSubmit}>定位</button>
        </div>
        <div className="map-zoom-controls">
          <button onClick={() => setScale((s) => Math.min(2, s + 0.1))}>+</button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}>−</button>
          <button onClick={() => { setScale(1); setTranslate({ x: 0, y: 0 }); }}>重置</button>
        </div>
      </div>

      {bookLocation && (
        <div className="map-book-info">
          <span>📍 《{bookLocation.book.title}》— {bookLocation.shelf.label}（索书号：{bookLocation.book.callNumber}）</span>
        </div>
      )}

      <div
        className="map-container"
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <svg
          ref={svgRef}
          width={SVG_W}
          height={SVG_H}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`, transformOrigin: 'center center' }}
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0ece4" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={SVG_W} height={SVG_H} fill="url(#grid)" />

          <text x={SVG_W / 2} y={30} textAnchor="middle" fontSize="20" fill="#5d4037" fontWeight="bold">
            图书馆一楼平面图
          </text>

          {renderCrosshair()}

          <g>
            <rect x={ENTRANCE_X - 40} y={ENTRANCE_Y - 10} width={80} height={30} rx={6} fill="#e8f5e9" stroke="#4caf50" strokeWidth={2} />
            <text x={ENTRANCE_X} y={ENTRANCE_Y + 12} textAnchor="middle" fontSize="12" fill="#2e7d32">入口</text>
            <polygon points={`${ENTRANCE_X - 8},${ENTRANCE_Y - 15} ${ENTRANCE_X + 8},${ENTRANCE_Y - 15} ${ENTRANCE_X},${ENTRANCE_Y - 25}`} fill="#4caf50" />
          </g>

          {shelves.map((shelf) => {
            const isHighlight = highlightShelf === shelf.id;
            return (
              <g key={shelf.id} className={isHighlight ? 'shelf-highlight' : ''}>
                <rect
                  x={shelf.x}
                  y={shelf.y}
                  width={SHELF_W}
                  height={SHELF_H}
                  rx={4}
                  fill={isHighlight ? '#42a5f5' : '#fff9c4'}
                  stroke={isHighlight ? '#1565c0' : '#9e9e9e'}
                  strokeWidth={isHighlight ? 2.5 : 1.5}
                />
                <text
                  x={shelf.x + SHELF_W / 2}
                  y={shelf.y + SHELF_H / 2 - 6}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="bold"
                  fill={isHighlight ? '#fff' : '#5d4037'}
                >
                  {shelf.id}
                </text>
                <text
                  x={shelf.x + SHELF_W / 2}
                  y={shelf.y + SHELF_H / 2 + 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill={isHighlight ? '#e3f2fd' : '#8d6e63'}
                >
                  {shelf.label.split(' - ')[1] || shelf.label}
                </text>
              </g>
            );
          })}

          {highlightShelf && (() => {
            const shelf = shelves.find((s) => s.id === highlightShelf);
            if (!shelf) return null;
            return (
              <path
                d={generatePath(shelf)}
                fill="none"
                stroke="#e53935"
                strokeWidth={2}
                strokeDasharray="8 4"
                className="nav-path"
              />
            );
          })()}

          {renderCrosshair()}
        </svg>
      </div>

      <div className="map-legend">
        <span className="legend-item"><span className="legend-color" style={{ background: '#fff9c4', border: '1px solid #9e9e9e' }} />书架</span>
        <span className="legend-item"><span className="legend-color" style={{ background: '#42a5f5' }} />目标书架</span>
        <span className="legend-item"><span className="legend-color" style={{ background: '#4caf50' }} />入口</span>
        <span className="legend-item"><span className="legend-line" />导航路径</span>
      </div>
    </div>
  );
};
