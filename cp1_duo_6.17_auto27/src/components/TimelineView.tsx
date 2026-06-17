import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../App';
import type { TimelineEvent, EventType } from '../types';
import { forceSimulation, forceX, forceCollide } from 'd3-force';
import {
  EVENT_TYPE_CONFIG,
  TIMELINE_SCALES,
  TIMELINE_ZOOM_MIN,
  TIMELINE_ZOOM_MAX,
  getScaleKeyByZoom,
  getScaleLabelByZoom,
} from '../timelineConfig';

interface EventNode {
  id: string;
  x: number;
  y: number;
  event: TimelineEvent;
  width: number;
  height: number;
}

const parseDateToOrder = (dateStr: string): number => {
  const match = dateStr.match(/靖康(\d+)年/);
  if (match) {
    const year = parseInt(match[1]);
    let season = 0;
    if (dateStr.includes('春')) season = 0;
    else if (dateStr.includes('夏')) season = 1;
    else if (dateStr.includes('秋')) season = 2;
    else if (dateStr.includes('冬')) season = 3;

    const monthMatch = dateStr.match(/-(\d+)月/);
    const month = monthMatch ? parseInt(monthMatch[1]) : 1;

    const dayMatch = dateStr.match(/-([初廿正]?\d+)/g);
    let day = 1;
    if (dayMatch && dayMatch.length >= 3) {
      const dayStr = dayMatch[dayMatch.length - 1].replace('-', '');
      if (dayStr.startsWith('初')) day = parseInt(dayStr.replace('初', ''));
      else if (dayStr.startsWith('廿')) day = 20 + parseInt(dayStr.replace('廿', ''));
      else day = parseInt(dayStr) || 1;
    }

    return (year - 1) * 360 + season * 90 + (month - 1) * 30 + day;
  }
  return 0;
};

const CHAR_WIDTH_APPROX = 12;
const NODE_PADDING = 24;
const NODE_MIN_WIDTH_FOR_LABEL = 60;

function computeNodeLabelVisibility(
  nodes: EventNode[],
  zoom: number,
): Map<string, boolean> {
  const visibility = new Map<string, boolean>();

  if (nodes.length === 0) return visibility;

  const minGapForLabel = NODE_MIN_WIDTH_FOR_LABEL + 16;

  if (zoom < 0.5) {
    nodes.forEach(n => visibility.set(n.id, false));
    return visibility;
  }

  const sortedByX = [...nodes].sort((a, b) => a.x - b.x);

  for (let i = 0; i < sortedByX.length; i++) {
    const node = sortedByX[i];
    const textLen = Math.min(node.event.name.length, 8);
    const textWidth = textLen * CHAR_WIDTH_APPROX + NODE_PADDING;
    const availableWidth = node.width;

    if (availableWidth < textWidth && zoom < 1.5) {
      visibility.set(node.id, false);
      continue;
    }

    const gapLeft =
      i > 0 ? node.x - sortedByX[i - 1].x : minGapForLabel + 1;
    const gapRight =
      i < sortedByX.length - 1
        ? sortedByX[i + 1].x - node.x
        : minGapForLabel + 1;
    const minGap = Math.min(gapLeft, gapRight);

    visibility.set(node.id, minGap >= minGapForLabel);
  }

  return visibility;
}

