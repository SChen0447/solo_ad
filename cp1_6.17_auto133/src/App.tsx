import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { StarField } from './stars/StarField';
import { StarDataService } from './stars/StarDataService';
import { DateSlider } from './controls/DateSlider';
import { ExportButton } from './controls/ExportButton';
import { Sidebar } from './sidebar/Sidebar';
import type { Star, CustomLine, ViewState } from './utils/types';

export const App: React.FC = () => {
  const [stars, setStars] = useState<Star[]>([]);
  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [customLines, setCustomLines] = useState<CustomLine[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [viewState, setViewState] = useState<ViewState>({ rotationX: 15, rotationY: 40, zoom: 1 });
  const [loading, setLoading] = useState(true);
  const [lineEditingMode, setLineEditingMode] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<Star | null>(null);
  const [, setClickedStar] = useState<Star | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [s, c] = await Promise.all([
        StarDataService.fetchStars(),
        StarDataService.fetchConstellations(),
      ]);
      if (alive) {
        setStars(s);
        setConstellations(c);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const handleAddCustomLine = useCallback((fromId: string, toId: string, name: string) => {
    const id = `cl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCustomLines(prev => [...prev, { id, fromStarId: fromId, toStarId: toId, name }]);
    setLineEditingMode(false);
  }, []);

  const handleUpdateLine = useCallback((id: string, newName: string) => {
    setCustomLines(prev => prev.map(l => l.id === id ? { ...l, name: newName } : l));
  }, []);

  const handleDeleteLine = useCallback((id: string) => {
    setCustomLines(prev => prev.filter(l => l.id !== id));
  }, []);

  const exportBtn = useMemo(() => (
    <ExportButton targetId="starfield-container" selectedDate={selectedDate} />
  ), [selectedDate]);

  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 20,
        background: 'linear-gradient(180deg, #0b0e2a 0%, #1a2040 100%)',
        color: '#fff',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#8cc8ff',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{
          fontFamily: '"Cinzel", "Noto Serif SC", serif',
          fontSize: 16, letterSpacing: 4, opacity: 0.7,
        }}>LOADING STARS...</div>
        <div style={{
          fontFamily: '"Noto Serif SC", serif', fontSize: 12, opacity: 0.4, letterSpacing: 2,
        }}>正在加载星空数据</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      background: '#0b0e2a',
      color: '#fff',
      fontFamily: '"Noto Serif SC", "Cinzel", serif',
    }}>
      <DateSlider selectedDate={selectedDate} onDateChange={setSelectedDate} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <StarField
            stars={stars}
            constellations={constellations}
            customLines={customLines}
            selectedDate={selectedDate}
            viewState={viewState}
            onViewChange={setViewState}
            onStarClick={setClickedStar}
            onStarHover={setHoveredStar}
            onAddCustomLine={handleAddCustomLine}
            lineEditingMode={lineEditingMode}
            onExitLineMode={() => setLineEditingMode(false)}
          />

          <div style={{
            position: 'absolute',
            top: 14,
            left: 18,
            fontFamily: '"Cinzel", "Noto Serif SC", serif',
            pointerEvents: 'none',
            zIndex: 4,
          }}>
            <div style={{
              fontSize: 11, letterSpacing: 5, opacity: 0.35, marginBottom: 4,
            }}>STAR TRACER</div>
            <div style={{
              fontSize: 20, fontWeight: 600, letterSpacing: 3,
              background: 'linear-gradient(90deg, #fff, #b8d0ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>繁星轨迹</div>
          </div>

          <div style={{
            position: 'absolute',
            bottom: 16,
            left: 18,
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 11,
            color: 'rgba(255,255,255,0.35)',
            lineHeight: 1.8,
            pointerEvents: 'none',
            zIndex: 4,
          }}>
            <div>拖拽旋转 · 滚轮缩放 · 点击恒星查看信息</div>
            {hoveredStar && (
              <div style={{ color: 'rgba(200,220,255,0.75)', marginTop: 4 }}>
                当前：{hoveredStar.name} {hoveredStar.englishName ? `(${hoveredStar.englishName})` : ''}
              </div>
            )}
          </div>
        </div>

        <Sidebar
          customLines={customLines}
          stars={stars}
          onUpdateLine={handleUpdateLine}
          onDeleteLine={handleDeleteLine}
          onEnterLineMode={() => setLineEditingMode(true)}
          onExitLineMode={() => setLineEditingMode(false)}
          lineEditingMode={lineEditingMode}
          exportButton={exportBtn}
        />
      </div>
    </div>
  );
};
