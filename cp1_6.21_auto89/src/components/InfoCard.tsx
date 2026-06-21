import { useEffect, useRef, useState } from 'react';
import type { GraphNode } from '../types';

interface InfoCardProps {
  node: GraphNode;
  nodes: GraphNode[];
  themeColor: string;
  onClose: () => void;
  onConnectionClick: (nodeId: string) => void;
}

export default function InfoCard({
  node,
  nodes,
  themeColor,
  onClose,
  onConnectionClick,
}: InfoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const connectionNodes = node.connections
    .map((connId) => nodes.find((n) => n.id === connId))
    .filter(Boolean) as GraphNode[];

  useEffect(() => {
    const updatePosition = () => {
      if (cardRef.current) {
        const cardWidth = cardRef.current.offsetWidth;
        const cardHeight = cardRef.current.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const targetX = window.innerWidth / 2 + 50;
        const targetY = window.innerHeight / 2 - cardHeight / 2;

        const x = Math.min(targetX, windowWidth - cardWidth - 24);
        const y = Math.max(80, Math.min(targetY, windowHeight - cardHeight - 80));

        setPosition({ x, y });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);

  return (
    <div
      ref={cardRef}
      className="info-card"
      style={{
        left: position.x,
        top: position.y,
        borderColor: `${themeColor}66`,
        boxShadow: `0 20px 40px rgba(0, 0, 0, 0.4), 0 0 40px ${themeColor}22`,
      }}
    >
      <div className="card-header">
        <span
          className="card-color-dot"
          style={{ backgroundColor: themeColor, boxShadow: `0 0 12px ${themeColor}` }}
        />
        <h3 className="card-title">{node.title}</h3>
        <button className="card-close" onClick={onClose} title="关闭">
          ×
        </button>
      </div>

      <p className="card-summary">{node.summary}</p>

      {connectionNodes.length > 0 && (
        <>
          <div className="card-section-title">关联知识点</div>
          <div className="connections-list">
            {connectionNodes.map((connNode) => (
              <span
                key={connNode.id}
                className="connection-tag"
                onClick={() => onConnectionClick(connNode.id)}
                style={{
                  borderColor: `${themeColor}44`,
                  background: `${themeColor}11`,
                }}
              >
                {connNode.title}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
