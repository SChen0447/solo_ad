import { useCallback, useRef, useState, useEffect } from 'react';
import { useExhibitionStore } from './store';
import { useDragMove, usePathNodeDrag } from './hooks';
import { WALL_THICKNESS, GRID_SPACING } from './types';
import InfoCard from './InfoCard';

export default function Floorplan() {
  const hall = useExhibitionStore((s) => s.hall);
  const frames = useExhibitionStore((s) => s.frames);
  const pathNodes = useExhibitionStore((s) => s.pathNodes);
  const selectedFrameId = useExhibitionStore((s) => s.selectedFrameId);
  const selectedPathNodeId = useExhibitionStore((s) => s.selectedPathNodeId);
  const moveFrame = useExhibitionStore((s) => s.moveFrame);
  const selectFrame = useExhibitionStore((s) => s.selectFrame);
  const selectPathNode = useExhibitionStore((s) => s.selectPathNode);
  const movePathNode = useExhibitionStore((s) => s.movePathNode);
  const setEditingFrame = useExhibitionStore((s) => s.setEditingFrame);

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredFrameId, setHoveredFrameId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.max(0.3, Math.min(3, z * delta)));
    },
    []
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      } else if (e.button === 0) {
        selectFrame(null);
        selectPathNode(null);
      }
    },
    [pan, selectFrame, selectPathNode]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      }
      setMousePos({ x: e.clientX, y: e.clientY });
    },
    [isPanning, panStart]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const preventWheel = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', preventWheel, { passive: false });
    return () => el.removeEventListener('wheel', preventWheel);
  }, []);

  const floorClass =
    hall.floorMaterial === 'wood'
      ? 'floor-wood'
      : hall.floorMaterial === 'carpet'
      ? 'floor-carpet'
      : 'floor-concrete';

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative cursor-crosshair overflow-hidden"
      style={{ background: '#FDF8F0' }}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 40,
          left: 40,
        }}
      >
        <svg
          width={hall.width + WALL_THICKNESS * 2}
          height={hall.depth + WALL_THICKNESS * 2}
          style={{ overflow: 'visible' }}
        >
          <defs>
            <pattern
              id="grid-pattern"
              width={GRID_SPACING}
              height={GRID_SPACING}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${GRID_SPACING} 0 L 0 0 0 ${GRID_SPACING}`}
                fill="none"
                stroke="#DCD5CD"
                strokeWidth={0.5}
              />
            </pattern>
            <filter id="frame-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodOpacity="0.2" />
            </filter>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#8B7D6B" />
            </marker>
          </defs>

          <rect
            x={0}
            y={0}
            width={hall.width + WALL_THICKNESS * 2}
            height={hall.depth + WALL_THICKNESS * 2}
            fill="#E8DCC8"
            rx={2}
          />

          <rect
            x={WALL_THICKNESS}
            y={WALL_THICKNESS}
            width={hall.width}
            height={hall.depth}
            fill={hall.wallColor}
            className={floorClass}
          />

          <rect
            x={WALL_THICKNESS}
            y={WALL_THICKNESS}
            width={hall.width}
            height={hall.depth}
            fill="url(#grid-pattern)"
          />

          {frames.map((frame) => (
            <FrameRect
              key={frame.id}
              frame={frame}
              isSelected={frame.id === selectedFrameId}
              onMove={moveFrame}
              onSelect={selectFrame}
              onDoubleClick={() => setEditingFrame(frame.id)}
              onHover={setHoveredFrameId}
            />
          ))}

          {pathNodes.length > 1 && (
            <PathLine
              nodes={pathNodes}
              selectedNodeId={selectedPathNodeId}
              onMoveNode={movePathNode}
              onSelectNode={selectPathNode}
            />
          )}

          <rect
            x={WALL_THICKNESS + 2}
            y={hall.depth - 2}
            width={30}
            height={WALL_THICKNESS + 2}
            fill="#FDF8F0"
            rx={1}
          />
          <text
            x={WALL_THICKNESS + 17}
            y={hall.depth + WALL_THICKNESS + 2}
            textAnchor="middle"
            fontSize={7}
            fill="#8B7D6B"
            fontFamily="'Source Sans 3', sans-serif"
          >
            入口
          </text>
        </svg>
      </div>

      {hoveredFrameId && (
        <InfoCard
          frameId={hoveredFrameId}
          x={mousePos.x}
          y={mousePos.y}
        />
      )}

      <div
        className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{
          background: 'rgba(44, 62, 80, 0.7)',
          color: '#fff',
          fontSize: 11,
          fontFamily: "'Source Sans 3', sans-serif",
        }}
      >
        <span>缩放 {Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(1)}
          className="ml-1 px-2 py-0.5 rounded text-xs hover:bg-white/20 transition-colors"
        >
          重置
        </button>
      </div>
    </div>
  );
}

function FrameRect({
  frame,
  isSelected,
  onMove,
  onSelect,
  onDoubleClick,
  onHover,
}: {
  frame: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    frameColor: string;
    visible: boolean;
    isColliding: boolean;
    artwork: { imageUrl: string; name: string } | null;
  };
  isSelected: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string | null) => void;
  onDoubleClick: () => void;
  onHover: (id: string | null) => void;
}) {
  const { handleMouseDown } = useDragMove(frame.id, onMove);

  if (!frame.visible) return null;

  const fx = frame.x + WALL_THICKNESS;
  const fy = frame.y + WALL_THICKNESS;

  return (
    <g
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect(frame.id);
        handleMouseDown(e);
      }}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => onHover(frame.id)}
      onMouseLeave={() => onHover(null)}
      className="frame-transition"
      style={{ cursor: 'move' }}
    >
      <rect
        x={fx}
        y={fy}
        width={frame.width}
        height={frame.height}
        fill={frame.artwork ? '#f8f4ef' : '#FFFFFF'}
        stroke={frame.isColliding ? '#E74C3C' : isSelected ? '#E67E22' : '#C8C0B8'}
        strokeWidth={frame.isColliding ? 2 : isSelected ? 2 : 1}
        rx={1}
        filter="url(#frame-shadow)"
        className={frame.isColliding ? 'collision-border' : undefined}
      />
      {frame.artwork && frame.artwork.imageUrl && (
        <image
          href={frame.artwork.imageUrl}
          x={fx + 2}
          y={fy + 2}
          width={frame.width - 4}
          height={frame.height - 4}
          preserveAspectRatio="xMidYMid slice"
        />
      )}
      {!frame.artwork && (
        <>
          <line
            x1={fx + 3}
            y1={fy + 3}
            x2={fx + frame.width - 3}
            y2={fy + frame.height - 3}
            stroke="#D0C8C0"
            strokeWidth={0.5}
          />
          <line
            x1={fx + frame.width - 3}
            y1={fy + 3}
            x2={fx + 3}
            y2={fy + frame.height - 3}
            stroke="#D0C8C0"
            strokeWidth={0.5}
          />
        </>
      )}
      {frame.artwork && !frame.artwork.imageUrl && (
        <text
          x={fx + frame.width / 2}
          y={fy + frame.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={5}
          fill="#8B7D6B"
          fontFamily="'Source Sans 3', sans-serif"
        >
          {frame.artwork.name.slice(0, 6)}
        </text>
      )}
    </g>
  );
}

function PathLine({
  nodes,
  selectedNodeId,
  onMoveNode,
  onSelectNode,
}: {
  nodes: { id: string; x: number; y: number; order: number }[];
  selectedNodeId: string | null;
  onMoveNode: (id: string, x: number, y: number) => void;
  onSelectNode: (id: string | null) => void;
}) {
  const sorted = [...nodes].sort((a, b) => a.order - b.order);

  const pathD = sorted
    .map((n, i) => {
      const px = n.x + WALL_THICKNESS;
      const py = n.y + WALL_THICKNESS;
      return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
    })
    .join(' ');

  return (
    <g>
      <path
        d={pathD}
        fill="none"
        stroke="#8B7D6B"
        strokeWidth={2}
        strokeDasharray="6 4"
        markerEnd="url(#arrowhead)"
        pointerEvents="none"
      />
      {sorted.map((node) => (
        <PathNodeCircle
          key={node.id}
          node={node}
          isSelected={node.id === selectedNodeId}
          onMove={onMoveNode}
          onSelect={onSelectNode}
        />
      ))}
    </g>
  );
}

function PathNodeCircle({
  node,
  isSelected,
  onMove,
  onSelect,
}: {
  node: { id: string; x: number; y: number };
  isSelected: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string | null) => void;
}) {
  const { handleMouseDown } = usePathNodeDrag(node.id, onMove);

  return (
    <circle
      cx={node.x + WALL_THICKNESS}
      cy={node.y + WALL_THICKNESS}
      r={isSelected ? 6 : 4}
      fill={isSelected ? '#E67E22' : '#8B7D6B'}
      stroke="#fff"
      strokeWidth={1.5}
      style={{ cursor: 'move' }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect(node.id);
        handleMouseDown(e);
      }}
    />
  );
}
