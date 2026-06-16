import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GripVertical, Trash2, Edit } from 'lucide-react';
import type { FrameInfo, PixelFrame } from '../types';
import { CANVAS_SIZE } from '../types';
import { drawPixelFrame } from '../utils/canvasUtils';

interface TimelineProps {
  frameSequence: FrameInfo[];
  keyFrames: PixelFrame[];
  currentFrame: number;
  onFrameSelect: (index: number) => void;
  onKeyFrameReorder: (fromIndex: number, toIndex: number) => void;
  onKeyFrameDelete: (index: number) => void;
  onKeyFrameEdit: (index: number) => void;
  transitionFrames: number;
}

const Timeline: React.FC<TimelineProps> = ({
  frameSequence,
  keyFrames,
  currentFrame,
  onFrameSelect,
  onKeyFrameReorder,
  onKeyFrameDelete,
  onKeyFrameEdit,
  transitionFrames,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [draggedKeyFrame, setDraggedKeyFrame] = useState<number | null>(null);
  const [dropIndicator, setDropIndicator] = useState<number | null>(null);
  const thumbnailsRef = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const thumbnailSize = 64;
  const thumbnailScale = thumbnailSize / CANVAS_SIZE;

  const drawThumbnail = useCallback(
    (canvas: HTMLCanvasElement, frame: PixelFrame) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(0, 0, thumbnailSize, thumbnailSize);
      drawPixelFrame(ctx, frame, thumbnailScale);
    },
    [thumbnailScale, thumbnailSize]
  );

  useEffect(() => {
    thumbnailsRef.current.forEach((canvas, index) => {
      if (index < frameSequence.length) {
        drawThumbnail(canvas, frameSequence[index].frame);
      }
    });
  }, [frameSequence, drawThumbnail]);

  const getKeyFrameGlobalIndex = (keyFrameIdx: number): number => {
    return keyFrameIdx * (transitionFrames + 1);
  };

  const handleDragStart = (e: React.DragEvent, keyFrameIndex: number) => {
    setDraggedKeyFrame(keyFrameIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(keyFrameIndex));
  };

  const handleDragOver = (e: React.DragEvent, frameIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedKeyFrame === null) return;

    const frameInfo = frameSequence[frameIndex];
    if (frameInfo.isKeyFrame && frameInfo.keyFrameIndex !== undefined) {
      if (frameInfo.keyFrameIndex !== draggedKeyFrame) {
        setDropIndicator(frameInfo.keyFrameIndex);
      } else {
        setDropIndicator(null);
      }
    }
  };

  const handleDragLeave = () => {
    setDropIndicator(null);
  };

  const handleDrop = (e: React.DragEvent, targetKeyFrameIndex: number) => {
    e.preventDefault();
    if (draggedKeyFrame === null || draggedKeyFrame === targetKeyFrameIndex) {
      setDraggedKeyFrame(null);
      setDropIndicator(null);
      return;
    }

    onKeyFrameReorder(draggedKeyFrame, targetKeyFrameIndex);
    setDraggedKeyFrame(null);
    setDropIndicator(null);
  };

  const handleDragEnd = () => {
    setDraggedKeyFrame(null);
    setDropIndicator(null);
  };

  const setCanvasRef = (index: number) => (canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      thumbnailsRef.current.set(index, canvas);
    } else {
      thumbnailsRef.current.delete(index);
    }
  };

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h3>时间轴</h3>
        <span className="timeline-info">
          {keyFrames.length} 个关键帧 • {transitionFrames} 帧过渡 • {frameSequence.length} 帧总时长
        </span>
      </div>

      <div className="timeline-scroll" ref={scrollContainerRef}>
        <div className="timeline-track">
          {frameSequence.map((frameInfo, globalIndex) => {
            const isKeyFrame = frameInfo.isKeyFrame;
            const keyFrameIndex = frameInfo.keyFrameIndex;
            const isCurrent = globalIndex === currentFrame;
            const isDropTarget = dropIndicator === keyFrameIndex;
            const isDragging = draggedKeyFrame === keyFrameIndex;

            return (
              <div
                key={globalIndex}
                className={`timeline-thumb ${
                  isKeyFrame ? 'key-frame' : 'transition-frame'
                } ${isCurrent ? 'current' : ''} ${
                  isDropTarget ? 'drop-target' : ''
                } ${isDragging ? 'dragging' : ''}`}
                onClick={() => onFrameSelect(globalIndex)}
                onDragOver={(e) => handleDragOver(e, globalIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) =>
                  keyFrameIndex !== undefined && handleDrop(e, keyFrameIndex)
                }
              >
                <canvas
                  ref={setCanvasRef(globalIndex)}
                  width={thumbnailSize}
                  height={thumbnailSize}
                  className="thumb-canvas"
                />

                {isKeyFrame && keyFrameIndex !== undefined && (
                  <>
                    <div
                      className="keyframe-handle"
                      draggable
                      onDragStart={(e) => handleDragStart(e, keyFrameIndex)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical size={12} />
                    </div>

                    <div className="keyframe-index">K{keyFrameIndex + 1}</div>

                    <div className="keyframe-actions">
                      <button
                        className="action-btn edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          onKeyFrameEdit(keyFrameIndex);
                        }}
                        title="编辑此帧"
                      >
                        <Edit size={12} />
                      </button>
                      {keyFrames.length > 1 && (
                        <button
                          className="action-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onKeyFrameDelete(keyFrameIndex);
                          }}
                          title="删除此帧"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </>
                )}

                {!isKeyFrame && (
                  <div className="transition-indicator">•••</div>
                )}
              </div>
            );
          })}

          {frameSequence.length === 0 && (
            <div className="timeline-empty">
              <p>暂无帧数据</p>
              <p className="hint">在编辑器中绘制角色并点击"+"添加关键帧</p>
            </div>
          )}
        </div>
      </div>

      <div className="timeline-footer">
        <span className="hint-text">
          💡 拖拽关键帧手柄可调整顺序 • 点击缩略图跳转到对应帧
        </span>
      </div>
    </div>
  );
};

export default Timeline;