function EventNodeComponent({
  node,
  onClick,
  isSelected,
  showLabel,
}: {
  node: EventNode;
  onClick: (e: React.MouseEvent) => void;
  isSelected: boolean;
  showLabel: boolean;
}) {
  const config = EVENT_TYPE_CONFIG[node.event.type];

  return (
    <g
      transform={`translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`}
      onClick={onClick}
      style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
    >
      <rect
        x={0}
        y={0}
        width={node.width}
        height={node.height}
        rx={8}
        ry={8}
        fill={config.color}
        opacity={isSelected ? 1 : 0.85}
        stroke={isSelected ? '#FBBF24' : 'transparent'}
        strokeWidth={isSelected ? 2 : 0}
        style={{
          filter: isSelected
            ? `drop-shadow(0 0 8px ${config.color})`
            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          transition: 'all 0.2s ease',
        }}
      />
      {showLabel && (
        <text
          x={node.width / 2}
          y={node.height / 2 + 4}
          textAnchor="middle"
          fill="#fff"
          fontSize="12"
          fontWeight={500}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            transition: 'opacity 0.25s ease',
          }}
        >
          {node.event.name.length > 8
            ? node.event.name.slice(0, 8) + '...'
            : node.event.name}
        </text>
      )}
      {!showLabel && (
        <text
          x={node.width / 2}
          y={node.height / 2 + 5}
          textAnchor="middle"
          fill="#fff"
          fontSize="14"
          fontWeight={700}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          ●
        </text>
      )}
    </g>
  );
}

function PopupEditPanel({
  event,
  characters,
  position,
  onClose,
  onSave,
}: {
  event: TimelineEvent;
  characters: { id: string; name: string }[];
  position: { x: number; y: number };
  onClose: () => void;
  onSave: (updated: Partial<TimelineEvent>) => void;
}) {
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date);
  const [type, setType] = useState<EventType>(event.type);
  const [description, setDescription] = useState(event.description || '');
  const panelRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');

  const PANEL_WIDTH = 380;
  const PANEL_MARGIN = 20;
  const ARROW_OFFSET = 16;

  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const estimatedHeight = 460;

    let place: 'bottom' | 'top' = 'bottom';
    if (position.y + ARROW_OFFSET + estimatedHeight > vh - PANEL_MARGIN) {
      place = 'top';
    }
    setPlacement(place);

    let top: number;
    if (place === 'bottom') {
      top = position.y + ARROW_OFFSET;
    } else {
      top = position.y - ARROW_OFFSET - estimatedHeight;
    }
    top = Math.max(PANEL_MARGIN, Math.min(top, vh - estimatedHeight - PANEL_MARGIN));

    let left = position.x - 20;
    if (left + PANEL_WIDTH > vw - PANEL_MARGIN) {
      left = vw - PANEL_WIDTH - PANEL_MARGIN;
    }
    if (left < PANEL_MARGIN) {
      left = PANEL_MARGIN;
    }

    setAdjustedPos({ top, left });
  }, [position]);

  const arrowLeftOffset = Math.max(
    12,
    Math.min(position.x - adjustedPos.left, PANEL_WIDTH - 28),
  );

  const handleSave = () => {
    onSave({ name, date, type, description });
    onClose();
  };

  const getCharacterName = (id: string) => {
    return characters.find(c => c.id === id)?.name || id;
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: adjustedPos.top,
    left: adjustedPos.left,
    backgroundColor: '#1E293B',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    border: '1px solid #334155',
    padding: '20px',
    width: `${PANEL_WIDTH}px`,
    maxWidth: `calc(100vw - ${PANEL_MARGIN * 2}px)`,
    maxHeight: `calc(100vh - ${PANEL_MARGIN * 2}px)`,
    overflowY: 'auto',
    zIndex: 1000,
    animation: 'popupFadeIn 0.2s ease-out',
  };

  const arrowOuterStyle: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    left: arrowLeftOffset,
    transform: 'translateX(-50%)',
    ...(placement === 'bottom'
      ? {
          top: -8,
          borderBottom: '8px solid #334155',
        }
      : {
          bottom: -8,
          borderTop: '8px solid #334155',
        }),
  };

  const arrowInnerStyle: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeft: '7px solid transparent',
    borderRight: '7px solid transparent',
    left: arrowLeftOffset + 1,
    transform: 'translateX(-50%)',
    ...(placement === 'bottom'
      ? {
          top: -6,
          borderBottom: '7px solid #1E293B',
        }
      : {
          bottom: -6,
          borderTop: '7px solid #1E293B',
        }),
  };

  return (
    <div ref={panelRef} style={panelStyle}>
      <div style={arrowOuterStyle} />
      <div style={arrowInnerStyle} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ color: '#F59E0B', fontSize: '16px', fontWeight: 600, margin: 0 }}>
          编辑事件
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748B',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '2px',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label
            style={{
              display: 'block',
              color: '#94A3B8',
              fontSize: '12px',
              marginBottom: '5px',
            }}
          >
            事件名称
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#E2E8F0',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = '#F59E0B')}
            onBlur={e => (e.target.style.borderColor = '#334155')}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              color: '#94A3B8',
              fontSize: '12px',
              marginBottom: '5px',
            }}
          >
            发生时间
          </label>
          <input
            type="text"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#E2E8F0',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              color: '#94A3B8',
              fontSize: '12px',
              marginBottom: '5px',
            }}
          >
            事件类型
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setType(key as EventType)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: type === key ? config.color : '#334155',
                  backgroundColor:
                    type === key ? config.lightColor : 'transparent',
                  color: type === key ? config.color : '#94A3B8',
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              color: '#94A3B8',
              fontSize: '12px',
              marginBottom: '5px',
            }}
          >
            涉及角色
          </label>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {event.characterIds.map(charId => (
              <span
                key={charId}
                style={{
                  padding: '3px 9px',
                  backgroundColor: '#334155',
                  borderRadius: '10px',
                  fontSize: '11px',
                  color: '#CBD5E1',
                }}
              >
                {getCharacterName(charId)}
              </span>
            ))}
          </div>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              color: '#94A3B8',
              fontSize: '12px',
              marginBottom: '5px',
            }}
          >
            事件描述
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#E2E8F0',
              fontSize: '13px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          marginTop: '18px',
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: '#334155',
            border: 'none',
            borderRadius: '6px',
            color: '#CBD5E1',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          取消
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '8px 16px',
            backgroundColor: '#F59E0B',
            border: 'none',
            borderRadius: '6px',
            color: '#1E293B',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
}

