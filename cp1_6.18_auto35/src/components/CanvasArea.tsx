import React, { forwardRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useResumeStore } from '../store/resumeStore';
import { BlockRenderer, getBlockIcon } from './BlockRenderer';
import { BUILDER_MODULES, BlockType } from '../types';

interface CanvasAreaProps {
  canvasRef?: React.RefObject<HTMLDivElement>;
}

export const CanvasArea = forwardRef<HTMLDivElement, CanvasAreaProps>(
  ({ canvasRef }, _ref) => {
    const {
      resume,
      selectedBlockId,
      setSelectedBlock,
      reorderBlocks,
      removeBlock,
      addBlock,
    } = useResumeStore();

    const innerRef = (canvasRef as React.RefObject<HTMLDivElement>) || React.createRef<HTMLDivElement>();

    const handleDragEnd = (result: DropResult) => {
      if (!result.destination) return;

      const sourceId = result.draggableId;

      if (sourceId.startsWith('builder-')) {
        const moduleType = sourceId.replace('builder-', '') as BlockType;
        const module = BUILDER_MODULES.find((m) => m.type === moduleType);
        if (module) {
          if (result.destination.droppableId === 'canvas') {
            addBlock(module.type, result.destination.index);
          } else {
            addBlock(module.type);
          }
        }
        return;
      }

      if (result.destination.droppableId === 'canvas') {
        reorderBlocks(result.source.index, result.destination.index);
      }
    };

    const handleBlockClick = (blockId: string, e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.block-delete-btn')) return;
      if ((e.target as HTMLElement).closest('.block-drag-handle')) return;
      setSelectedBlock(blockId);
    };

    const renderCanvasContent = () => {
      if (resume.blocks.length === 0) {
        return (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="canvas-empty">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`canvas-empty ${snapshot.isDraggingOver ? 'drop-active' : ''}`}
                >
                  <div className="canvas-empty-icon">✨</div>
                  <div className="canvas-empty-text">开始创建你的简历</div>
                  <div className="canvas-empty-hint">
                    从左侧拖拽模块到这里，或点击模块快速添加
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        );
      }

      return (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="canvas">
            {(provided) => (
              <div
                className="blocks-container"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {resume.blocks.map((block, index) => (
                  <Draggable
                    key={block.id}
                    draggableId={`block-${block.id}`}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`block-card ${
                          selectedBlockId === block.id ? 'selected' : ''
                        } ${snapshot.isDragging ? 'dragging' : ''}`}
                        onClick={(e) => handleBlockClick(block.id, e)}
                      >
                        <div className="block-header">
                          <h3 className="block-title">
                            <span className="block-title-icon">
                              {getBlockIcon(block.type)}
                            </span>
                            {block.title}
                          </h3>
                          <div className="block-actions">
                            <div
                              className="block-drag-handle"
                              {...provided.dragHandleProps}
                              title="拖拽排序"
                            >
                              ⋮⋮
                            </div>
                            <button
                              className="block-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeBlock(block.id);
                              }}
                              title="删除模块"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <BlockRenderer block={block} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      );
    };

    return (
      <main className="canvas-wrapper dot-pattern">
        <div className="canvas-area" ref={innerRef}>
          {renderCanvasContent()}
        </div>
      </main>
    );
  }
);

CanvasArea.displayName = 'CanvasArea';
