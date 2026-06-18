import { useRef, useState, useEffect } from 'react';
import { GripVertical, Plus, X } from 'lucide-react';
import { useGradientStore } from '@/store/gradientStore';
import type { ColorStop } from '@/types';
import styles from './PaletteEditor.module.css';

let nextStopId = 100;
function genStopId(): string {
  return `stop-${Date.now()}-${nextStopId++}`;
}

const ANGLE_PRESETS = [0, 45, 90, 135, 180, 225, 270, 315];

export default function PaletteEditor() {
  const currentScheme = useGradientStore((s) => s.currentScheme);
  const updateColorStops = useGradientStore((s) => s.updateColorStops);
  const updateGradientType = useGradientStore((s) => s.updateGradientType);
  const updateAngle = useGradientStore((s) => s.updateAngle);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const dialRef = useRef<HTMLDivElement>(null);

  const handleAddStop = () => {
    if (currentScheme.colorStops.length >= 8) return;
    const existing = [...currentScheme.colorStops].sort(
      (a, b) => a.position - b.position
    );
    let newColor = '#6366f1';
    let newPosition = 50;
    if (existing.length >= 2) {
      const mid = Math.floor(existing.length / 2);
      const a = existing[mid - 1];
      const b = existing[mid];
      newColor = a.color;
      newPosition = Math.round((a.position + b.position) / 2);
    }
    const newStop: ColorStop = {
      id: genStopId(),
      color: newColor,
      position: newPosition,
    };
    const updated = [...currentScheme.colorStops, newStop];
    updateColorStops(updated);
  };

  const handleRemoveStop = (id: string) => {
    if (currentScheme.colorStops.length <= 2) return;
    const updated = currentScheme.colorStops.filter((s) => s.id !== id);
    updateColorStops(updated);
  };

  const handleStopColorChange = (id: string, color: string) => {
    const updated = currentScheme.colorStops.map((s) =>
      s.id === id ? { ...s, color } : s
    );
    updateColorStops(updated);
  };

  const handleStopPositionChange = (id: string, position: number) => {
    const updated = currentScheme.colorStops.map((s) =>
      s.id === id ? { ...s, position } : s
    );
    updateColorStops(updated);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggingId || e.dataTransfer.getData('text/plain');
    setDraggingId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === targetId) return;
    const stops = [...currentScheme.colorStops];
    const sourceIdx = stops.findIndex((s) => s.id === sourceId);
    const targetIdx = stops.findIndex((s) => s.id === targetId);
    if (sourceIdx < 0 || targetIdx < 0) return;
    const [removed] = stops.splice(sourceIdx, 1);
    stops.splice(targetIdx, 0, removed);
    updateColorStops(stops);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const computeAngleFromPointer = (clientX: number, clientY: number): number => {
    const dial = dialRef.current;
    if (!dial) return currentScheme.angle;
    const rect = dial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;
    return Math.round(deg) % 360;
  };

  const handleRotateStart = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    setIsRotating(true);
    const angle = computeAngleFromPointer(e.clientX, e.clientY);
    updateAngle(angle);
  };

  const handleRotateMove = (e: React.PointerEvent) => {
    if (!isRotating) return;
    const angle = computeAngleFromPointer(e.clientX, e.clientY);
    updateAngle(angle);
  };

  const handleRotateEnd = (e: React.PointerEvent) => {
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setIsRotating(false);
  };

  useEffect(() => {
    if (!isRotating) return;
    const onWindowMove = (ev: PointerEvent) => {
      const angle = computeAngleFromPointer(ev.clientX, ev.clientY);
      updateAngle(angle);
    };
    const onWindowUp = () => setIsRotating(false);
    window.addEventListener('pointermove', onWindowMove);
    window.addEventListener('pointerup', onWindowUp);
    return () => {
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onWindowUp);
    };
  }, [isRotating, currentScheme.angle]);

  const sortedStops = [...currentScheme.colorStops].sort(
    (a, b) => a.position - b.position
  );

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <h3 className={styles.title}>调色板编辑器</h3>
        <label className={styles.sectionLabel}>渐变类型</label>
        <div className={styles.typeSwitch}>
          <button
            className={`${styles.typeBtn} ${
              currentScheme.gradientType === 'linear' ? styles.active : ''
            }`}
            onClick={() => updateGradientType('linear')}
          >
            线性渐变
          </button>
          <button
            className={`${styles.typeBtn} ${
              currentScheme.gradientType === 'radial' ? styles.active : ''
            }`}
            onClick={() => updateGradientType('radial')}
          >
            径向渐变
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <label className={styles.sectionLabel}>颜色停止点（可拖拽排序）</label>
        <div className={styles.stopsList}>
          {sortedStops.map((stop) => (
            <div
              key={stop.id}
              className={`${styles.stopItem} ${
                draggingId === stop.id ? styles.dragging : ''
              } ${dragOverId === stop.id ? styles.dragOver : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, stop.id)}
              onDragOver={(e) => handleDragOver(e, stop.id)}
              onDrop={(e) => handleDrop(e, stop.id)}
              onDragEnd={handleDragEnd}
            >
              <span className={styles.dragHandle}>
                <GripVertical size={18} />
              </span>
              <input
                type="color"
                value={stop.color}
                onChange={(e) => handleStopColorChange(stop.id, e.target.value)}
                className={styles.colorInput}
              />
              <div className={styles.stopPosition}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={stop.position}
                  onChange={(e) =>
                    handleStopPositionChange(stop.id, Number(e.target.value))
                  }
                />
                <span className={styles.positionValue}>{stop.position}%</span>
              </div>
              <button
                className={styles.removeBtn}
                onClick={() => handleRemoveStop(stop.id)}
                disabled={sortedStops.length <= 2}
                title="删除停止点"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            className={styles.addBtn}
            onClick={handleAddStop}
            disabled={sortedStops.length >= 8}
          >
            <Plus size={16} /> 添加停止点
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <label className={styles.sectionLabel}>渐变方向</label>
        <div className={styles.angleControl}>
          <div className={styles.angleDialWrapper}>
            <div
              ref={dialRef}
              className={styles.angleDial}
              onPointerDown={handleRotateStart}
              onPointerMove={handleRotateMove}
              onPointerUp={handleRotateEnd}
              onPointerCancel={handleRotateEnd}
              style={{
                cursor: isRotating ? 'grabbing' : 'grab',
              }}
            >
              <div className={styles.angleDialInner}>
                <div
                  className={styles.arrowIndicator}
                  style={{ transform: `rotate(${currentScheme.angle}deg)` }}
                />
                <div className={styles.angleValue}>{currentScheme.angle}</div>
                <div className={styles.angleUnit}>度</div>
              </div>
            </div>
          </div>
          <div className={styles.anglePresets}>
            {ANGLE_PRESETS.map((a) => (
              <button
                key={a}
                className={`${styles.presetBtn} ${
                  currentScheme.angle === a ? styles.active : ''
                }`}
                onClick={() => updateAngle(a)}
              >
                {a}°
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
