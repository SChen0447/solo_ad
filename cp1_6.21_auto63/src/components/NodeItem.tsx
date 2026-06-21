import { FC, useRef, useEffect, useState, useCallback } from 'react';
import { Group, Rect, Text, Shape } from 'react-konva';
import Konva from 'konva';
import { MindMapNode, COLOR_PALETTE, NODE_WIDTH, NODE_PADDING, FONT_SIZE, LINE_HEIGHT } from '../types';
import { calculateNodeHeight } from '../utils/drawGraph';

interface NodeItemProps {
  node: MindMapNode;
  x: number;
  y: number;
  isSelected: boolean;
  isDragging: boolean;
  hasChildren: boolean;
  onSelect: (id: string) => void;
  onEditStart: (id: string) => void;
  onEditEnd: (id: string, newText: string) => void;
  onEditingId: string | null;
  onToggleCollapse: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, deltaX: number, deltaY: number) => void;
  onDragEnd: (id: string) => void;
}

const NodeItem: FC<NodeItemProps> = ({
  node,
  x,
  y,
  isSelected,
  isDragging,
  hasChildren,
  onSelect,
  onEditStart,
  onEditEnd,
  onEditingId,
  onToggleCollapse,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const [editValue, setEditValue] = useState(node.text);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const width = node.width || NODE_WIDTH;
  const height = calculateNodeHeight(node.text, width);
  const colorIndex = node.level % COLOR_PALETTE.length;
  const fillColor = COLOR_PALETTE[colorIndex];

  const isEditing = onEditingId === node.id;

  useEffect(() => {
    setEditValue(node.text);
  }, [node.text]);

  useEffect(() => {
    setShowInput(isEditing);
    if (isEditing && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isEditing]);

  const handleClick = useCallback(() => {
    onSelect(node.id);
  }, [node.id, onSelect]);

  const handleDoubleClick = useCallback(() => {
    onEditStart(node.id);
  }, [node.id, onEditStart]);

  const handleDragStart = useCallback(() => {
    if (isEditing) return;
    const pos = groupRef.current?.position();
    if (pos) {
      lastPosRef.current = { x: pos.x, y: pos.y };
    }
    onDragStart(node.id);
  }, [isEditing, node.id, onDragStart]);

  const handleDragMove = useCallback(() => {
    if (isEditing) return;
    const pos = groupRef.current?.position();
    if (pos) {
      const deltaX = pos.x - lastPosRef.current.x;
      const deltaY = pos.y - lastPosRef.current.y;
      lastPosRef.current = { x: pos.x, y: pos.y };
      onDragMove(node.id, deltaX, deltaY);
    }
  }, [isEditing, node.id, onDragMove]);

  const handleDragEnd = useCallback(() => {
    if (isEditing) return;
    onDragEnd(node.id);
  }, [isEditing, node.id, onDragEnd]);

  const handleCollapseClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onToggleCollapse(node.id);
    },
    [node.id, onToggleCollapse]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
  };

  const handleInputBlur = () => {
    setShowInput(false);
    onEditEnd(node.id, editValue.trim() || node.text);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setShowInput(false);
      onEditEnd(node.id, editValue.trim() || node.text);
    }
    if (e.key === 'Escape') {
      setEditValue(node.text);
      setShowInput(false);
      onEditEnd(node.id, node.text);
    }
  };

  const renderCollapseButton = () => {
    if (!hasChildren) return null;
    const btnSize = 14;
    const btnX = -btnSize - 6;
    const btnY = height / 2 - btnSize / 2;

    return (
      <Group
        x={btnX}
        y={btnY}
        width={btnSize}
        height={btnSize}
        onClick={handleCollapseClick}
      >
        <Rect
          width={btnSize}
          height={btnSize}
          cornerRadius={3}
          fill="white"
          stroke="#90a4ae"
          strokeWidth={1}
        />
        <Shape
          x={btnSize / 2}
          y={btnSize / 2}
          sceneFunc={(context, shape) => {
            context.beginPath();
            const size = 4;
            if (node.collapsed) {
              context.moveTo(-size + 2, -size + 1);
              context.lineTo(size, 0);
              context.lineTo(-size + 2, size - 1);
            } else {
              context.moveTo(-size, -size + 2);
              context.lineTo(size - 1, -size + 2);
              context.lineTo(0, size);
            }
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          fill="#546e7a"
          stroke="#546e7a"
          strokeWidth={0}
        />
      </Group>
    );
  };

  const inputStyle: React.CSSProperties | undefined = showInput
    ? {
        position: 'absolute',
        left: `${x + 2}px`,
        top: `${y + 2}px`,
        width: `${width - 4}px`,
        height: `${height - 4}px`,
        padding: `${NODE_PADDING}px`,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        fontSize: `${FONT_SIZE}px`,
        fontFamily: 'inherit',
        color: '#333',
        resize: 'none',
        overflow: 'hidden',
        lineHeight: `${LINE_HEIGHT}px`,
        textAlign: 'center',
        zIndex: 1000,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }
    : undefined;

  return (
    <>
      <Group
        ref={groupRef}
        x={x}
        y={y}
        width={width}
        height={height}
        draggable={!isEditing}
        onClick={handleClick}
        onTap={handleClick}
        onDblClick={handleDoubleClick}
        onDblTap={handleDoubleClick}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        opacity={isDragging ? 0.7 : 1}
      >
        <Rect
          width={width}
          height={height}
          cornerRadius={8}
          fill={fillColor}
          stroke={isSelected ? '#1976d2' : 'transparent'}
          strokeWidth={isSelected ? 2 : 0}
          shadowColor={isSelected ? 'rgba(25, 118, 210, 0.3)' : 'transparent'}
          shadowBlur={isSelected ? 10 : 0}
          shadowOffset={{ x: 0, y: 2 }}
          shadowEnabled={isSelected}
        />
        <Text
          text={isEditing ? '' : node.text}
          x={NODE_PADDING}
          y={NODE_PADDING}
          width={width - NODE_PADDING * 2}
          height={height - NODE_PADDING * 2}
          fontSize={FONT_SIZE}
          fontFamily="inherit"
          fill="#333"
          align="center"
          verticalAlign="middle"
          lineHeight={LINE_HEIGHT / FONT_SIZE}
          wrap="word"
          ellipsis={false}
          perfectDrawEnabled={false}
        />
        {renderCollapseButton()}
      </Group>
      {showInput && (
        <textarea
          ref={inputRef}
          value={editValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          style={inputStyle}
        />
      )}
    </>
  );
};

export default NodeItem;
