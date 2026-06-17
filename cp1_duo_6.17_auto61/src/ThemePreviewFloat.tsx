import { useState, useRef, useEffect } from 'react';
import { Theme } from './componentData';

interface ThemePreviewFloatProps {
  theme: Theme;
}

function ThemePreviewFloat({ theme }: ThemePreviewFloatProps) {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const floatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPosition((prev) => ({
        x: Math.max(0, Math.min(window.innerWidth - 200, prev.x + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 100, prev.y + dy))
      }));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  return (
    <div
      ref={floatRef}
      className="theme-preview-float"
      style={{
        left: `${position.x}px`,
        bottom: 'auto',
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="text-sm font-medium mb-2" style={{ color: '#1f2937' }}>
        {theme.name}
      </div>
      <div className="flex items-center gap-3">
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            backgroundColor: theme.primaryColor,
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
          }}
        />
        <div style={{ fontFamily: theme.fontFamily, fontSize: '13px', color: '#4b5563' }}>
          Aa 字体预览
        </div>
      </div>
    </div>
  );
}

export default ThemePreviewFloat;
