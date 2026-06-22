import React, { useState, useRef, useEffect, memo } from 'react';
import type { CanvasElement, StickyElement, RectangleElement, PathElement } from '../types';

interface CanvasElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
  smoothPath: (points: { x: number; y: number }[]) => string;
}

const StickyNoteComponent = memo(function StickyNoteComponent({
  element,
  isSelected,
  onDelete,
  onUpdate,
}: {
  element: StickyElement;
  isSelected: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(element.id, { text: e.target.value } as Partial<StickyElement>);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(element.id);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        backgroundColor: element.backgroundColor,
        border: `0.5px solid ${element.borderColor}`,
        borderRadius: '8px',
        boxShadow: isSelected
          ? '2px 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(99, 102, 241, 0.4)'
          : 'none',
        cursor: 'move',
        transition: 'box-shadow 0.2s ease',
        padding: '16px',
        boxSizing: 'border-box',
        zIndex: element.zIndex,
        overflow: 'hidden',
      }}
      onDoubleClick={handleDoubleClick}
      data-element-id={element.id}
    >
      <button
        onClick={handleDelete}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: '#EF4444',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          opacity: 0,
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = isSelected ? '1' : '0';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        ×
      </button>
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={element.text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: '14px',
            lineHeight: '1.5',
            fontFamily: 'inherit',
            color: '#1F2937',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#1F2937',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflow: 'hidden',
          }}
        >
          {element.text || <span style={{ color: '#9CA3AF' }}>双击编辑文字...</span>}
        </div>
      )}
      <style>{`
        div[data-element-id="${element.id}"]:hover button {
          opacity: 1;
        }
      `}</style>
    </div>
  );
});

const RectangleComponent = memo(function RectangleComponent({
  element,
  isSelected,
}: {
  element: RectangleElement;
  isSelected: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        backgroundColor: element.fillColor,
        border: `${element.borderWidth}px solid ${element.borderColor}`,
        borderRadius: '4px',
        boxShadow: isSelected
          ? '2px 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(99, 102, 241, 0.4)'
          : 'none',
        cursor: 'move',
        transition: 'box-shadow 0.2s ease',
        zIndex: element.zIndex,
      }}
      data-element-id={element.id}
    />
  );
});

const PathComponent = memo(function PathComponent({
  element,
  isSelected,
  smoothPath,
}: {
  element: PathElement;
  isSelected: boolean;
  smoothPath: (points: { x: number; y: number }[]) => string;
}) {
  const pathD = smoothPath(element.points);
  if (!pathD) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex: element.zIndex,
        overflow: 'visible',
      }}
      data-element-id={element.id}
    >
      <path
        d={pathD}
        fill="none"
        stroke={element.strokeColor}
        strokeWidth={element.strokeWidth}
        strokeOpacity={element.opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: isSelected ? 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.6))' : 'none',
          pointerEvents: 'stroke',
          cursor: 'move',
          transition: 'filter 0.2s ease',
        }}
      />
    </svg>
  );
});

export const CanvasElementComponent = memo(function CanvasElementComponent({
  element,
  isSelected,
  onDelete,
  onUpdate,
  smoothPath,
}: CanvasElementProps) {
  const handleMouseEnter = (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.boxShadow = isSelected
      ? '2px 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(99, 102, 241, 0.4)'
      : '2px 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(99, 102, 241, 0.25)';
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.boxShadow = isSelected
      ? '2px 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(99, 102, 241, 0.4)'
      : 'none';
  };

  const commonProps = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };

  if (element.type === 'sticky') {
    return (
      <div {...commonProps} style={{ position: 'absolute', left: element.x, top: element.y }}>
        <StickyNoteComponent
          element={element}
          isSelected={isSelected}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      </div>
    );
  }

  if (element.type === 'rectangle') {
    return (
      <div {...commonProps}>
        <RectangleComponent element={element} isSelected={isSelected} />
      </div>
    );
  }

  if (element.type === 'path') {
    return <PathComponent element={element} isSelected={isSelected} smoothPath={smoothPath} />;
  }

  return null;
});

export { StickyNoteComponent, RectangleComponent, PathComponent };
