import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SVGCanvas from './SVGCanvas';
import Timeline from './Timeline';
import ExportPanel from './ExportPanel';
import type { Shape, Keyframe, ShapeType, KeyframeProperty } from './types';

const shapeIcons: Record<ShapeType, string> = {
  circle: '●',
  rectangle: '■',
  star: '★',
  bezier: '〰',
};

const shapeLabels: Record<ShapeType, string> = {
  circle: '圆形',
  rectangle: '矩形',
  star: '星形',
  bezier: '贝塞尔曲线',
};

const keyframeProperties: { key: KeyframeProperty; label: string }[] = [
  { key: 'position', label: '位置' },
  { key: 'rotation', label: '旋转' },
  { key: 'scale', label: '缩放' },
  { key: 'strokeLength', label: '描边长度' },
];

export default function App() {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(5000);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [statusMessage, setStatusMessage] = useState('就绪');

  useEffect(() => {
    const checkWidth = () => setIsNarrow(window.innerWidth < 960);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const startTime = performance.now() - currentTime;
    let rafId: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed >= duration) {
        setCurrentTime(0);
        setIsPlaying(false);
        return;
      }
      setCurrentTime(elapsed);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, duration]);

  const addShape = useCallback((type: ShapeType) => {
    const id = `shape-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const name = `${shapeLabels[type]} ${shapes.filter(s => s.type === type).length + 1}`;
    const newShape: Shape = {
      id,
      type,
      name,
      stroke: '#3b82f6',
      strokeWidth: 2,
      fill: type === 'bezier' ? 'none' : 'rgba(59, 130, 246, 0.1)',
      transform: { x: 0, y: 0, rotation: 0, scale: 1 },
      anchors: [],
    };

    const centerX = 400;
    const centerY = 250;

    switch (type) {
      case 'circle':
        newShape.anchors = [
          { id: `${id}-center`, x: centerX, y: centerY, type: 'move' },
          { id: `${id}-r`, x: centerX + 60, y: centerY, type: 'radius' },
        ];
        break;
      case 'rectangle':
        newShape.anchors = [
          { id: `${id}-tl`, x: centerX - 70, y: centerY - 50, type: 'corner' },
          { id: `${id}-tr`, x: centerX + 70, y: centerY - 50, type: 'corner' },
          { id: `${id}-br`, x: centerX + 70, y: centerY + 50, type: 'corner' },
          { id: `${id}-bl`, x: centerX - 70, y: centerY + 50, type: 'corner' },
        ];
        break;
      case 'star':
        const starPoints = 5;
        const outerR = 60;
        const innerR = 28;
        const starAnchors = [];
        for (let i = 0; i < starPoints * 2; i++) {
          const angle = (i * Math.PI) / starPoints - Math.PI / 2;
          const r = i % 2 === 0 ? outerR : innerR;
          starAnchors.push({
            id: `${id}-p${i}`,
            x: centerX + Math.cos(angle) * r,
            y: centerY + Math.sin(angle) * r,
            type: 'point' as const,
          });
        }
        newShape.anchors = starAnchors;
        break;
      case 'bezier':
        newShape.anchors = [
          { id: `${id}-start`, x: centerX - 120, y: centerY, type: 'move' },
          { id: `${id}-c1`, x: centerX - 40, y: centerY - 80, type: 'control' },
          { id: `${id}-c2`, x: centerX + 40, y: centerY + 80, type: 'control' },
          { id: `${id}-end`, x: centerX + 120, y: centerY, type: 'point' },
        ];
        break;
    }

    setShapes(prev => [...prev, newShape]);
    setSelectedShapeId(id);
    setStatusMessage(`已添加 ${name}`);
  }, [shapes]);

  const updateShape = useCallback((shapeId: string, updater: (shape: Shape) => Shape) => {
    setShapes(prev => prev.map(s => (s.id === shapeId ? updater(s) : s)));
  }, []);

  const deleteShape = useCallback((shapeId: string) => {
    setShapes(prev => prev.filter(s => s.id !== shapeId));
    setKeyframes(prev => prev.filter(k => k.shapeId !== shapeId));
    if (selectedShapeId === shapeId) setSelectedShapeId(null);
    setStatusMessage('已删除图形');
  }, [selectedShapeId]);

  const addKeyframe = useCallback((shapeId: string, property: KeyframeProperty, time: number) => {
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    let value: number | { x: number; y: number };
    switch (property) {
      case 'position':
        value = { x: shape.transform.x, y: shape.transform.y };
        break;
      case 'rotation':
        value = shape.transform.rotation;
        break;
      case 'scale':
        value = shape.transform.scale;
        break;
      case 'strokeLength':
        value = 1;
        break;
    }

    const kf: Keyframe = {
      id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      shapeId,
      property,
      time,
      value,
      easing: 'ease-in-out',
    };
    setKeyframes(prev => [...prev, kf]);
    setStatusMessage(`已添加 ${shape.name} 的 ${keyframeProperties.find(p => p.key === property)?.label} 关键帧`);
  }, [shapes]);

  const updateKeyframe = useCallback((kfId: string, updater: (kf: Keyframe) => Keyframe) => {
    setKeyframes(prev => prev.map(k => (k.id === kfId ? updater(k) : k)));
  }, []);

  const deleteKeyframe = useCallback((kfId: string) => {
    setKeyframes(prev => prev.filter(k => k.id !== kfId));
    setStatusMessage('已删除关键帧');
  }, []);

  const selectedShape = shapes.find(s => s.id === selectedShapeId) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', background: '#f8fafc', minWidth: 960 }}>
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        <motion.nav
          initial={false}
          animate={isNarrow ? {
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 50,
            borderRadius: 12,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            borderRight: 'none',
          } : {
            position: 'relative',
            top: 0,
            left: 0,
            zIndex: 1,
            borderRadius: 0,
            boxShadow: 'none',
            borderRight: '1px solid #e2e8f0',
          }}
          style={{
            width: 56,
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 0',
            gap: 4,
            flexShrink: 0,
          }}
          transition={{ duration: 0.2, ease: 'ease-out' }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 12, letterSpacing: -1 }}>S</div>
          {(Object.keys(shapeIcons) as ShapeType[]).map(type => (
            <motion.button
              key={type}
              whileHover={{ scale: 1.1, backgroundColor: '#f1f5f9' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => addShape(type)}
              title={shapeLabels[type]}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: 'transparent',
                color: '#3b82f6',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {shapeIcons[type]}
            </motion.button>
          ))}

          <div style={{ width: 32, height: 1, background: '#e2e8f0', margin: '12px 0' }} />

          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: '#f1f5f9' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowExportModal(true)}
            title="导出"
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: '#22c55e',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 'auto',
            }}
          >
            ⬇
          </motion.button>
        </motion.nav>

        <main style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
          <header style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
          }}>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0 }}>SVG 动画编辑器</h1>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>拖拽锚点编辑图形，右侧时间轴添加动画关键帧</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {Math.round(currentTime)}ms / {duration}ms
              </span>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsPlaying(p => !p)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  background: isPlaying ? '#ef4444' : '#3b82f6',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {isPlaying ? '■ 停止' : '▶ 播放'}
              </motion.button>
            </div>
          </header>

          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <SVGCanvas
                shapes={shapes}
                selectedShapeId={selectedShapeId}
                onSelectShape={setSelectedShapeId}
                onUpdateShape={updateShape}
                onDeleteShape={deleteShape}
                currentTime={currentTime}
                keyframes={keyframes}
                duration={duration}
              />
            </div>

            <div style={{
              width: 360,
              flexShrink: 0,
              borderLeft: '1px solid #e2e8f0',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <Timeline
                shapes={shapes}
                keyframes={keyframes}
                selectedShapeId={selectedShapeId}
                duration={duration}
                currentTime={currentTime}
                onSelectShape={setSelectedShapeId}
                onAddKeyframe={addKeyframe}
                onUpdateKeyframe={updateKeyframe}
                onDeleteKeyframe={deleteKeyframe}
                onUpdateShape={updateShape}
                onSeek={setCurrentTime}
              />
            </div>
          </div>
        </main>
      </div>

      <footer style={{
        height: 32,
        background: '#f1f5f9',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        fontSize: 12,
        color: '#64748b',
        flexShrink: 0,
        gap: 24,
      }}>
        <span>● {statusMessage}</span>
        <span>图形: {shapes.length}</span>
        <span>关键帧: {keyframes.length}</span>
        {selectedShape && <span>选中: {selectedShape.name}</span>}
      </footer>

      <AnimatePresence>
        {showExportModal && (
          <ExportPanel
            shapes={shapes}
            keyframes={keyframes}
            duration={duration}
            onClose={() => setShowExportModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
