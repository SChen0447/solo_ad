import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useStoryStore } from '@/store';
import { StoryNode } from '@/types';
import TimelineNode from './TimelineNode';
import RelationshipLine from './RelationshipLine';
import ParticleBackground from './ParticleBackground';

interface TimelineProps {
  onNodePositionsChange?: (nodes: StoryNode[]) => void;
}

const Timeline: React.FC<TimelineProps> = ({ onNodePositionsChange }) => {
  const {
    story,
    selectedNodeId,
    selectNode,
    updateNode,
    calculateNodePositions,
    mode,
  } = useStoryStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, scrollStart: 0, nodeStartX: 0 });
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const lastMoveRef = useRef({ x: 0, y: 0, time: 0 });
  const animationRef = useRef<number | null>(null);

  const positionedNodes = useMemo(() => {
    const nodes = calculateNodePositions();
    return nodes;
  }, [story.nodes, calculateNodePositions]);

  const { visibleNodes, visibleRelationships } = useMemo(() => {
    const viewportLeft = scrollLeft - 100;
    const viewportRight = scrollLeft + containerWidth + 100;

    const visible = positionedNodes.filter(
      (node) => node.positionX >= viewportLeft && node.positionX <= viewportRight
    );

    const visibleIds = new Set(visible.map((n) => n.id));
    const rels = story.relationships.filter(
      (r) => visibleIds.has(r.fromNodeId) || visibleIds.has(r.toNodeId)
    );

    return { visibleNodes: visible, visibleRelationships: rels };
  }, [positionedNodes, story.relationships, scrollLeft, containerWidth]);

  const totalWidth = useMemo(() => {
    if (positionedNodes.length === 0) return 2000;
    const maxX = Math.max(...positionedNodes.map((n) => n.positionX));
    return Math.max(maxX + 200, 2000);
  }, [positionedNodes]);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  useEffect(() => {
    if (onNodePositionsChange) {
      onNodePositionsChange(positionedNodes);
    }
  }, [positionedNodes, onNodePositionsChange]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    containerRef.current.scrollLeft += e.deltaY;
  }, []);

  const startInertia = useCallback(() => {
    const friction = 0.85;
    const animate = () => {
      if (!containerRef.current) return;

      velocityRef.current.vx *= friction;
      velocityRef.current.vy *= friction;

      if (Math.abs(velocityRef.current.vx) > 0.1) {
        containerRef.current.scrollLeft += velocityRef.current.vx;
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const stopInertia = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    velocityRef.current = { vx: 0, vy: 0 };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (mode !== 'edit') return;
      stopInertia();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollStart: containerRef.current?.scrollLeft || 0,
        nodeStartX: 0,
      };
      lastMoveRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    },
    [mode, stopInertia]
  );

  const handleNodeDragStart = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if (mode !== 'edit') return;
      stopInertia();
      setDraggedNodeId(nodeId);
      const node = positionedNodes.find((n) => n.id === nodeId);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollStart: containerRef.current?.scrollLeft || 0,
        nodeStartX: node?.positionX || 0,
      };
      lastMoveRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
      selectNode(nodeId);
    },
    [mode, positionedNodes, selectNode, stopInertia]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const now = Date.now();
      const dt = now - lastMoveRef.current.time;

      if (dt > 0) {
        velocityRef.current.vx = (e.clientX - lastMoveRef.current.x) / dt * 16;
        velocityRef.current.vy = (e.clientY - lastMoveRef.current.y) / dt * 16;
      }
      lastMoveRef.current = { x: e.clientX, y: e.clientY, time: now };

      if (draggedNodeId && mode === 'edit') {
        const dx = e.clientX - dragStartRef.current.x;
        const scrollDelta = (containerRef.current?.scrollLeft || 0) - dragStartRef.current.scrollStart;
        const newX = dragStartRef.current.nodeStartX + dx + scrollDelta;

        updateNode(draggedNodeId, { positionX: Math.max(50, newX) });
      } else if (isDragging && containerRef.current && mode === 'edit') {
        const dx = e.clientX - dragStartRef.current.x;
        containerRef.current.scrollLeft = dragStartRef.current.scrollStart - dx;
      }
    },
    [draggedNodeId, isDragging, mode, updateNode]
  );

  const handleMouseUp = useCallback(() => {
    if (draggedNodeId) {
      setDraggedNodeId(null);
    }
    if (isDragging) {
      setIsDragging(false);
      startInertia();
    }
  }, [draggedNodeId, isDragging, startInertia]);

  useEffect(() => {
    if (isDragging || draggedNodeId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, draggedNodeId, handleMouseMove, handleMouseUp]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollLeft(containerRef.current.scrollLeft);
    }
  }, []);

  const handleContainerClick = useCallback(() => {
    if (!draggedNodeId && !isDragging) {
      selectNode(null);
    }
  }, [draggedNodeId, isDragging, selectNode]);

  const svgWidth = Math.max(totalWidth, scrollLeft + containerWidth + 200);

  return (
    <div
      ref={containerRef}
      className="timeline-container"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onScroll={handleScroll}
      onClick={handleContainerClick}
    >
      <ParticleBackground />
      <div className="timeline-content" style={{ width: totalWidth }}>
        <svg
          className="relationships-svg"
          width={svgWidth}
          height="100%"
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          {visibleRelationships.map((rel) => (
            <RelationshipLine
              key={rel.id}
              relationship={rel}
              nodes={positionedNodes}
              onClick={() => {}}
            />
          ))}
        </svg>

        {visibleNodes.map((node) => (
          <TimelineNode
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            onClick={() => selectNode(node.id)}
            onDragStart={handleNodeDragStart}
          />
        ))}

        <div className="timeline-axis" style={{ width: totalWidth }}>
          {positionedNodes.map((node) => (
            <div
              key={`tick-${node.id}`}
              className="timeline-axis__tick"
              style={{ left: node.positionX }}
            >
              <div className="timeline-axis__line"></div>
              <div className="timeline-axis__label">{node.date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
