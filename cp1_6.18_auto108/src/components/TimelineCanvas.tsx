import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import TimelineRenderer from './TimelineRenderer';
import { useMetaStore } from '../stores/metaStore';

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
}

interface NodeDragState {
  isDragging: boolean;
  eventId: string;
  startX: number;
  startOrder: number;
}

const TimelineCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const panDragRef = useRef<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0
  });

  const nodeDragRef = useRef<NodeDragState>({
    isDragging: false,
    eventId: '',
    startX: 0,
    startOrder: 0
  });

  const rafRef = useRef<number | null>(null);

  const {
    events,
    config,
    setPan,
    setScale,
    moveEvent,
    setShowEditModal,
    setSelectedEvent,
    setHighlightedCharacter,
    addEvent
  } = useMetaStore(useShallow((state) => ({
    events: state.events,
    config: state.config,
    setPan: state.setPan,
    setScale: state.setScale,
    moveEvent: state.moveEvent,
    setShowEditModal: state.setShowEditModal,
    setSelectedEvent: state.setSelectedEvent,
    setHighlightedCharacter: state.setHighlightedCharacter,
    addEvent: state.addEvent
  })));

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(3, config.scale + delta));
    
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const oldScale = config.scale;
      const scaleRatio = newScale / oldScale;
      
      const newPanX = mouseX - (mouseX - config.panX) * scaleRatio;
      const newPanY = mouseY - (mouseY - config.panY) * scaleRatio;
      
      setScale(newScale);
      setPan(newPanX, newPanY);
    }
  }, [config.scale, config.panX, config.panY, setScale, setPan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    panDragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: config.panX,
      startPanY: config.panY
    };
  }, [config.panX, config.panY]);

  const handleNodeMouseDown = useCallback((eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const event = events.find(ev => ev.id === eventId);
    if (!event) return;

    nodeDragRef.current = {
      isDragging: true,
      eventId,
      startX: e.clientX,
      startOrder: event.order
    };

    setSelectedEvent(eventId);
  }, [events, setSelectedEvent]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (nodeDragRef.current.isDragging) {
      e.preventDefault();
      
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        if (!nodeDragRef.current.isDragging) return;

        const deltaX = e.clientX - nodeDragRef.current.startX;
        const orderDelta = Math.round(deltaX / (config.nodeSpacing * config.scale));
        const newOrder = nodeDragRef.current.startOrder + orderDelta;
        
        const clampedNewOrder = Math.max(0, Math.min(newOrder, events.length - 1));
        
        moveEvent(nodeDragRef.current.eventId, clampedNewOrder);
      });
    } else if (panDragRef.current.isDragging) {
      e.preventDefault();
      
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        if (!panDragRef.current.isDragging) return;

        const deltaX = e.clientX - panDragRef.current.startX;
        const deltaY = e.clientY - panDragRef.current.startY;
        
        setPan(
          panDragRef.current.startPanX + deltaX,
          panDragRef.current.startPanY + deltaY
        );
      });
    }
  }, [config.nodeSpacing, config.scale, events.length, moveEvent, setPan]);

  const handleMouseUp = useCallback(() => {
    panDragRef.current.isDragging = false;
    nodeDragRef.current.isDragging = false;
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    panDragRef.current.isDragging = false;
    nodeDragRef.current.isDragging = false;
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const handleNodeDoubleClick = useCallback((eventId: string) => {
    setShowEditModal(true, eventId);
  }, [setShowEditModal]);

  const handleNodeClick = useCallback((eventId: string) => {
    setSelectedEvent(eventId);
  }, [setSelectedEvent]);

  const handleCharacterClick = useCallback((characterId: string) => {
    setHighlightedCharacter(
      config.highlightedCharacterId === characterId ? null : characterId
    );

    if (config.highlightedCharacterId !== characterId) {
      const firstEvent = events
        .filter(e => e.characterIds.includes(characterId))
        .sort((a, b) => a.order - b.order)[0];
      
      if (firstEvent && containerRef.current) {
        const orderedEvents = [...events].sort((a, b) => a.order - b.order);
        const minOrder = orderedEvents[0]?.order || 0;
        const eventX = 100 + (firstEvent.order - minOrder) * config.nodeSpacing;
        const containerWidth = containerRef.current.clientWidth;
        
        const targetPanX = containerWidth / 2 - eventX * config.scale;
        
        setPan(targetPanX, config.panY);
        setSelectedEvent(firstEvent.id);
      }
    }
  }, [config.highlightedCharacterId, config.nodeSpacing, config.scale, config.panY, events, setHighlightedCharacter, setPan, setSelectedEvent]);

  const handleCanvasDoubleClick = useCallback((x: number, y: number) => {
    const orderedEvents = [...events].sort((a, b) => a.order - b.order);
    const minOrder = orderedEvents[0]?.order || 0;
    const newOrder = Math.round((x - 100) / config.nodeSpacing) + minOrder;
    const clampedOrder = Math.max(0, Math.min(newOrder, events.length));

    addEvent({
      title: '新事件',
      description: '',
      timestamp: null,
      order: clampedOrder,
      characterIds: [],
      location: null,
      type: 'default'
    });

    const newEvents = [...events];
    const insertedIndex = clampedOrder;
    newEvents.splice(insertedIndex, 0, {
      id: 'temp',
      title: '新事件',
      description: '',
      timestamp: null,
      order: clampedOrder,
      characterIds: [],
      location: null,
      type: 'default'
    });

    const reorderedEvents = newEvents.map((e, idx) => ({
      ...e,
      order: idx
    }));

    const newEvent = reorderedEvents.find(e => e.id === 'temp');
    if (newEvent) {
      setTimeout(() => {
        const state = useMetaStore.getState();
        const actualNewEvent = state.events.find(e => e.title === '新事件' && e.order === newEvent.order);
        if (actualNewEvent) {
          setShowEditModal(true, actualNewEvent.id);
        }
      }, 100);
    }
  }, [events, config.nodeSpacing, addEvent, setShowEditModal]);

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full relative overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: panDragRef.current.isDragging ? 'grabbing' : 'default' }}
    >
      <svg
        ref={svgRef}
        id="timeline-svg"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        <TimelineRenderer
          width={dimensions.width}
          height={dimensions.height}
          onNodeMouseDown={handleNodeMouseDown}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeClick={handleNodeClick}
          onCharacterClick={handleCharacterClick}
          onCanvasDoubleClick={handleCanvasDoubleClick}
        />
      </svg>

      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
        <button
          onClick={() => setScale(config.scale - 0.1)}
          disabled={config.scale <= 0.5}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#f0e8dc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="缩小"
        >
          <span className="text-lg font-medium text-[#8b7355]">−</span>
        </button>
        <span className="text-sm text-[#3d3d3d] min-w-[60px] text-center">
          {(config.scale * 100).toFixed(0)}%
        </span>
        <button
          onClick={() => setScale(config.scale + 0.1)}
          disabled={config.scale >= 3}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#f0e8dc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="放大"
        >
          <span className="text-lg font-medium text-[#8b7355]">+</span>
        </button>
        <div className="w-px h-6 bg-[#e8e0d5] mx-1" />
        <button
          onClick={() => {
            setScale(1);
            setPan(0, 0);
          }}
          className="px-3 py-1 text-sm text-[#8b7355] hover:bg-[#f0e8dc] rounded-md transition-colors"
        >
          重置视图
        </button>
      </div>
    </div>
  );
};

export default TimelineCanvas;