function ZoomSlider({
  zoom,
  onChange,
}: {
  zoom: number;
  onChange: (zoom: number) => void;
}) {
  const scaleKey = getScaleKeyByZoom(zoom);
  const scaleLabel = getScaleLabelByZoom(zoom);

  const handleScaleClick = (key: string) => {
    const scale = TIMELINE_SCALES.find(s => s.key === key);
    if (scale) {
      const midZoom = (scale.zoomRange[0] + scale.zoomRange[1]) / 2;
      onChange(midZoom);
    }
  };

  const sliderMin = Math.log10(TIMELINE_ZOOM_MIN);
  const sliderMax = Math.log10(TIMELINE_ZOOM_MAX);
  const sliderValue =
    ((Math.log10(zoom) - sliderMin) / (sliderMax - sliderMin)) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseInt(e.target.value);
    const logZoom =
      sliderMin + (percent / 100) * (sliderMax - sliderMin);
    onChange(Math.pow(10, logZoom));
  };

  return (
    <div style={zoomSliderStyles.container}>
      <div style={zoomSliderStyles.scaleTabs}>
        {TIMELINE_SCALES.map(scale => (
          <button
            key={scale.key}
            onClick={() => handleScaleClick(scale.key)}
            style={{
              ...zoomSliderStyles.scaleTab,
              ...(scaleKey === scale.key
                ? zoomSliderStyles.scaleTabActive
                : {}),
            }}
          >
            {scale.label}
          </button>
        ))}
      </div>
      <div style={zoomSliderStyles.sliderWrapper}>
        <input
          type="range"
          min={0}
          max={100}
          value={sliderValue}
          onChange={handleSliderChange}
          style={zoomSliderStyles.slider}
        />
      </div>
      <div style={zoomSliderStyles.zoomDisplay}>
        <span style={zoomSliderStyles.zoomLabel}>当前尺度</span>
        <span style={zoomSliderStyles.zoomValue}>{scaleLabel}级</span>
        <span style={zoomSliderStyles.zoomPercent}>
          {(zoom * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

const zoomSliderStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '12px 24px',
    backgroundColor: '#172033',
    borderBottom: '1px solid #2D3A4F',
  },
  scaleTabs: {
    display: 'flex',
    gap: '4px',
  },
  scaleTab: {
    flex: 1,
    padding: '6px 0',
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#64748B',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  scaleTabActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
    color: '#FBBF24',
  },
  sliderWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  slider: {
    flex: 1,
    height: '4px',
    WebkitAppearance: 'none',
    appearance: 'none',
    background: '#334155',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer',
    accentColor: '#F59E0B',
  },
  zoomDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  zoomLabel: {
    fontSize: '12px',
    color: '#64748B',
  },
  zoomValue: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#F59E0B',
  },
  zoomPercent: {
    fontSize: '11px',
    color: '#64748B',
    marginLeft: '4px',
  },
};

