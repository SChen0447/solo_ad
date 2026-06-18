import React, { useRef, useState, useCallback } from 'react';
import { useGradientStore, type ColorStop } from './state';

const STOP_SIZE = 16;

export const GradientEditor: React.FC = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingIdRef = useRef<string | null>(null);

  const config = useGradientStore((s) => s.config);
  const setType = useGradientStore((s) => s.setType);
  const addStop = useGradientStore((s) => s.addStop);
  const removeStop = useGradientStore((s) => s.removeStop);
  const updateStopPosition = useGradientStore((s) => s.updateStopPosition);
  const selectStop = useGradientStore((s) => s.selectStop);
  const setAngle = useGradientStore((s) => s.setAngle);
  const setShape = useGradientStore((s) => s.setShape);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; stopId: string } | null>(null);

  const handleTrackClick = (e: React.MouseEvent) => {
    if (e.target !== trackRef.current) return;
    const rect = trackRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    addStop();
    const stops = useGradientStore.getState().config.stops;
    const newStop = stops[stops.length - 1];
    updateStopPosition(newStop.id, Math.max(0, Math.min(100, percent)));
  };

  const handleStopPointerDown = (e: React.PointerEvent, stop: ColorStop) => {
    e.stopPropagation();
    selectStop(stop.id);
    draggingIdRef.current = stop.id;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingIdRef.current || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let percent = (x / rect.width) * 100;
    percent = Math.max(0, Math.min(100, percent));
    updateStopPosition(draggingIdRef.current, percent);
  }, [updateStopPosition]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (draggingIdRef.current) {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      draggingIdRef.current = null;
    }
  }, []);

  const handleStopContextMenu = (e: React.MouseEvent, stopId: string) => {
    e.preventDefault();
    if (config.stops.length <= 2) return;
    setContextMenu({ x: e.clientX, y: e.clientY, stopId });
  };

  const handleDeleteStop = () => {
    if (contextMenu) {
      removeStop(contextMenu.stopId);
      setContextMenu(null);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const sortedStops = [...config.stops].sort((a, b) => a.position - b.position);

  const trackGradient =
    config.type === 'linear'
      ? `linear-gradient(90deg, ${sortedStops
          .map((s) => `${s.color} ${s.position}%`)
          .join(', ')})`
      : `linear-gradient(90deg, ${sortedStops
          .map((s) => `${s.color} ${s.position}%`)
          .join(', ')})`;

  return (
    <div className="gradient-editor">
      <div className="controls-row">
        <div className="type-toggle">
          <button
            className={`type-btn ${config.type === 'linear' ? 'active' : ''}`}
            onClick={() => setType('linear')}
          >
            线性渐变
          </button>
          <button
            className={`type-btn ${config.type === 'radial' ? 'active' : ''}`}
            onClick={() => setType('radial')}
          >
            径向渐变
          </button>
        </div>

        {config.type === 'linear' && (
          <div className="angle-control">
            <label className="control-label">角度: {config.angle}°</label>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={config.angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="angle-slider"
            />
          </div>
        )}

        {config.type === 'radial' && (
          <div className="shape-control">
            <label className="control-label">形状</label>
            <div className="shape-toggle">
              <button
                className={`shape-btn ${config.shape === 'circle' ? 'active' : ''}`}
                onClick={() => setShape('circle')}
              >
                圆形
              </button>
              <button
                className={`shape-btn ${config.shape === 'ellipse' ? 'active' : ''}`}
                onClick={() => setShape('ellipse')}
              >
                椭圆
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="stops-section">
        <div className="stops-header">
          <span className="stops-label">色标轨道</span>
          <button className="add-stop-btn" onClick={addStop}>
            + 添加色标
          </button>
        </div>

        <div
          ref={trackRef}
          className="color-track"
          style={{ background: trackGradient }}
          onClick={handleTrackClick}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {sortedStops.map((stop) => {
            const isSelected = stop.id === config.selectedStopId;
            return (
              <div
                key={stop.id}
                className={`color-stop ${isSelected ? 'selected' : ''}`}
                style={{
                  left: `calc(${stop.position}% - ${STOP_SIZE / 2}px)`,
                  backgroundColor: stop.color,
                }}
                onPointerDown={(e) => handleStopPointerDown(e, stop)}
                onContextMenu={(e) => handleStopContextMenu(e, stop.id)}
                title="拖动调整位置，右键删除"
              >
                <div className="stop-pointer" />
              </div>
            );
          })}
        </div>

        <div className="stops-hint">提示：点击轨道添加色标，右键删除色标（至少保留2个）</div>
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="context-menu-item delete" onClick={handleDeleteStop}>
            删除色标
          </button>
        </div>
      )}
    </div>
  );
};
