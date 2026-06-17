import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { SavedLayout, RoomType, FloorType, FurnitureItem, RoomLayout } from '../types';
import { getRoomLayout } from '../modules/roomConfig';

const STORAGE_KEY = 'home-decor-saved-layouts';
const MAX_SAVED = 5;

interface SaveBarProps {
  roomType: RoomType;
  floorType: FloorType;
  furniture: FurnitureItem[];
  wallColors: Record<string, string>;
  onLoadLayout: (layout: SavedLayout) => void;
  canvasElementGetter: () => HTMLDivElement | null;
}

const generateThumbnail = (
  roomType: RoomType,
  floorType: FloorType,
  furniture: FurnitureItem[],
  wallColors: Record<string, string>,
  size = { w: 120, h: 90 }
): string => {
  const layout = getRoomLayout(roomType, floorType);
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const scaleX = size.w / layout.canvasWidth;
  const scaleY = size.h / layout.canvasHeight;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (size.w - layout.canvasWidth * scale) / 2;
  const offsetY = (size.h - layout.canvasHeight * scale) / 2;

  ctx.fillStyle = '#fdfaf6';
  ctx.fillRect(0, 0, size.w, size.h);

  ctx.fillStyle = '#f5e6d0';
  ctx.fillRect(offsetX, offsetY, layout.canvasWidth * scale, layout.canvasHeight * scale);

  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 2;
  ctx.strokeRect(offsetX, offsetY, layout.canvasWidth * scale, layout.canvasHeight * scale);

  for (const wall of layout.walls) {
    const color = wallColors[wall.id] || wall.color;
    ctx.fillStyle = color;
    ctx.fillRect(
      offsetX + wall.x * scale,
      offsetY + wall.y * scale,
      wall.width * scale,
      wall.height * scale
    );
  }

  for (const item of furniture) {
    ctx.fillStyle = item.color;
    const x = offsetX + item.x * scale;
    const y = offsetY + item.y * scale;
    const w = item.width * scale;
    const h = item.height * scale;
    ctx.beginPath();
    const r = 2 * scale;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
};

export const SaveBar: React.FC<SaveBarProps> = ({
  roomType,
  floorType,
  furniture,
  wallColors,
  onLoadLayout,
  canvasElementGetter,
}) => {
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);
  const [showNameInput, setShowNameInput] = useState(false);
  const [newName, setNewName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedLayout[];
        setSavedLayouts(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (showNameInput && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [showNameInput]);

  const persist = useCallback((layouts: SavedLayout[]) => {
    setSavedLayouts(layouts);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    } catch {
      // ignore
    }
  }, []);

  const handleSave = useCallback(() => {
    if (savedLayouts.length >= MAX_SAVED) {
      alert(`最多保存${MAX_SAVED}个方案，请先删除一个`);
      return;
    }
    setNewName(`方案${savedLayouts.length + 1}`);
    setShowNameInput(true);
  }, [savedLayouts.length]);

  const confirmSave = useCallback(() => {
    const name = newName.trim() || `方案${Date.now()}`;
    const thumbnail = generateThumbnail(roomType, floorType, furniture, wallColors);
    const newLayout: SavedLayout = {
      id: uuidv4(),
      name,
      thumbnail,
      roomType,
      floorType,
      furniture: JSON.parse(JSON.stringify(furniture)),
      wallColors: { ...wallColors },
      createdAt: Date.now(),
    };
    const updated = [...savedLayouts, newLayout];
    persist(updated);
    setShowNameInput(false);
    setNewName('');
  }, [newName, roomType, floorType, furniture, wallColors, savedLayouts, persist]);

  const handleLoad = useCallback((layout: SavedLayout) => {
    setActiveId(layout.id);
    onLoadLayout(layout);
    setTimeout(() => setActiveId(null), 600);
  }, [onLoadLayout]);

  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = savedLayouts.filter(l => l.id !== id);
    persist(updated);
  }, [savedLayouts, persist]);

  return (
    <div
      style={{
        height: '70px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e5e5',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '16px',
        flexShrink: 0,
        zIndex: 150,
        position: 'relative',
      }}
    >
      <button
        onClick={handleSave}
        style={{
          height: '44px',
          padding: '0 20px',
          backgroundColor: '#8b5e3c',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(1.1)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(139,94,60,0.35)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <span>💾</span>
        <span>保存方案</span>
        <span style={{ opacity: 0.8, fontSize: '12px' }}>
          ({savedLayouts.length}/{MAX_SAVED})
        </span>
      </button>

      {showNameInput && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: '#f5f0ea',
            borderRadius: '8px',
            flexShrink: 0,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmSave();
              if (e.key === 'Escape') {
                setShowNameInput(false);
                setNewName('');
              }
            }}
            style={{
              height: '32px',
              padding: '0 10px',
              border: '1px solid #d5cfc5',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#fff',
              width: '140px',
            }}
            placeholder="方案名称"
          />
          <button
            onClick={confirmSave}
            style={{
              height: '32px',
              padding: '0 14px',
              backgroundColor: '#8b5e3c',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            确认
          </button>
          <button
            onClick={() => {
              setShowNameInput(false);
              setNewName('');
            }}
            style={{
              height: '32px',
              padding: '0 10px',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            取消
          </button>
        </div>
      )}

      <div
        style={{
          flex: 1,
          height: '58px',
          overflowX: 'auto',
          overflowY: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '4px 2px',
        }}
      >
        {savedLayouts.length === 0 && !showNameInput && (
          <div
            style={{
              color: '#aaa',
              fontSize: '13px',
              paddingLeft: '10px',
              fontStyle: 'italic',
            }}
          >
            暂无保存的方案，点击上方"保存方案"按钮保存当前布置
          </div>
        )}
        {savedLayouts.map((layout) => (
          <div
            key={layout.id}
            onClick={() => handleLoad(layout)}
            style={{
              flexShrink: 0,
              width: '180px',
              height: '54px',
              backgroundColor: '#fafafa',
              borderRadius: '8px',
              border: activeId === layout.id ? '2px solid #8b5e3c' : '1px solid #e5e5e5',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.03)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              style={{
                width: '60px',
                height: '42px',
                borderRadius: '4px',
                overflow: 'hidden',
                flexShrink: 0,
                backgroundColor: '#eee',
                border: '1px solid #e5e5e5',
              }}
            >
              {layout.thumbnail && (
                <img
                  src={layout.thumbnail}
                  alt={layout.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  draggable={false}
                />
              )}
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#333',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {layout.name}
              </div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                {layout.furniture.length}件家具
              </div>
            </div>
            <button
              onClick={(e) => handleDelete(e, layout.id)}
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#e74c3c',
                color: '#fff',
                border: 'none',
                fontSize: '10px',
                lineHeight: '1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
