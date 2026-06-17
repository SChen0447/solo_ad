import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { TreeNodeData, ConnectionData } from '../hooks/useTreeData';

interface MiniPreviewProps {
  nodes: TreeNodeData[];
  connections: ConnectionData[];
}

function MiniPreviewContent({ nodes, connections }: MiniPreviewProps) {
  const nodeMap = useMemo(() => {
    const map = new Map<string, TreeNodeData>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  return (
    <>
      <ambientLight intensity={0.5} />
      {connections.map(conn => {
        const fromNode = nodeMap.get(conn.from);
        const toNode = nodeMap.get(conn.to);
        if (!fromNode || !toNode) return null;
        return (
          <Line
            key={conn.id}
            points={[fromNode.position, toNode.position]}
            color={conn.color}
            transparent
            opacity={0.5}
            lineWidth={1}
          />
        );
      })}
      {nodes.map(node => (
        <mesh key={node.id} position={node.position}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={0.2} />
        </mesh>
      ))}
    </>
  );
}

export function MiniPreview({ nodes, connections }: MiniPreviewProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        width: '200px',
        height: '200px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(100, 150, 255, 0.3)',
        background: 'rgba(0, 10, 30, 0.6)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 20px rgba(0, 100, 255, 0.2)',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '6px',
          left: '10px',
          color: '#88CCFF',
          fontSize: '11px',
          fontFamily: 'system-ui, sans-serif',
          opacity: 0.8,
          pointerEvents: 'none',
          textShadow: '0 0 4px rgba(0,0,0,0.8)',
        }}
      >
        拓扑预览
      </div>
      <Canvas
        camera={{ position: [0, 5, 15], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
      >
        <MiniPreviewContent nodes={nodes} connections={connections} />
      </Canvas>
    </div>
  );
}
