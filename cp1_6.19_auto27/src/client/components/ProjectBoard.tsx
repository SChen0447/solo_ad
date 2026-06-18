import { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { useAppStore } from '../store';
import type { Task, TaskStatus } from '../types';

const statusConfig: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  todo: { label: '待办', color: '#a0a0c8', bgColor: '#2d2d44' },
  'in-progress': { label: '进行中', color: '#8ab8e0', bgColor: '#3d6b93' },
  review: { label: '待审核', color: '#e8c870', bgColor: '#b8860b' },
  done: { label: '已完成', color: '#90d8a8', bgColor: '#2d6a4f' },
};

const statusOrder: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];

function TaskCard({
  task,
  index,
  onEdit,
}: {
  task: Task;
  index: number;
  onEdit: (t: Task) => void;
}) {
  const config = statusConfig[task.status];
  const due = new Date(task.dueDate);
  const now = new Date();
  const isOverdue = due < now && task.status !== 'done';

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onEdit(task)}
          style={{
            ...provided.draggableProps.style,
            background: config.bgColor,
            padding: 14,
            borderRadius: 12,
            marginBottom: 10,
            cursor: 'pointer',
            transition: snapshot.isDragging
              ? 'transform 0.15s cubic-bezier(.2,1.4,.6,1)'
              : 'background-color 0.3s linear',
            transform: snapshot.isDragging ? 'scale(1.05) rotate(1deg)' : 'scale(1)',
            boxShadow: snapshot.isDragging
              ? '0 12px 40px rgba(0,0,0,0.5)'
              : '0 2px 8px rgba(0,0,0,0.2)',
            border: `1px solid ${isOverdue ? '#e94560' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <h4
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#f0f0f8',
                flex: 1,
                marginRight: 8,
                lineHeight: 1.4,
              }}
            >
              {task.title}
            </h4>
            <div
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                background: isOverdue ? 'rgba(233,69,96,0.3)' : 'rgba(255,255,255,0.1)',
                color: isOverdue ? '#e94560' : config.color,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {task.estimatedHours}h
            </div>
          </div>
          {task.description && (
            <p
              style={{
                fontSize: 12,
                color: '#a0a0b8',
                marginBottom: 10,
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {task.description}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: `hsl(${(task.assignee.charCodeAt(0) * 37) % 360}, 60%, 55%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {task.assignee.charAt(0)}
              </div>
              <span style={{ fontSize: 12, color: '#c0c0d8', fontWeight: 500 }}>{task.assignee}</span>
            </div>
            <span
              style={{
                fontSize: 11,
                color: isOverdue ? '#e94560' : '#8080a0',
                fontWeight: isOverdue ? 600 : 400,
              }}
            >
              {new Date(task.dueDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function ProjectBoard() {
  const { currentProject, currentProjectId, moveTask, loadProject, updateTask } = useAppStore();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editData, setEditData] = useState<Partial<Task>>({});
  const [showNewTask, setShowNewTask] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentProjectId) loadProject(currentProjectId);
    }, 30000);
    return () => clearInterval(interval);
  }, [currentProjectId, loadProject]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as TaskStatus;
    await moveTask(result.draggableId, newStatus);
  };

  const startEdit = (t: Task) => {
    setEditingTask(t);
    setEditData({
      title: t.title,
      description: t.description,
      assignee: t.assignee,
      estimatedHours: t.estimatedHours,
      dueDate: t.dueDate.slice(0, 10),
    });
  };

  const saveEdit = async () => {
    if (!editingTask) return;
    await updateTask(editingTask.id, editData);
    setEditingTask(null);
  };

  if (!currentProject) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#606090' }}>
        <p>加载项目中...</p>
      </div>
    );
  }

  const tasksByStatus: Record<TaskStatus, Task[]> = {
    todo: [],
    'in-progress': [],
    review: [],
    done: [],
  };
  currentProject.tasks.forEach(t => tasksByStatus[t.status].push(t));

  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: '#f0f0f8', fontSize: 22, marginBottom: 4 }}>{currentProject.name}</h2>
          <p style={{ color: '#8080a0', fontSize: 13 }}>
            {currentProject.members.join('、')} · 共 {currentProject.tasks.length} 个任务
          </p>
        </div>
        <button
          onClick={() => {
            const event = new CustomEvent('openNewTaskModal');
            window.dispatchEvent(event);
          }}
          style={{
            padding: '12px 24px',
            borderRadius: 12,
            background: '#e94560',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(233,69,96,0.3)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.filter = 'brightness(1.2)';
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(233,69,96,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.filter = 'brightness(1)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(233,69,96,0.3)';
          }}
        >
          + 新建任务
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            flex: 1,
            minHeight: 0,
          }}
        >
          {statusOrder.map(status => {
            const config = statusConfig[status];
            const tasks = tasksByStatus[status];
            return (
              <div
                key={status}
                style={{
                  background: '#16213e',
                  borderRadius: 14,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  border: `1px solid rgba(255,255,255,0.04)`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: config.color,
                      }}
                    />
                    <h3 style={{ color: config.color, fontSize: 14, fontWeight: 600 }}>
                      {config.label}
                    </h3>
                    <span
                      style={{
                        fontSize: 12,
                        color: '#8080a0',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '2px 8px',
                        borderRadius: 10,
                      }}
                    >
                      {tasks.length}
                    </span>
                  </div>
                </div>
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: 4,
                        borderRadius: 8,
                        background: snapshot.isDraggingOver ? 'rgba(74,74,106,0.2)' : 'transparent',
                        transition: 'background 0.15s ease',
                        minHeight: 80,
                      }}
                    >
                      {tasks.map((task, index) => (
                        <TaskCard key={task.id} task={task} index={index} onEdit={startEdit} />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Edit Task Modal */}
      {editingTask && (
        <div
          onClick={() => setEditingTask(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#16213e',
              padding: 28,
              borderRadius: 16,
              width: 480,
              maxWidth: '90vw',
              border: '1px solid #4a4a6a',
            }}
          >
            <h3 style={{ color: '#e4e4f0', marginBottom: 20, fontSize: 20 }}>编辑任务</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: '#a0a0b8', fontSize: 13, marginBottom: 6 }}>标题</label>
              <input
                value={editData.title || ''}
                onChange={e => setEditData({ ...editData, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#2d2d44',
                  border: '1px solid #4a4a6a',
                  color: '#e4e4f0',
                  fontSize: 14,
                }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: '#a0a0b8', fontSize: 13, marginBottom: 6 }}>描述</label>
              <textarea
                value={editData.description || ''}
                onChange={e => setEditData({ ...editData, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#2d2d44',
                  border: '1px solid #4a4a6a',
                  color: '#e4e4f0',
                  fontSize: 14,
                  minHeight: 72,
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', color: '#a0a0b8', fontSize: 13, marginBottom: 6 }}>负责人</label>
                <select
                  value={editData.assignee || ''}
                  onChange={e => setEditData({ ...editData, assignee: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#2d2d44',
                    border: '1px solid #4a4a6a',
                    color: '#e4e4f0',
                    fontSize: 14,
                  }}
                >
                  {currentProject.members.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: '#a0a0b8', fontSize: 13, marginBottom: 6 }}>预计工时（小时）</label>
                <input
                  type="number"
                  min={1}
                  value={editData.estimatedHours || 1}
                  onChange={e => setEditData({ ...editData, estimatedHours: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#2d2d44',
                    border: '1px solid #4a4a6a',
                    color: '#e4e4f0',
                    fontSize: 14,
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: '#a0a0b8', fontSize: 13, marginBottom: 6 }}>截止日期</label>
              <input
                type="date"
                value={editData.dueDate || ''}
                onChange={e => setEditData({ ...editData, dueDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#2d2d44',
                  border: '1px solid #4a4a6a',
                  color: '#e4e4f0',
                  fontSize: 14,
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#a0a0b8', fontSize: 13, marginBottom: 6 }}>状态历史</label>
              <div style={{ background: '#0f1528', padding: 10, borderRadius: 8, maxHeight: 100, overflowY: 'auto' }}>
                {editingTask.history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: '#8080a0' }}>
                    <span style={{ color: statusConfig[h.status].color, fontWeight: 500 }}>{statusConfig[h.status].label}</span>
                    <span>{new Date(h.timestamp).toLocaleString('zh-CN')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingTask(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  background: 'transparent',
                  border: '1px solid #4a4a6a',
                  color: '#a0a0b8',
                  fontSize: 14,
                }}
              >
                取消
              </button>
              <button
                onClick={saveEdit}
                style={{
                  padding: '10px 24px',
                  borderRadius: 12,
                  background: '#e94560',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
