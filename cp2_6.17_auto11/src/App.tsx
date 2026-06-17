import React, { useState, useCallback, useRef, useMemo } from 'react';
import { RoomCanvas } from './components/RoomCanvas';
import { FurniturePanel } from './components/FurniturePanel';
import { SaveBar } from './components/SaveBar';
import { getRoomLayout, getRoomOptions, getFloorOptions, getFloorName } from './modules/roomConfig';
import { PRESET_COLORS, detectColorScheme, applyColorTransition } from './modules/colorManager';
import type { RoomType, FloorType, FurnitureItem, SavedLayout } from './types';

const App: React.FC = () => {
  const [roomType, setRoomType] = useState<RoomType>('square');
  const [floorType, setFloorType] = useState<FloorType>('wood');
  const [furniture, setFurniture] = useState<FurnitureItem[]>([]);
  const [wallColors, setWallColors] = useState<Record<string, string>>({});
  const [activeWallId, setActiveWallId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobileFurnitureOpen, setIsMobileFurnitureOpen] = useState(false);
  const [colorPickerPos, setColorPickerPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => getRoomLayout(roomType, floorType), [roomType, floorType]);

  const colorSchemeName = useMemo(() => {
    const colors = layout.walls.map(w => wallColors[w.id] || w.color);
    return detectColorScheme(colors);
  }, [layout, wallColors]);

  const handleWallClick = useCallback((wallId: string, element: HTMLElement) => {
    setActiveWallId(wallId);
    const rect = element.getBoundingClientRect();
    setColorPickerPos({
      x: Math.min(rect.left + rect.width / 2, window.innerWidth - 280),
      y: Math.max(rect.top - 10, 80),
    });
    setShowColorPicker(true);
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    if (activeWallId) {
      applyColorTransition(null, color, 300);
      setWallColors(prev => ({ ...prev, [activeWallId]: color }));
    }
  }, [activeWallId]);

  const handleFurnitureAdd = useCallback((item: FurnitureItem) => {
    setFurniture(prev => [...prev, item]);
  }, []);

  const handleFurnitureMove = useCallback((id: string, x: number, y: number) => {
    setFurniture(prev => prev.map(f => f.id === id ? { ...f, x, y } : f));
  }, []);

  const handleFurnitureDelete = useCallback((id: string) => {
    setFurniture(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleLoadLayout = useCallback((saved: SavedLayout) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setRoomType(saved.roomType);
      setFloorType(saved.floorType);
      setFurniture(saved.furniture);
      setWallColors(saved.wallColors);
      setTimeout(() => setIsTransitioning(false), 100);
    }, 500);
  }, []);

  const roomOptions = getRoomOptions();
  const floorOptions = getFloorOptions();

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#fdfaf6',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '60px',
          padding: '0 24px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e5e5',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexShrink: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '18px',
            fontWeight: 700,
            color: '#333',
          }}
        >
          <span style={{ fontSize: '24px' }}>🏡</span>
          <span>家居软装搭配工具</span>
        </div>

        <div style={{ width: '1px', height: '28px', backgroundColor: '#e5e5e5' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>房型：</label>
          <select
            value={roomType}
            onChange={(e) => setRoomType(e.target.value as RoomType)}
            style={{
              height: '34px',
              padding: '0 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: '#fff',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#8b5e3c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#ddd';
            }}
          >
            {roomOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}（{opt.area}㎡）
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>地板：</label>
          <select
            value={floorType}
            onChange={(e) => setFloorType(e.target.value as FloorType)}
            style={{
              height: '34px',
              padding: '0 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: '#fff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {floorOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 16px',
            backgroundColor: '#f5f0ea',
            borderRadius: '8px',
          }}
        >
          <span style={{ fontSize: '13px', color: '#8b5e3c' }}>当前风格：</span>
          <span style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#8b5e3c',
          }}>
            {colorSchemeName}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {layout.walls.slice(0, 4).map((w, i) => (
              <div
                key={w.id}
                title={`墙面${i + 1}`}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  backgroundColor: wallColors[w.id] || w.color,
                  border: '1.5px solid #fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          ref={canvasRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'auto',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <RoomCanvas
            layout={layout}
            furniture={furniture}
            wallColors={wallColors}
            onWallClick={handleWallClick}
            onFurnitureAdd={handleFurnitureAdd}
            onFurnitureMove={handleFurnitureMove}
            onFurnitureDelete={handleFurnitureDelete}
            activeWallId={activeWallId}
            isTransitioning={isTransitioning}
          />
        </div>

        <div style={{ padding: '16px 16px 16px 0', flexShrink: 0 }}>
          <FurniturePanel
            isMobileExpanded={isMobileFurnitureOpen}
            onToggleMobile={() => setIsMobileFurnitureOpen(!isMobileFurnitureOpen)}
          />
        </div>
      </div>

      <SaveBar
        roomType={roomType}
        floorType={floorType}
        furniture={furniture}
        wallColors={wallColors}
        onLoadLayout={handleLoadLayout}
        canvasElementGetter={() => canvasRef.current}
      />

      {showColorPicker && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 400,
            }}
            onClick={() => {
              setShowColorPicker(false);
              setActiveWallId(null);
            }}
          />
          <div
            style={{
              position: 'fixed',
              left: colorPickerPos.x,
              top: colorPickerPos.y,
              transform: 'translate(-50%, -100%)',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              padding: '16px',
              zIndex: 500,
              border: '1px solid #e5e5e5',
              width: '260px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>🎨 选择墙面颜色</span>
              <button
                onClick={() => {
                  setShowColorPicker(false);
                  setActiveWallId(null);
                }}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#f5f5f5',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#666',
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
              }}
            >
              {PRESET_COLORS.map(preset => {
                const isSelected = activeWallId && wallColors[activeWallId] === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => handleColorSelect(preset.value)}
                    title={preset.name}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '10px',
                      backgroundColor: preset.value,
                      border: isSelected ? '3px solid #8b5e3c' : '2px solid transparent',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected
                        ? '0 4px 12px rgba(139,94,60,0.3)'
                        : '0 1px 4px rgba(0,0,0,0.1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.08)';
                      e.currentTarget.style.filter = 'brightness(1.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.filter = 'brightness(1)';
                    }}
                  >
                    {isSelected && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: ['#4a4a4a'].includes(preset.value) ? '#fff' : '#333',
                          fontSize: '16px',
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PRESET_COLORS.map(preset => (
                <span
                  key={preset.value}
                  style={{
                    fontSize: '10px',
                    color: '#888',
                    backgroundColor: '#f8f5f0',
                    padding: '2px 8px',
                    borderRadius: '10px',
                  }}
                >
                  {preset.name}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
