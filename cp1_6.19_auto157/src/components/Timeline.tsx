import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TimelineData, TimelineNode, TimelineTick, formatYear } from '../engine/TimelineEngine';

interface TimelineProps {
  timelineData: TimelineData;
  onNodeClick: (node: TimelineNode) => void;
  selectedNodeId?: string;
  searchKeyword?: string;
}

interface HoveredNodeInfo {
  node: TimelineNode;
  x: number;
  y: number;
}

const Timeline: React.FC<TimelineProps> = ({
  timelineData,
  onNodeClick,
  selectedNodeId,
  searchKeyword = ''
}) => {
  const [hoveredNode, setHoveredNode] = useState<HoveredNodeInfo | null>(null);
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width <= 1200);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const nodes = timelineData.nodes;
    const newVisible = new Set<string>();
    let currentIndex = 0;

    const animateIn = () => {
      if (currentIndex < nodes.length) {
        newVisible.add(nodes[currentIndex].id);
        setVisibleNodes(new Set(newVisible));
        currentIndex++;
        animationFrameRef.current = requestAnimationFrame(() => {
          setTimeout(animateIn, 16);
        });
      }
    };

    const timeout = setTimeout(animateIn, 100);
    return () => {
      clearTimeout(timeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mounted, timelineData.nodes.length, searchKeyword]);

  const handleNodeMouseEnter = useCallback((node: TimelineNode, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (rect) {
      setHoveredNode({
        node,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  const handleNodeMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (hoveredNode) {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (rect) {
        setHoveredNode({
          ...hoveredNode,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  }, [hoveredNode]);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const handleNodeClick = useCallback((node: TimelineNode) => {
    setHoveredNode(null);
    onNodeClick(node);
  }, [onNodeClick]);

  const renderTicks = () => {
    if (isMobile) {
      return timelineData.ticks.map((tick: TimelineTick, index: number) => (
        <div
          key={index}
          className="tick"
          style={{
            position: 'absolute',
            left: '0px',
            top: `${tick.position * 100}%`,
            width: '100%',
            height: tick.isMajor ? '3px' : '1px',
            background: tick.isMajor
              ? 'linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0.8), rgba(255,255,255,0.4))'
              : 'rgba(255,255,255,0.15)',
            boxShadow: tick.isMajor ? '0 0 8px rgba(255,255,255,0.3)' : 'none',
            transform: 'translateY(-50%)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {tick.isMajor && tick.label && (
            <span
              style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#ffffff',
                textShadow: '0 0 6px rgba(255,255,255,0.5)',
                whiteSpace: 'nowrap'
              }}
            >
              {tick.label}
            </span>
          )}
        </div>
      ));
    }

    return timelineData.ticks.map((tick: TimelineTick, index: number) => (
      <div
        key={index}
        className="tick"
        style={{
          position: 'absolute',
          left: `${tick.position * 100}%`,
          top: '0px',
          width: tick.isMajor ? '3px' : '1px',
          height: tick.isMajor ? '40px' : '20px',
          background: tick.isMajor
            ? 'linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4))'
            : 'rgba(255,255,255,0.15)',
          boxShadow: tick.isMajor ? '0 0 8px rgba(255,255,255,0.3)' : 'none',
          transform: 'translateX(-50%)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {tick.isMajor && tick.label && (
          <span
            style={{
              position: 'absolute',
              top: '48px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: isTablet ? '11px' : '13px',
              fontWeight: 'bold',
              color: '#ffffff',
              textShadow: '0 0 6px rgba(255,255,255,0.5)',
              whiteSpace: 'nowrap'
            }}
          >
            {tick.label}
          </span>
        )}
      </div>
    ));
  };

  const renderNodes = () => {
    const scale = isTablet ? 0.7 : 1;
    const baseSize = (isMobile ? 16 : 18) * scale;

    return timelineData.nodes.map((node: TimelineNode, index: number) => {
      const isVisible = visibleNodes.has(node.id);
      const isSelected = selectedNodeId === node.id;
      const opacity = searchKeyword ? (isVisible ? 1 : 0) : (isVisible ? 1 : 0);

      if (isMobile) {
        return (
          <div
            key={node.id}
            onClick={() => handleNodeClick(node)}
            onMouseEnter={(e) => handleNodeMouseEnter(node, e)}
            onMouseMove={handleNodeMouseMove}
            onMouseLeave={handleNodeMouseLeave}
            style={{
              position: 'absolute',
              right: '24px',
              top: `${node.position * 100}%`,
              width: `${baseSize}px`,
              height: `${baseSize}px`,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, ${node.color}, ${node.color}99)`,
              boxShadow: isSelected
                ? `0 0 0 4px ${node.color}40, 0 0 16px ${node.color}`
                : `0 0 8px ${node.color}80`,
              cursor: 'pointer',
              transform: 'translateY(-50%)',
              opacity: opacity,
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              transitionDelay: `${index * 16}ms`,
              zIndex: isSelected ? 10 : 5,
              border: isSelected ? '2px solid #fff' : 'none'
            }}
            className="timeline-node"
          />
        );
      }

      return (
        <div
          key={node.id}
          onClick={() => handleNodeClick(node)}
          onMouseEnter={(e) => handleNodeMouseEnter(node, e)}
          onMouseMove={handleNodeMouseMove}
          onMouseLeave={handleNodeMouseLeave}
          style={{
            position: 'absolute',
            left: `${node.position * 100}%`,
            top: '50%',
            width: `${baseSize}px`,
            height: `${baseSize}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, ${node.color}, ${node.color}99)`,
            boxShadow: isSelected
              ? `0 0 0 4px ${node.color}40, 0 0 16px ${node.color}`
              : `0 0 8px ${node.color}80`,
            cursor: 'pointer',
            transform: 'translate(-50%, -50%)',
            opacity: opacity,
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            transitionDelay: `${index * 16}ms`,
            zIndex: isSelected ? 10 : 5,
            border: isSelected ? '2px solid #fff' : 'none'
          }}
          className="timeline-node"
        />
      );
    });
  };

  const renderEmptyState = () => {
    if (timelineData.nodes.length === 0 && searchKeyword) {
      if (isMobile) {
        return (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '16px',
              color: 'rgba(224, 224, 224, 0.5)',
              textAlign: 'center',
              width: '80%'
            }}
          >
            未找到相关事件
          </div>
        );
      }
      return (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -120%)',
            fontSize: '18px',
            color: 'rgba(224, 224, 224, 0.5)',
            textAlign: 'center'
          }}
        >
          未找到相关事件
        </div>
      );
    }
    return null;
  };

  const renderHoverTooltip = () => {
    if (!hoveredNode) return null;

    const bubbleWidth = 200;
    let tooltipX = hoveredNode.x + 15;
    let tooltipY = hoveredNode.y - 60;

    const rect = timelineRef.current?.getBoundingClientRect();
    if (rect) {
      if (tooltipX + bubbleWidth > rect.width) {
        tooltipX = hoveredNode.x - bubbleWidth - 15;
      }
      if (tooltipY < 0) {
        tooltipY = hoveredNode.y + 15;
      }
    }

    return (
      <div
        style={{
          position: 'absolute',
          left: `${tooltipX}px`,
          top: `${tooltipY}px`,
          width: `${bubbleWidth}px`,
          padding: '12px 14px',
          background: 'rgba(20, 25, 40, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '10px',
          border: `1px solid ${hoveredNode.node.color}40`,
          boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 12px ${hoveredNode.node.color}30`,
          pointerEvents: 'none',
          zIndex: 100,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: '6px',
            lineHeight: '1.4'
          }}
        >
          {hoveredNode.node.event.name}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: hoveredNode.node.color,
            fontWeight: '500'
          }}
        >
          {formatYear(hoveredNode.node.event.year)}
        </div>
      </div>
    );
  };

  const timelineStyle: React.CSSProperties = isMobile
    ? {
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #1a3a5c 0%, #2a5a8c 50%, #1a4a4c 100%)',
        borderRadius: '12px',
        overflow: 'hidden',
        padding: '40px 0',
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4)'
      }
    : {
        position: 'relative',
        width: '100%',
        height: isTablet ? '140px' : '180px',
        background: 'linear-gradient(180deg, #1a3a5c 0%, #2a5a8c 50%, #1a4a4c 100%)',
        borderRadius: '12px',
        overflow: 'hidden',
        padding: isTablet ? '30px 20px' : '40px 30px',
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4)'
      };

  const axisStyle: React.CSSProperties = isMobile
    ? {
        position: 'absolute',
        left: '50%',
        top: '0',
        width: '4px',
        height: '100%',
        background: 'linear-gradient(180deg, rgba(100,180,255,0.3) 0%, rgba(100,180,255,0.8) 50%, rgba(100,180,255,0.3) 100%)',
        boxShadow: '0 0 15px rgba(100,180,255,0.4)',
        transform: 'translateX(-50%)',
        borderRadius: '2px'
      }
    : {
        position: 'absolute',
        left: '30px',
        right: '30px',
        top: '50%',
        height: '4px',
        background: 'linear-gradient(90deg, rgba(100,180,255,0.3) 0%, rgba(100,180,255,0.8) 50%, rgba(100,180,255,0.3) 100%)',
        boxShadow: '0 0 15px rgba(100,180,255,0.4)',
        transform: 'translateY(-50%)',
        borderRadius: '2px'
      };

  return (
    <div
      ref={timelineRef}
      style={timelineStyle}
    >
      <div style={axisStyle} />
      {renderTicks()}
      {renderNodes()}
      {renderEmptyState()}
      {renderHoverTooltip()}
    </div>
  );
};

export default Timeline;
