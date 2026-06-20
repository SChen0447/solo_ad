import React, { useRef, useState } from 'react';
import { usePixel, CANVAS_SIZE } from '../store/pixelStore';

interface FramesPanelProps {
  horizontal?: boolean;
}

const FramesPanel: React.FC<FramesPanelProps> = ({ horizontal = false }) => {
  const { state, dispatch } = usePixel();
  const { frames, currentFrameIndex } = state;
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  const drawThumbnail = (index: number) => {
    const canvas = canvasRefs.current[index];
    const frame = frames[index];
    if (!canvas || !frame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const pixelSize = size / CANVAS_SIZE;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        const color = frame.pixels[y * CANVAS_SIZE + x];
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  };

  React.useEffect(() => {
    frames.forEach((_, index) => {
      drawThumbnail(index);
    });
  }, [frames]);

  const handleAddFrame = () => {
    dispatch({ type: 'ADD_FRAME' });
  };

  const handleDeleteFrame = (frameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (frames.length > 1) {
      dispatch({ type: 'DELETE_FRAME', frameId });
    }
  };

  const handleSelectFrame = (index: number) => {
    dispatch({ type: 'SET_CURRENT_FRAME', frameIndex: index });
  };

  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (toIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      dispatch({ type: 'MOVE_FRAME', fromIndex: draggedIndex, toIndex });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDelayChange = (frameId: string, delay: number) => {
    dispatch({ type: 'SET_FRAME_DELAY', frameId, delay });
  };

  const currentFrame = frames[currentFrameIndex];

  const panelStyle: React.CSSProperties = horizontal
    ? {
        display: 'flex',
        flexDirection: 'row',
        gap: '10px',
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid #333',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '12px',
        overflowX: 'auto',
        overflowY: 'hidden',
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid #333',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '12px',
        overflowY: 'auto',
        maxHeight: '100%',
        width: '120px',
      };

  return (
    <div style={panelStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: horizontal ? '0' : '4px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#ddd' }}>
          帧列表
        </span>
        <button
          onClick={handleAddFrame}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: '#444',
            color: '#fff',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.3s ease',
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#666';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#444';
          }}
          title="添加帧"
        >
          +
        </button>
      </div>

      {!horizontal && currentFrame && (
        <div
          style={{
            marginBottom: '10px',
            padding: '8px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
          }}
        >
          <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '4px' }}>
            延迟: {currentFrame.delay}ms
          </label>
          <input
            type="range"
            min="50"
            max="500"
            step="10"
            value={currentFrame.delay}
            onChange={(e) => handleDelayChange(currentFrame.id, Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      )}

      <div
        style={{
          display: horizontal ? 'flex' : 'flex',
          flexDirection: horizontal ? 'row' : 'column',
          gap: '8px',
          flex: horizontal ? '0 0 auto' : 'none',
        }}
      >
        {frames.map((frame, index) => (
          <div
            key={frame.id}
            draggable
            onDragStart={(e) => handleDragStart(index, e)}
            onDragOver={(e) => handleDragOver(index, e)}
            onDrop={(e) => handleDrop(index, e)}
            onDragEnd={handleDragEnd}
            onClick={() => handleSelectFrame(index)}
            style={{
              position: 'relative',
              cursor: 'grab',
              borderRadius: '8px',
              padding: '3px',
              background: currentFrameIndex === index ? '#5865F2' : 'transparent',
              transition: 'all 0.2s ease',
              border: dragOverIndex === index ? '2px dashed #5865F2' : 'none',
              opacity: draggedIndex === index ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'relative',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              <canvas
                ref={(el) => {
                  canvasRefs.current[index] = el;
                }}
                width={64}
                height={64}
                style={{
                  display: 'block',
                  imageRendering: 'pixelated',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  left: '2px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: '#fff',
                  fontSize: '10px',
                  padding: '1px 4px',
                  borderRadius: '3px',
                }}
              >
                {index + 1}
              </div>
              {frames.length > 1 && (
                <button
                  onClick={(e) => handleDeleteFrame(frame.id, e)}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'rgba(255, 0, 0, 0.8)',
                    color: '#fff',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  title="删除帧"
                >
                  ×
                </button>
              )}
            </div>
            {horizontal && (
              <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', marginTop: '2px' }}>
                {frame.delay}ms
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FramesPanel;
