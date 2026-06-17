import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../App';
import type { TimelineEvent, EventType } from '../types';
import { forceSimulation, forceX, forceCollide } from 'd3-force';

const EVENT_COLORS: Record<EventType, string> = {
  main: '#F59E0B',
  side: '#10B981',
  memory: '#8B5CF6',
  foreshadow: '#EC4899',
};

const EVENT_LABELS: Record<EventType, string> = {
  main: '主线剧情',
  side: '支线剧情',
  memory: '回忆',
  foreshadow: '伏笔',
};

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

function EventNodeComponent({
  node,
  onClick,
  isSelected,
}: {
  node: EventNode;
  onClick: () => void;
  isSelected: boolean;
}) {
  const color = EVENT_COLORS[node.event.type];

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
        fill={color}
        opacity={isSelected ? 1 : 0.85}
        stroke={isSelected ? '#FBBF24' : 'transparent'}
        strokeWidth={isSelected ? 2 : 0}
        style={{
          filter: isSelected ? `drop-shadow(0 0 8px ${color})` : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      />
      <text
        x={node.width / 2}
        y={node.height / 2 + 4}
        textAnchor="middle"
        fill="#fff"
        fontSize="12"
        fontWeight={500}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {node.event.name.length > 8 ? node.event.name.slice(0, 8) + '...' : node.event.name}
      </text>
    </g>
  );
}

function EditPanel({
  event,
  characters,
  onClose,
  onSave,
}: {
  event: TimelineEvent;
  characters: { id: string; name: string }[];
  onClose: () => void;
  onSave: (updated: Partial<TimelineEvent>) => void;
}) {
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date);
  const [type, setType] = useState<EventType>(event.type);
  const [description, setDescription] = useState(event.description || '');

  const handleSave = () => {
    onSave({ name, date, type, description });
    onClose();
  };

  const getCharacterName = (id: string) => {
    return characters.find(c => c.id === id)?.name || id;
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#1E293B',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: '1px solid #334155',
        padding: '24px',
        width: '420px',
        maxWidth: '90vw',
        zIndex: 1000,
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: '#F59E0B', fontSize: '18px', fontWeight: 600 }}>编辑事件</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748B',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '6px' }}>事件名称</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#E2E8F0',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = '#F59E0B')}
            onBlur={e => (e.target.style.borderColor = '#334155')}
          />
        </div>

        <div>
          <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '6px' }}>发生时间</label>
          <input
            type="text"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#E2E8F0',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '6px' }}>事件类型</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(EVENT_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setType(key as EventType)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: type === key ? EVENT_COLORS[key as EventType] : '#334155',
                  backgroundColor: type === key ? `${EVENT_COLORS[key as EventType]}20` : 'transparent',
                  color: type === key ? EVENT_COLORS[key as EventType] : '#94A3B8',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '6px' }}>涉及角色</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {event.characterIds.map(charId => (
              <span
                key={charId}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#CBD5E1',
                }}
              >
                {getCharacterName(charId)}
              </span>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '6px' }}>事件描述</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#E2E8F0',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
        <button
          onClick={onClose}
          style={{
            padding: '10px 20px',
            backgroundColor: '#334155',
            border: 'none',
            borderRadius: '6px',
            color: '#CBD5E1',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          取消
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '10px 20px',
            backgroundColor: '#F59E0B',
            border: 'none',
            borderRadius: '6px',
            color: '#1E293B',
            fontSize: '14px',
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

function TimelineView() {
  const { events, characters, updateEvent } = useAppContext();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, panX: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const nodes = useMemo<EventNode[]>(() => {
    if (events.length === 0) return [];

    const sorted = [...events].sort((a, b) => parseDateToOrder(a.date) - parseDateToOrder(b.date));
    const minOrder = parseDateToOrder(sorted[0].date);
    const maxOrder = parseDateToOrder(sorted[sorted.length - 1].date);
    const range = Math.max(maxOrder - minOrder, 1);

    const baseWidth = dimensions.width - 120;
    const startX = 60;

    const initialNodes = sorted.map((event, i) => {
      const order = parseDateToOrder(event.date);
      const x = startX + ((order - minOrder) / range) * baseWidth * zoom;
      return {
        id: event.id,
        x,
        y: dimensions.height / 2,
        event,
        width: 100,
        height: 36,
      };
    });

    const simulation = forceSimulation(initialNodes as any)
      .force('x', forceX(d => (d as any).x).strength(0.3))
      .force('collision', forceCollide().radius(d => Math.max((d as any).width, (d as any).height) / 2 + 8))
      .stop();

    for (let i = 0; i < 50; i++) {
      simulation.tick();
    }

    return simulation.nodes() as unknown as EventNode[];
  }, [events, dimensions, zoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(5, prev * delta)));
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

  const years = useMemo(() => {
    const yearSet = new Set<string>();
    events.forEach(e => {
      const match = e.date.match(/靖康\d+年/);
      if (match) yearSet.add(match[0]);
    });
    return Array.from(yearSet);
  }, [events]);

  return (
    <div style={styles.container} ref={containerRef}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 style={styles.title}>全局时间线</h2>
          <span style={styles.subtitle}>{events.length} 个事件节点</span>
        </div>
        <div style={styles.controls}>
          <div style={styles.zoomInfo}>缩放: {(zoom * 100).toFixed(0)}%</div>
          <button
            onClick={() => setZoom(z => Math.min(5, z * 1.2))}
            style={styles.zoomBtn}
          >
            +
          </button>
          <button
            onClick={() => setZoom(z => Math.max(0.3, z * 0.8))}
            style={styles.zoomBtn}
          >
            −
          </button>
          <button
            onClick={() => { setZoom(1); setPanX(0); }}
            style={styles.resetBtn}
          >
            重置
          </button>
        </div>
      </div>

      <div style={styles.legend}>
        {Object.entries(EVENT_LABELS).map(([key, label]) => (
          <div key={key} style={styles.legendItem}>
            <div
              style={{
                ...styles.legendDot,
                backgroundColor: EVENT_COLORS[key as EventType],
              }}
            />
            <span style={styles.legendText}>{label}</span>
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
              const x = 60 + (i / Math.max(years.length - 1, 1)) * (dimensions.width - 120) * zoom;
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
                onClick={() => setSelectedEvent(node.event)}
                isSelected={selectedEvent?.id === node.id}
              />
            ))}
          </g>
        </svg>
      </div>

      {selectedEvent && (
        <>
          <div
            style={styles.overlay}
            onClick={() => setSelectedEvent(null)}
          />
          <EditPanel
            event={selectedEvent}
            characters={characters.map(c => ({ id: c.id, name: c.name }))}
            onClose={() => setSelectedEvent(null)}
            onSave={handleSaveEvent}
          />
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -48%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
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
  zoomInfo: {
    fontSize: '13px',
    color: '#94A3B8',
    marginRight: '8px',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
};

export default TimelineView;
