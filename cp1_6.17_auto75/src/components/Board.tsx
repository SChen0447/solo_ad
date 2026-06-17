import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../socket';

interface BoardProps {
  tasks: {
    todo: Task[];
    'in-progress': Task[];
    done: Task[];
  };
  onTaskUpdate: (taskId: string, newStatus: string, newIndex: number) => void;
  onTaskDelete: (taskId: string) => void;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

const Board: React.FC<BoardProps> = ({ tasks, onTaskUpdate, onTaskDelete }) => {
  const [newTaskIds, setNewTaskIds] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const columns: Column[] = [
    { id: 'todo', title: '待办', tasks: tasks.todo },
    { id: 'in-progress', title: '进行中', tasks: tasks['in-progress'] },
    { id: 'done', title: '已完成', tasks: tasks.done },
  ];

  useEffect(() => {
    const allTaskIds = new Set([
      ...tasks.todo.map(t => t.id),
      ...tasks['in-progress'].map(t => t.id),
      ...tasks.done.map(t => t.id),
    ]);

    allTaskIds.forEach(id => {
      if (!newTaskIds.has(id)) {
        setNewTaskIds(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        setTimeout(() => {
          setNewTaskIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 300);
      }
    });
  }, [tasks]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    onTaskUpdate(draggableId, destination.droppableId, destination.index);
  };

  const getShortNodeId = (nodeId: string) => {
    const parts = nodeId.split('_');
    return parts[parts.length - 1].substring(0, 5).toUpperCase();
  };

  const handleEditStart = (task: Task) => {
    setEditingTask(task.id);
    setEditingText(task.text);
  };

  const handleEditSubmit = (taskId: string) => {
    if (editingText.trim()) {
      // 这里可以调用更新任务文本的接口
    }
    setEditingTask(null);
    setEditingText('');
  };

  return (
    <div className="board-container">
      <DragDropContext onDragEnd={handleDragEnd}>
        {columns.map(column => (
          <div key={column.id} className="board-column">
            <div className="column-header">
              <div className="column-badge">{column.tasks.length}</div>
              <div className="column-title">{column.title}</div>
            </div>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    minHeight: '80px',
                    transition: 'background-color 0.2s',
                    backgroundColor: snapshot.isDraggingOver
                      ? 'rgba(233, 69, 96, 0.1)'
                      : 'transparent',
                    borderRadius: '6px',
                  }}
                >
                  <AnimatePresence>
                    {column.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <motion.div
                            ref={provided.innerRef}
                            {...provided.draggableProps as any}
                            {...provided.dragHandleProps as any}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              scale: snapshot.isDragging ? 1.05 : 1,
                              rotate: snapshot.isDragging ? 2 : 0,
                              transition: {
                                type: 'spring',
                                stiffness: 500,
                                damping: 30,
                              },
                            }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            style={{
                              ...(provided.draggableProps.style as any),
                            }}
                          >
                            <div
                              className={`task-card ${newTaskIds.has(task.id) ? 'new' : ''}`}
                              style={{
                                borderLeftColor: task.color,
                                boxShadow: snapshot.isDragging
                                  ? '0 8px 25px rgba(233, 69, 96, 0.4)'
                                  : undefined,
                              }}
                            >
                              <div className="task-actions">
                                <button
                                  className="task-action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditStart(task);
                                  }}
                                  title="编辑"
                                >
                                  ✎
                                </button>
                                <button
                                  className="task-action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTaskDelete(task.id);
                                  }}
                                  title="删除"
                                >
                                  ✕
                                </button>
                              </div>

                              <div className="task-id-badge">
                                {getShortNodeId(task.node_id)}
                              </div>

                              {editingTask === task.id ? (
                                <input
                                  type="text"
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  onBlur={() => handleEditSubmit(task.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleEditSubmit(task.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingTask(null);
                                      setEditingText('');
                                    }
                                  }}
                                  autoFocus
                                  style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: '1px solid #e94560',
                                    color: '#e2e8f0',
                                    fontSize: '13px',
                                    padding: '4px 0',
                                    marginTop: '20px',
                                    outline: 'none',
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <div className="task-text">{task.text}</div>
                              )}

                              <div className="task-creator">
                                创建者: {task.creator_id.substring(0, 8)}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </Draggable>
                    ))}
                  </AnimatePresence>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </DragDropContext>
    </div>
  );
};

export default Board;
