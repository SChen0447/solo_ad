import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import type { Shape, ShapeType, AnimationTrack, AnimationType, Conflict } from './types';
import { AnimationLoop, getTotalDuration } from './animationEngine';

const styles = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; width: 100%; overflow: hidden; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; }
body { background: #1a1a2e; color: #e0e0e0; }

@keyframes glowPulse {
  0% { filter: drop-shadow(0 0 4px #00d9ff); }
  50% { filter: drop-shadow(0 0 12px #00d9ff) drop-shadow(0 0 20px #00d9ff); }
  100% { filter: drop-shadow(0 0 4px #00d9ff); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.app { display: flex; flex-direction: column; height: 100vh; width: 100vw; }
.main { display: flex; flex: 1; min-height: 0; }

/* Canvas */
.canvas-wrap { flex: 0 0 70%; position: relative; background: #1a1a2e; border-right: 1px solid #0f3460; overflow: hidden; }
.canvas-bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(15, 52, 96, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 52, 96, 0.3) 1px, transparent 1px);
  background-size: 30px 30px;
}
.toolbar {
  position: absolute; top: 16px; left: 16px; z-index: 10;
  display: flex; gap: 8px; padding: 10px 12px;
  background: #16213e; border: 1px solid #0f3460; border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}
.tool-btn {
  padding: 8px 14px; border: 1px solid #0f3460; border-radius: 6px;
  background: #1a1a2e; color: #c0c0d0; cursor: pointer; font-size: 13px;
  transition: all 0.2s; display: flex; align-items: center; gap: 6px;
}
.tool-btn:hover { background: #0f3460; color: #fff; transform: translateY(-1px); }
.tool-btn.active { background: #0f3460; color: #fff; border-color: #00d9ff; }

.svg-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.shape-group { cursor: move; }
.shape-selected { animation: glowPulse 0.3s ease-in-out; }

/* Right Panel */
.panel { flex: 0 0 30%; display: flex; flex-direction: column; background: #16213e; min-height: 0; }
.panel-section { padding: 14px; border-bottom: 1px solid #0f3460; overflow-y: auto; }
.panel-section h3 { font-size: 13px; color: #00d9ff; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }

.shape-list { display: flex; flex-direction: column; gap: 6px; }
.shape-card {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  background: #1a1a2e; border: 1px solid #0f3460; border-radius: 6px;
  cursor: pointer; transition: all 0.2s;
}
.shape-card:hover { border-color: #00d9ff; }
.shape-card.selected { border-color: #00d9ff; background: #0f3460; }
.shape-card .del {
  margin-left: auto; background: transparent; border: none; color: #e94560;
  cursor: pointer; font-size: 16px; padding: 2px 6px; border-radius: 4px;
}
.shape-card .del:hover { background: rgba(233, 69, 96, 0.2); }
.shape-icon { width: 24px; height: 24px; flex-shrink: 0; }

/* Prop grid */
.prop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.prop { display: flex; flex-direction: column; gap: 4px; }
.prop label { font-size: 11px; color: #8080a0; }
.prop input {
  padding: 6px 8px; background: #1a1a2e; border: 1px solid #0f3460;
  color: #e0e0e0; border-radius: 4px; font-size: 12px;
}
.prop input:focus { outline: none; border-color: #00d9ff; }

/* Tracks */
.track-list { display: flex; flex-direction: column; gap: 8px; }
.track-card {
  padding: 10px; background: #1a1a2e; border: 1px solid #0f3460;
  border-radius: 6px; position: relative;
}
.track-card.inactive { opacity: 0.5; }
.track-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.track-title { font-size: 12px; color: #00d9ff; font-weight: 600; }
.track-del { background: transparent; border: none; color: #e94560; cursor: pointer; font-size: 14px; }
.track-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.track-prop { display: flex; flex-direction: column; gap: 2px; }
.track-prop label { font-size: 10px; color: #8080a0; }
.track-prop input, .track-prop select {
  padding: 4px 6px; background: #16213e; border: 1px solid #0f3460;
  color: #e0e0e0; border-radius: 3px; font-size: 11px; width: 100%;
}
.add-track-btn {
  width: 100%; padding: 8px; background: #0f3460; color: #fff; border: none;
  border-radius: 6px; cursor: pointer; font-size: 12px; margin-top: 8px;
  transition: background 0.2s;
}
.add-track-btn:hover { background: #184b8a; }

/* Conflicts */
.conflict-list { display: flex; flex-direction: column; gap: 6px; }
.conflict-item {
  padding: 10px; background: rgba(233, 69, 96, 0.15);
  border: 1px solid #e94560; border-left: 3px solid #e94560;
  border-radius: 6px; cursor: pointer; animation: shake 0.3s ease;
  transition: background 0.2s;
}
.conflict-item:hover { background: rgba(233, 69, 96, 0.25); }
.conflict-title { font-size: 12px; color: #e94560; font-weight: 600; margin-bottom: 4px; }
.conflict-meta { font-size: 11px; color: #c0c0d0; margin-bottom: 4px; }
.conflict-suggestion { font-size: 11px; color: #8080a0; font-style: italic; }

.schedule-controls { display: flex; gap: 6px; margin-bottom: 10px; }
.schedule-btn {
  flex: 1; padding: 6px; background: #1a1a2e; color: #c0c0d0;
  border: 1px solid #0f3460; border-radius: 4px; cursor: pointer; font-size: 11px;
  transition: all 0.2s;
}
.schedule-btn.active { background: #0f3460; color: #fff; border-color: #00d9ff; }
.schedule-btn:hover { background: #0f3460; }

.no-conflicts { padding: 12px; text-align: center; color: #8080a0; font-size: 12px; }

/* Timeline */
.timeline-wrap {
  flex-shrink: 0; padding: 12px 16px; background: #16213e;
  border-top: 1px solid #0f3460;
}
.playback-controls { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.play-btn {
  width: 38px; height: 38px; border-radius: 50%; border: none;
  background: #00d9ff; color: #1a1a2e; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: bold; transition: transform 0.15s;
}
.play-btn:hover { transform: scale(1.08); }
.ctrl-btn {
  padding: 6px 12px; background: #0f3460; color: #fff; border: none;
  border-radius: 4px; cursor: pointer; font-size: 12px; transition: background 0.2s;
}
.ctrl-btn:hover { background: #184b8a; }
.speed-control { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.speed-control label { font-size: 11px; color: #8080a0; }
.speed-control select {
  padding: 4px 8px; background: #1a1a2e; border: 1px solid #0f3460;
  color: #e0e0e0; border-radius: 4px; font-size: 12px;
}
.time-display { font-size: 12px; color: #00d9ff; font-family: monospace; min-width: 80px; }

.timeline-track {
  position: relative; height: 44px; background: #1a1a2e;
  border: 1px solid #0f3460; border-radius: 6px; overflow: hidden;
}
.timeline-ruler { position: absolute; top: 0; left: 0; right: 0; height: 18px; border-bottom: 1px solid #0f3460; }
.timeline-ruler .tick {
  position: absolute; top: 0; bottom: 0; width: 1px; background: #0f3460;
  font-size: 9px; color: #8080a0; padding-top: 2px;
}
.timeline-content { position: absolute; top: 20px; left: 0; right: 0; bottom: 0; }
.timeline-track-bar {
  position: absolute; height: 18px; top: 2px; border-radius: 3px;
  background: linear-gradient(90deg, #0f3460, #184b8a);
  border: 1px solid #00d9ff; cursor: pointer; display: flex;
  align-items: center; padding: 0 6px; font-size: 10px; color: #e0e0e0;
  overflow: hidden; white-space: nowrap;
}
.timeline-track-bar.conflict { background: linear-gradient(90deg, #e94560, #c03550); border-color: #e94560; }
.playhead {
  position: absolute; top: 0; bottom: 0; width: 2px; background: #00d9ff;
  pointer-events: none; z-index: 5;
  box-shadow: 0 0 8px #00d9ff, 0 0 16px rgba(0, 217, 255, 0.5);
}
.playhead::before {
  content: ''; position: absolute; top: -4px; left: -4px;
  width: 10px; height: 10px; background: #00d9ff; border-radius: 50%;
}
.timeline-slider {
  position: absolute; inset: 0; width: 100%; height: 100%;
  opacity: 0; cursor: pointer; margin: 0;
}

.scroll { overflow-y: auto; scrollbar-width: thin; scrollbar-color: #0f3460 transparent; }
.scroll::-webkit-scrollbar { width: 6px; }
.scroll::-webkit-scrollbar-track { background: transparent; }
.scroll::-webkit-scrollbar-thumb { background: #0f3460; border-radius: 3px; }
`;

function ShapeIcon({ type, size = 24 }: { type: ShapeType; size?: number }) {
  const s = size;
  if (type === 'rect') return <svg width={s} height={s} viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="#00d9ff" /></svg>;
  if (type === 'circle') return <svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#00d9ff" /></svg>;
  return <svg width={s} height={s} viewBox="0 0 24 24"><polygon points="12,3 22,20 2,20" fill="#00d9ff" /></svg>;
}

function ShapeSvg({ shape, state, selected, onMouseDown, onDrag }: {
  shape: Shape;
  state: { x: number; y: number; rotation: number; scale: number };
  selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onDrag: (dx: number, dy: number) => void;
}) {
  const dragging = useRef<{ startX: number; startY: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMouseDown(e);
    dragging.current = { startX: e.clientX, startY: e.clientY };

    const handleMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      onDrag(ev.clientX - dragging.current.startX, ev.clientY - dragging.current.startY);
      dragging.current = { startX: ev.clientX, startY: ev.clientY };
    };
    const handleUp = () => {
      dragging.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const cx = state.x + shape.width / 2;
  const cy = state.y + shape.height / 2;
  const transform = `translate(${cx}, ${cy}) rotate(${state.rotation}) scale(${state.scale}) translate(${-shape.width / 2}, ${-shape.height / 2})`;

  return (
    <g
      className={`shape-group ${selected ? 'shape-selected' : ''}`}
      onMouseDown={handleMouseDown}
      transform={transform}
    >
      {shape.type === 'rect' && (
        <rect x="0" y="0" width={shape.width} height={shape.height} rx="4"
          fill={selected ? '#00d9ff' : '#0f3460'} stroke="#00d9ff" strokeWidth={selected ? 2 : 1} opacity="0.9" />
      )}
      {shape.type === 'circle' && (
        <ellipse cx={shape.width / 2} cy={shape.height / 2} rx={shape.width / 2} ry={shape.height / 2}
          fill={selected ? '#00d9ff' : '#0f3460'} stroke="#00d9ff" strokeWidth={selected ? 2 : 1} opacity="0.9" />
      )}
      {shape.type === 'triangle' && (
        <polygon points={`${shape.width / 2},0 ${shape.width},${shape.height} 0,${shape.height}`}
          fill={selected ? '#00d9ff' : '#0f3460'} stroke="#00d9ff" strokeWidth={selected ? 2 : 1} opacity="0.9" />
      )}
    </g>
  );
}

function TrackEditor({ track }: { track: AnimationTrack }) {
  const { updateTrack, removeTrack } = useStore();
  const typeLabel: Record<AnimationType, string> = { translate: '平移', rotate: '旋转', scale: '缩放' };

  return (
    <div className={`track-card ${!track.isActive ? 'inactive' : ''}`}>
      <div className="track-header">
        <span className="track-title">{typeLabel[track.type]} 轨道</span>
        <button className="track-del" onClick={() => removeTrack(track.id)}>✕</button>
      </div>
      <div className="track-grid">
        <div className="track-prop">
          <label>开始时间(s)</label>
          <input type="number" step="0.1" min="0" value={track.startTime}
            onChange={(e) => updateTrack(track.id, { startTime: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="track-prop">
          <label>持续时间(s)</label>
          <input type="number" step="0.1" min="0.1" value={track.duration}
            onChange={(e) => updateTrack(track.id, { duration: parseFloat(e.target.value) || 0.1 })} />
        </div>
        <div className="track-prop">
          <label>结束值</label>
          <input type="number" step="0.1" value={track.endValue}
            onChange={(e) => updateTrack(track.id, { endValue: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="track-prop">
          <label>曲线</label>
          <select value={track.easing}
            onChange={(e) => updateTrack(track.id, { easing: e.target.value as 'linear' | 'ease-in-out' })}>
            <option value="linear">Linear</option>
            <option value="ease-in-out">Ease In Out</option>
          </select>
        </div>
        <div className="track-prop">
          <label>优先级</label>
          <input type="number" step="1" min="0" value={track.priority}
            onChange={(e) => updateTrack(track.id, { priority: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="track-prop">
          <label>启用</label>
          <select value={track.isActive ? '1' : '0'}
            onChange={(e) => updateTrack(track.id, { isActive: e.target.value === '1' })}>
            <option value="1">启用</option>
            <option value="0">禁用</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ConflictItem({ conflict, shapes }: { conflict: Conflict; shapes: Shape[] }) {
  const { setCurrentTime, selectShape } = useStore();
  const names = conflict.shapeIds.map((id) => shapes.find((s) => s.id === id)?.name || '未知').join(' & ');
  const typeLabel: Record<string, string> = { temporal: '时间冲突', spatial: '空间冲突', both: '时空冲突' };

  return (
    <div className="conflict-item" onClick={() => {
      setCurrentTime(conflict.timeStart);
      if (conflict.shapeIds[0]) selectShape(conflict.shapeIds[0]);
    }}>
      <div className="conflict-title">{typeLabel[conflict.type]}: {names}</div>
      <div className="conflict-meta">重叠区间: {conflict.timeStart.toFixed(1)}s - {conflict.timeEnd.toFixed(1)}s</div>
      <div className="conflict-suggestion">{conflict.suggestion}</div>
    </div>
  );
}

export default function App() {
  const {
    shapes, tracks, conflicts, selectedShapeId, currentTime, duration, isPlaying, speed,
    scheduleMode, shapeStates,
    addShape, removeShape, updateShape, selectShape,
    addTrack, setScheduleMode,
    setCurrentTime, setPlaying, setSpeed, tick, recomputeConflicts,
  } = useStore();

  const [tool, setTool] = useState<ShapeType | null>(null);
  const loopRef = useRef<AnimationLoop | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = styles;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    const loop = new AnimationLoop({
      onTick: (t) => tick(t),
      onStop: () => setPlaying(false),
    });
    loopRef.current = loop;
    return () => loop.destroy();
  }, []);

  useEffect(() => {
    if (loopRef.current) {
      loopRef.current.setDuration(duration);
      loopRef.current.setSpeed(speed);
    }
  }, [duration, speed]);

  useEffect(() => {
    if (loopRef.current) {
      if (isPlaying) loopRef.current.start();
      else loopRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const d = getTotalDuration(tracks);
    if (d !== duration) {
      useStore.setState({ duration: d });
    }
  }, [tracks, duration]);

  useEffect(() => { recomputeConflicts(); }, []);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!tool || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 50;
    const y = e.clientY - rect.top - 40;
    addShape(tool, x, y);
    setTool(null);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setCurrentTime(ratio * duration);
  };

  const handleTimelineInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  const selectedShape = shapes.find((s) => s.id === selectedShapeId) || null;
  const selectedTracks = tracks.filter((t) => t.shapeId === selectedShapeId);
  const conflictTrackIds = new Set(conflicts.flatMap((c) => c.trackIds));

  const rulerTicks = [];
  for (let t = 0; t <= duration; t += Math.max(0.5, duration / 10)) {
    rulerTicks.push(t);
  }

  return (
    <div className="app">
      <div className="main">
        <div className="canvas-wrap">
          <div className="canvas-bg" />
          <div className="toolbar">
            {(['rect', 'circle', 'triangle'] as ShapeType[]).map((t) => (
              <button key={t} className={`tool-btn ${tool === t ? 'active' : ''}`} onClick={() => setTool(tool === t ? null : t)}>
                <ShapeIcon type={t} size={18} />
                {t === 'rect' ? '矩形' : t === 'circle' ? '圆形' : '三角形'}
              </button>
            ))}
          </div>

          <svg ref={svgRef} className="svg-canvas" onClick={handleCanvasClick}>
            {shapes.map((shape) => {
              const st = shapeStates[shape.id] || { x: shape.initialX, y: shape.initialY, rotation: 0, scale: 1 };
              return (
                <ShapeSvg
                  key={shape.id}
                  shape={shape}
                  state={st}
                  selected={selectedShapeId === shape.id}
                  onMouseDown={() => selectShape(shape.id)}
                  onDrag={(dx, dy) => {
                    const cur = shapeStates[shape.id] || { x: shape.x, y: shape.y };
                    updateShape(shape.id, { x: cur.x + dx, y: cur.y + dy });
                  }}
                />
              );
            })}
          </svg>
        </div>

        <div className="panel">
          <div className="panel-section scroll" style={{ maxHeight: '28%' }}>
            <h3>形状列表 ({shapes.length})</h3>
            <div className="shape-list">
              {shapes.length === 0 && <div className="no-conflicts">点击左侧工具添加形状</div>}
              {shapes.map((s) => (
                <div key={s.id} className={`shape-card ${selectedShapeId === s.id ? 'selected' : ''}`} onClick={() => selectShape(s.id)}>
                  <ShapeIcon type={s.type} size={20} />
                  <span style={{ fontSize: 12 }}>{s.name}</span>
                  <button className="del" onClick={(e) => { e.stopPropagation(); removeShape(s.id); }}>×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-section scroll" style={{ maxHeight: '32%' }}>
            <h3>属性 / 轨道</h3>
            {!selectedShape && <div className="no-conflicts">请选择一个形状</div>}
            {selectedShape && (
              <>
                <div className="prop-grid" style={{ marginBottom: 10 }}>
                  <div className="prop">
                    <label>X 位置</label>
                    <input type="number" value={Math.round(selectedShape.x)}
                      onChange={(e) => updateShape(selectedShape.id, { x: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="prop">
                    <label>Y 位置</label>
                    <input type="number" value={Math.round(selectedShape.y)}
                      onChange={(e) => updateShape(selectedShape.id, { y: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="prop">
                    <label>宽度</label>
                    <input type="number" value={selectedShape.width}
                      onChange={(e) => updateShape(selectedShape.id, { width: parseInt(e.target.value) || 1 })} />
                  </div>
                  <div className="prop">
                    <label>高度</label>
                    <input type="number" value={selectedShape.height}
                      onChange={(e) => updateShape(selectedShape.id, { height: parseInt(e.target.value) || 1 })} />
                  </div>
                </div>

                <div className="track-list">
                  {selectedTracks.map((t) => <TrackEditor key={t.id} track={t} />)}
                </div>
                <button className="add-track-btn" onClick={() => addTrack(selectedShape.id, 'translate')}>+ 添加平移动画</button>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button className="add-track-btn" style={{ flex: 1, marginTop: 0 }} onClick={() => addTrack(selectedShape.id, 'rotate')}>+ 旋转</button>
                  <button className="add-track-btn" style={{ flex: 1, marginTop: 0 }} onClick={() => addTrack(selectedShape.id, 'scale')}>+ 缩放</button>
                </div>
              </>
            )}
          </div>

          <div className="panel-section scroll" style={{ flex: 1 }}>
            <h3>冲突检测 ({conflicts.length})</h3>
            <div className="schedule-controls">
              <button className={`schedule-btn ${scheduleMode === 'none' ? 'active' : ''}`} onClick={() => setScheduleMode('none')}>原始</button>
              <button className={`schedule-btn ${scheduleMode === 'stagger' ? 'active' : ''}`} onClick={() => setScheduleMode('stagger')}>错峰调度</button>
              <button className={`schedule-btn ${scheduleMode === 'degrade' ? 'active' : ''}`} onClick={() => setScheduleMode('degrade')}>降级调度</button>
            </div>
            <div className="conflict-list">
              {conflicts.length === 0 && <div className="no-conflicts">✅ 暂无冲突，动画序列和谐</div>}
              {conflicts.map((c) => <ConflictItem key={c.id} conflict={c} shapes={shapes} />)}
            </div>
          </div>
        </div>
      </div>

      <div className="timeline-wrap">
        <div className="playback-controls">
          <button className="play-btn" onClick={() => {
            if (currentTime >= duration) setCurrentTime(0);
            setPlaying(!isPlaying);
          }}>{isPlaying ? '❚❚' : '▶'}</button>
          <button className="ctrl-btn" onClick={() => { setPlaying(false); setCurrentTime(0); }}>重置</button>
          <span className="time-display">{currentTime.toFixed(2)}s / {duration.toFixed(2)}s</span>
          <div className="speed-control">
            <label>速度</label>
            <select value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))}>
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
        </div>
        <div className="timeline-track" onClick={handleTimelineClick}>
          <div className="timeline-ruler">
            {rulerTicks.map((t) => (
              <div key={t} className="tick" style={{ left: `${(t / duration) * 100}%` }}>
                {t.toFixed(1)}
              </div>
            ))}
          </div>
          <div className="timeline-content">
            {tracks.map((track) => {
              const isConflict = conflictTrackIds.has(track.id);
              const left = (track.startTime / duration) * 100;
              const width = (track.duration / duration) * 100;
              const row = shapes.findIndex((s) => s.id === track.shapeId);
              const top = (row % 3) * 7;
              const color = track.type === 'translate' ? '#00d9ff' : track.type === 'rotate' ? '#ffcc00' : '#a855f7';
              return (
                <div key={track.id}
                  className={`timeline-track-bar ${isConflict ? 'conflict' : ''}`}
                  style={{
                    left: `${left}%`, width: `${Math.max(2, width)}%`, top: `${top}px`,
                    borderColor: isConflict ? '#e94560' : color,
                    background: isConflict
                      ? 'linear-gradient(90deg, #e94560, #c03550)'
                      : `linear-gradient(90deg, ${color}40, ${color}60)`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  title={`${track.type} ${track.startTime.toFixed(1)}s-${(track.startTime + track.duration).toFixed(1)}s`}
                >
                  {track.type === 'translate' ? '→' : track.type === 'rotate' ? '↻' : '⤢'}
                </div>
              );
            })}
          </div>
          <div className="playhead" style={{ left: `${(currentTime / duration) * 100}%` }} />
          <input type="range" className="timeline-slider"
            min="0" max={duration} step="0.01" value={currentTime}
            onChange={handleTimelineInput}
            onClick={(e) => e.stopPropagation()} />
        </div>
      </div>
    </div>
  );
}