function TimelineView() {
  const { events, characters, updateEvent } = useAppContext();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, panX: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [prevShowLabelState, setPrevShowLabelState] = useState(true);

  const shouldUseLabels = zoom >= 0.5;

  const nodes = useMemo<EventNode[]>(() => {
    if (events.length === 0) return [];

    const sorted = [...events].sort(
      (a, b) => parseDateToOrder(a.date) - parseDateToOrder(b.date),
    );
    const minOrder = parseDateToOrder(sorted[0].date);
    const maxOrder = parseDateToOrder(sorted[sorted.length - 1].date);
    const range = Math.max(maxOrder - minOrder, 1);

    const baseWidth = dimensions.width - 120;
    const startX = 60;

    const initialNodes = sorted.map((event, i) => {
      const order = parseDateToOrder(event.date);
      const x = startX + ((order - minOrder) / range) * baseWidth * zoom;
      const textLen = Math.min(event.name.length, 8);
      const width = shouldUseLabels
        ? Math.max(textLen * CHAR_WIDTH_APPROX + NODE_PADDING, NODE_MIN_WIDTH_FOR_LABEL)
        : 32;
      return {
        id: event.id,
        x,
        y: dimensions.height / 2,
        event,
        width,
        height: 36,
      };
    });

    const simulation = forceSimulation(initialNodes as any)
      .force('x', forceX((d: any) => d.x).strength(0.3))
      .force(
        'collision',
        forceCollide().radius(
          (d: any) => Math.max(d.width, d.height) / 2 + 8,
        ),
      )
      .stop();

    const tickCount = shouldUseLabels !== prevShowLabelState ? 80 : 50;
    for (let i = 0; i < tickCount; i++) {
      simulation.tick();
    }

    return simulation.nodes() as unknown as EventNode[];
  }, [events, dimensions, zoom, shouldUseLabels, prevShowLabelState]);

  useEffect(() => {
    setPrevShowLabelState(shouldUseLabels);
  }, [shouldUseLabels]);

  const labelVisibility = useMemo(() => {
    return computeNodeLabelVisibility(nodes, zoom);
  }, [nodes, zoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom(prev =>
      Math.max(TIMELINE_ZOOM_MIN, Math.min(TIMELINE_ZOOM_MAX, prev * delta)),
    );
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, panX });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const diff = e.clientX - dragStart.x;
      setPanX(dragStart.panX + diff);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleSaveEvent = async (updated: Partial<TimelineEvent>) => {
    if (selectedEvent) {
      await updateEvent(selectedEvent.id, updated);
    }
  };

  const handleNodeClick = (e: React.MouseEvent, event: TimelineEvent, nodeX: number, nodeY: number) => {
    e.stopPropagation();
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setPopupPosition({
        x: rect.left + nodeX + panX,
        y: rect.top + nodeY,
      });
    }
    setSelectedEvent(event);
  };

  const handleOverlayClick = () => {
    setSelectedEvent(null);
  };

  const years = useMemo(() => {
    const yearSet = new Set<string>();
    events.forEach(e => {
      const match = e.date.match(/靖康\d+年/);
      if (match) yearSet.add(match[0]);
    });
    return Array.from(yearSet);
  }, [events]);

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  return (
    <div style={styles.container} ref={containerRef}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 style={styles.title}>全局时间线</h2>
          <span style={styles.subtitle}>{events.length} 个事件节点</span>
        </div>
        <div style={styles.controls}>
          <button
            onClick={() =>
              setZoom(z => Math.min(TIMELINE_ZOOM_MAX, z * 1.2))
            }
            style={styles.zoomBtn}
          >
            +
          </button>
          <button
            onClick={() =>
              setZoom(z => Math.max(TIMELINE_ZOOM_MIN, z * 0.8))
            }
            style={styles.zoomBtn}
          >
            −
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPanX(0);
            }}
            style={styles.resetBtn}
          >
            重置视图
          </button>
        </div>
      </div>

      <ZoomSlider zoom={zoom} onChange={handleZoomChange} />

      <div style={styles.legend}>
        {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
          <div key={key} style={styles.legendItem}>
            <div
              style={{
                ...styles.legendDot,
                backgroundColor: config.color,
              }}
            />
            <span style={styles.legendText}>{config.label}</span>
          </div>
        ))}
      </div>

      <div
        style={styles.timelineWrapper}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <g transform={`translate(${panX}, 0)`}>
            <line
              x1={40}
              y1={dimensions.height / 2}
              x2={dimensions.width - 40}
              y2={dimensions.height / 2}
              stroke="#334155"
              strokeWidth={2}
            />

            {years.map((year, i) => {
              const x =
                60 +
                (i / Math.max(years.length - 1, 1)) *
                  (dimensions.width - 120) *
                  zoom;
              return (
                <g key={year}>
                  <line
                    x1={x}
                    y1={dimensions.height / 2 - 10}
                    x2={x}
                    y2={dimensions.height / 2 + 10}
                    stroke="#475569"
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={dimensions.height / 2 + 30}
                    textAnchor="middle"
                    fill="#64748B"
                    fontSize="12"
                    style={{ userSelect: 'none' }}
                  >
                    {year}
                  </text>
                </g>
              );
            })}

            {nodes.map(node => (
              <EventNodeComponent
                key={node.id}
                node={node}
                onClick={e => handleNodeClick(e, node.event, node.x, node.y)}
                isSelected={selectedEvent?.id === node.id}
                showLabel={labelVisibility.get(node.id) ?? false}
              />
            ))}
          </g>
        </svg>
      </div>

      {selectedEvent && (
        <>
          <div style={styles.overlay} onClick={handleOverlayClick} />
          <PopupEditPanel
            event={selectedEvent}
            characters={characters.map(c => ({ id: c.id, name: c.name }))}
            position={popupPosition}
            onClose={() => setSelectedEvent(null)}
            onSave={handleSaveEvent}
          />
        </>
      )}

      <style>{`
        @keyframes popupFadeIn {
          from { 
            opacity: 0; 
            transform: translateY(-4px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #F59E0B;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.4);
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #F59E0B;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.4);
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #2D3A4F',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#F59E0B',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748B',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  zoomBtn: {
    width: '32px',
    height: '32px',
    backgroundColor: '#334155',
    border: 'none',
    borderRadius: '6px',
    color: '#CBD5E1',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  resetBtn: {
    padding: '0 14px',
    height: '32px',
    backgroundColor: '#334155',
    border: 'none',
    borderRadius: '6px',
    color: '#CBD5E1',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  legend: {
    display: 'flex',
    gap: '20px',
    padding: '12px 24px',
    backgroundColor: '#172033',
    borderBottom: '1px solid #2D3A4F',
    flexShrink: 0,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
  },
  legendText: {
    fontSize: '13px',
    color: '#94A3B8',
  },
  timelineWrapper: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
};

export default TimelineView;
