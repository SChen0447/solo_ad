import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Circle, Text, Arrow } from 'react-konva';
import Konva from 'konva';
import { MindMapNode, Connection } from '../types';

interface MindMapCanvasProps {
  nodes: MindMapNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onNodeCreate: (x: number, y: number) => void;
  onNodeDragEnd: (nodeId: string, x: number, y: number) => void;
  onConnectionCreate: (fromId: string, toId: string) => void;
  onConnectionDelete: (connectionId: string) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
}

export const MindMapCanvas: React.FC<MindMapCanvasProps> = ({
  nodes,
  connections,
  selectedNodeId,
  onSelectNode,
  onNodeMove,
  onNodeCreate,
  onNodeDragEnd,
  onConnectionCreate,
  onConnectionDelete,
  scale,
  onScaleChange,
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [drawLineStart, setDrawLineStart] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [drawLineEnd, setDrawLineEnd] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleStageDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;

      const isNode = e.target.name() === 'node-circle' || e.target.name() === 'node-text';
      if (isNode) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const x = pos.x / scale;
      const y = pos.y / scale;
      onNodeCreate(x, y);
    },
    [onNodeCreate, scale]
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const isNode = e.target.name() === 'node-circle' || e.target.name() === 'node-text';
      const isConnector = e.target.name() === 'connector';
      const isConnection = e.target.name() === 'connection';

      if (!isNode && !isConnector && !isConnection) {
        onSelectNode(null);
      }
    },
    [onSelectNode]
  );

  const handleNodeClick = useCallback(
    (e: Konva.KonvaEventObject<any>, nodeId: string) => {
      e.cancelBubble = true;
      onSelectNode(nodeId);
    },
    [onSelectNode]
  );

  const handleNodeDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, nodeId: string) => {
      const node = e.target;
      onNodeMove(nodeId, node.x(), node.y());
    },
    [onNodeMove]
  );

  const handleNodeDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, nodeId: string) => {
      const node = e.target;
      onNodeDragEnd(nodeId, node.x(), node.y());
    },
    [onNodeDragEnd]
  );

  const handleConnectorMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, node: MindMapNode) => {
      e.cancelBubble = true;
      setIsDrawingLine(true);
      setDrawLineStart({ nodeId: node.id, x: node.x, y: node.y });
      setDrawLineEnd({ x: node.x, y: node.y });
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawingLine || !drawLineStart) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      setDrawLineEnd({
        x: pos.x / scale,
        y: pos.y / scale,
      });
    },
    [isDrawingLine, drawLineStart, scale]
  );

  const handleMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawingLine || !drawLineStart) {
        setIsDrawingLine(false);
        setDrawLineStart(null);
        setDrawLineEnd(null);
        return;
      }

      const stage = e.target.getStage();
      if (!stage) {
        setIsDrawingLine(false);
        setDrawLineStart(null);
        setDrawLineEnd(null);
        return;
      }

      const pos = stage.getPointerPosition();
      if (!pos) {
        setIsDrawingLine(false);
        setDrawLineStart(null);
        setDrawLineEnd(null);
        return;
      }

      const x = pos.x / scale;
      const y = pos.y / scale;

      let targetNode: MindMapNode | null = null;
      for (const node of nodes) {
        if (node.id === drawLineStart.nodeId) continue;
        const dx = x - node.x;
        const dy = y - node.y;
        if (Math.sqrt(dx * dx + dy * dy) < node.radius + 10) {
          targetNode = node;
          break;
        }
      }

      if (targetNode) {
        onConnectionCreate(drawLineStart.nodeId, targetNode.id);
      }

      setIsDrawingLine(false);
      setDrawLineStart(null);
      setDrawLineEnd(null);
    },
    [isDrawingLine, drawLineStart, nodes, onConnectionCreate, scale]
  );

  const handleConnectionDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, connectionId: string) => {
      e.cancelBubble = true;
      onConnectionDelete(connectionId);
    },
    [onConnectionDelete]
  );

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const scaleBy = 1.05;
      const stage = e.target.getStage();
      if (!stage) return;

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: pointer.x / oldScale - stage.x() / oldScale,
        y: pointer.y / oldScale - stage.y() / oldScale,
      };

      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clampedScale = Math.max(0.5, Math.min(2, newScale));

      stage.scaleX(clampedScale);
      stage.scaleY(clampedScale);

      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      };

      stage.position(newPos);
      onScaleChange(clampedScale);
    },
    [onScaleChange]
  );

  const getConnectionPoints = (fromNode: MindMapNode, toNode: MindMapNode) => {
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return [fromNode.x, fromNode.y, toNode.x, toNode.y];

    const fromX = fromNode.x + (dx / distance) * fromNode.radius;
    const fromY = fromNode.y + (dy / distance) * fromNode.radius;
    const toX = toNode.x - (dx / distance) * toNode.radius;
    const toY = toNode.y - (dy / distance) * toNode.radius;

    return [fromX, fromY, toX, toY];
  };

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onDblClick={handleStageDblClick}
        onClick={handleStageClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        scaleX={scale}
        scaleY={scale}
        style={{ cursor: isDrawingLine ? 'crosshair' : 'default' }}
      >
        <Layer>
          {connections.map((conn) => {
            const fromNode = nodeById.get(conn.fromNodeId);
            const toNode = nodeById.get(conn.toNodeId);
            if (!fromNode || !toNode) return null;

            const points = getConnectionPoints(fromNode, toNode);

            return (
              <Arrow
                key={conn.id}
                points={points}
                stroke="#B0B0B0"
                strokeWidth={2}
                fill="#B0B0B0"
                pointerLength={10}
                pointerWidth={8}
                name="connection"
                onDblClick={(e) => handleConnectionDblClick(e, conn.id)}
                hitStrokeWidth={10}
              />
            );
          })}

          {isDrawingLine && drawLineStart && drawLineEnd && (
            <Arrow
              points={[drawLineStart.x, drawLineStart.y, drawLineEnd.x, drawLineEnd.y]}
              stroke="#4ECDC4"
              strokeWidth={2}
              fill="#4ECDC4"
              pointerLength={10}
              pointerWidth={8}
              dash={[5, 5]}
              opacity={0.8}
            />
          )}

          {nodes.map((node) => {
            const isSelected = node.id === selectedNodeId;

            return (
              <React.Fragment key={node.id}>
                <Circle
                  x={node.x}
                  y={node.y}
                  radius={node.radius}
                  fill={node.color}
                  draggable
                  name="node-circle"
                  shadowColor={isSelected ? node.color : 'transparent'}
                  shadowBlur={isSelected ? 20 : 0}
                  shadowOpacity={isSelected ? 0.8 : 0}
                  shadowOffset={{ x: 0, y: 0 }}
                  onClick={(e) => handleNodeClick(e, node.id)}
                  onTap={(e) => handleNodeClick(e, node.id)}
                  onDragMove={(e) => handleNodeDragMove(e, node.id)}
                  onDragEnd={(e) => handleNodeDragEnd(e, node.id)}
                />
                <Text
                  x={node.x}
                  y={node.y}
                  text={node.text}
                  fontSize={14}
                  fontFamily="Arial, sans-serif"
                  fill="#333333"
                  align="center"
                  verticalAlign="middle"
                  offsetX={node.radius * 0.7}
                  offsetY={7}
                  width={node.radius * 1.4}
                  height={node.radius * 1.4}
                  name="node-text"
                  listening={false}
                />
                <Circle
                  x={node.x + node.radius}
                  y={node.y}
                  radius={6}
                  fill="#ffffff"
                  stroke="#4ECDC4"
                  strokeWidth={2}
                  name="connector"
                  onMouseDown={(e) => handleConnectorMouseDown(e, node)}
                  onMouseEnter={(e) => {
                    e.target.scaleX(1.3);
                    e.target.scaleY(1.3);
                  }}
                  onMouseLeave={(e) => {
                    e.target.scaleX(1);
                    e.target.scaleY(1);
                  }}
                  style={{ cursor: 'crosshair' }}
                />
              </React.Fragment>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
};
