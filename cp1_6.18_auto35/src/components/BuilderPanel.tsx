import React from 'react';
import { Draggable, Droppable, DragDropContext, DropResult } from 'react-beautiful-dnd';
import { BUILDER_MODULES } from '../types';
import { useResumeStore } from '../store/resumeStore';

export const BuilderPanel: React.FC = () => {
  const { addBlock, isMobileMenuOpen, toggleMobileMenu } = useResumeStore();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const module = BUILDER_MODULES[sourceIndex];

    if (result.destination.droppableId === 'canvas') {
      addBlock(module.type, result.destination.index);
    } else if (result.destination.droppableId === 'canvas-empty') {
      addBlock(module.type, 0);
    }
  };

  return (
    <>
      <div
        className={`mobile-menu-overlay ${isMobileMenuOpen ? 'visible' : ''}`}
        onClick={() => toggleMobileMenu(false)}
      />
      <aside className={`builder-panel scrollbar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <h2 className="builder-panel-title">📦 模块库</h2>
          <Droppable droppableId="builder-modules" isDropDisabled={true}>
            {(provided) => (
              <div
                className="module-list"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {BUILDER_MODULES.map((module, index) => (
                  <Draggable
                    key={module.type}
                    draggableId={`builder-${module.type}`}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`module-card ${snapshot.isDragging ? 'dragging' : ''}`}
                        onClick={() => {
                          addBlock(module.type);
                          toggleMobileMenu(false);
                        }}
                      >
                        <span className="module-icon">{module.icon}</span>
                        <div className="module-info">
                          <div className="module-title">{module.title}</div>
                          <div className="module-desc">{module.description}</div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </aside>
    </>
  );
};
