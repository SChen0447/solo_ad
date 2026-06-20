import React, { useMemo } from 'react';
import { LayoutSnapshot, calculatePositions, calculateTotalHeight, GAP } from '../utils/layoutEngine';
import { motion } from 'framer-motion';

interface SnapshotViewProps {
  snapshots: LayoutSnapshot[];
}

const SnapshotView: React.FC<SnapshotViewProps> = ({ snapshots }) => {
  if (snapshots.length === 0) return null;

  const SCALE = 0.5;

  return (
    <div
      style={{
        width: '100%',
        background: '#f9fafb',
        borderTop: '1px solid #e5e7eb',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxHeight: 320,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>快照对比</span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>
          ({snapshots.length} 组快照，0.5倍缩放展示)
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: 8,
          flex: 1,
          alignItems: 'flex-start',
        }}
      >
        {snapshots.map((snapshot, index) => (
          <SnapshotCard key={snapshot.id} snapshot={snapshot} index={index} scale={SCALE} />
        ))}
      </div>
    </div>
  );
};

interface SnapshotCardProps {
  snapshot: LayoutSnapshot;
  index: number;
  scale: number;
}

const SnapshotCard: React.FC<SnapshotCardProps> = ({ snapshot, index, scale }) => {
  const positions = useMemo(
    () => calculatePositions(snapshot.containerWidth - 24, snapshot.components, GAP),
    [snapshot]
  );

  const totalHeight = useMemo(() => calculateTotalHeight(positions, GAP), [positions]);
  const contentHeight = Math.max(totalHeight + 24, 120);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        flexShrink: 0,
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
        快照 #{index + 1} · {snapshot.containerWidth}px
      </div>

      <div
        style={{
          overflow: 'auto',
          borderRadius: 4,
          border: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: snapshot.containerWidth,
            minHeight: contentHeight,
            padding: 12,
            border: `2px dashed #aaa`,
            background: '#fff',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: Math.max(totalHeight, 40),
            }}
          >
            {snapshot.components.map((comp) => {
              const pos = positions.find((p) => p.id === comp.id);
              if (!pos) return null;
              return (
                <div
                  key={comp.id}
                  style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    width: pos.width,
                    height: pos.height,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    background: 'rgba(248,249,250,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: '#6b7280',
                  }}
                >
                  {comp.type}
                </div>
              );
            })}

            {snapshot.components.length === 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 12,
                  color: '#b0b0b0',
                }}
              >
                空布局
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SnapshotView;
