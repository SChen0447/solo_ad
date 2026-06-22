import React, { useEffect, useRef } from 'react';
import { TrafficRenderer } from '@3d/renderer';
import { Controls } from '@ui/controls';
import type { NodeData, TrafficPacket } from '@data/fetch';

export const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<TrafficRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new TrafficRenderer(containerRef.current);
    rendererRef.current = renderer;
    renderer.start();

    return () => {
      renderer.stop();
    };
  }, []);

  const handleSnapshotLoad = (nodes: NodeData[], packets: TrafficPacket[]) => {
    if (rendererRef.current) {
      rendererRef.current.applySnapshot(nodes, packets);
    }
  };

  return (
    <div style={appStyle}>
      <div ref={containerRef} style={canvasContainerStyle} />
      <Controls onSnapshotLoad={handleSnapshotLoad} />
    </div>
  );
};

const appStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
  background: 'linear-gradient(135deg, #0b0f1a 0%, #1a2639 100%)',
};

const canvasContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'absolute',
  top: 0,
  left: 0,
};
