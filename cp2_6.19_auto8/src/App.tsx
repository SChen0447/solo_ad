import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';

import Board from './components/Board';
import TaskDetail from './components/TaskDetail';
import TaskCard from './components/TaskCard';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Board as BoardType, Member, Task, TaskList } from './types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const avatarColors = [
  '#4A90D9',
  '#E74C3C',
  '#2ECC71',
  '#F39C12',
  '#9B59B6',
  '#1ABC9C',
  '#E67E22',
  '#34495E',
];

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const initialMembers: Member[] = [
  { id: 'member-1', name: '张三', email: 'zhangsan@example.com', avatarColor: '#4A90D9' },
  { id: 'member-2', name: '李四', email: 'lisi@example.com', avatarColor: '#2ECC71' },
  { id: 'member-3', name: '王五', email: 'wangwu@example.com', avatarColor: '#E74C3C' },
];

const initialLists: TaskList[] = [
  {
    id: 'list-todo',
    title: '待办',
    tasks: [
      {
        id: 'task-1',
        title: '设计用户界面原型',
        description: '完成所有页面的UI设计稿，包括首页、详情页、个人中心等。',
        assigneeId: 'member-1',
        dueDate: '2026-06-25',
        comments: [
          {
            id: 'comment-1',
            authorId: 'member-2',
            content: '设计风格参考一下竞品的设计，保持简洁大方。',
            createdAt: '2026-06-18T10:30:00Z',
          },
        ],
        listId: 'list-todo',
        order: 0,
      },
      {
        id: 'task-2',
        title: '编写API文档',
        description: '完成后端API接口文档的编写，包括所有接口的参数说明和返回值示例。',
        assigneeId: 'member-2',
        dueDate: '2026-06-28',
        comments: [],
        listId: 'list-todo',
        order: 1,
      },
      {
        id: 'task-3',
        title: '数据库表结构设计',
        description: '根据需求文档设计数据库表结构，包括表关系、索引等。',
        assigneeId: null,
        dueDate: null,
        comments: [],
        listId: 'list-todo',
        order: 2,
      },
    ],
  },
  {
    id: 'list-in-progress',
    title: '进行中',
    tasks: [
      {
        id: 'task-4',
        title: '用户登录功能开发',
        description: '实现用户登录注册功能，包括邮箱验证、密码加密等。',
        assigneeId: 'member-3',
        dueDate: '2026-06-22',
        comments: [
          {
            id: 'comment-2',
            authorId: 'member-1',
            content: '记得加上忘记密码的功能哦。',
            createdAt: '2026-06-17T14:20:00Z',
          },
          {
            id: 'comment-3',
            authorId: 'member-3',
            content: '好的，已经在做了。',
            createdAt: '2026-06-17T15:00:00Z',
          },
        ],
        listId: 'list-in-progress',
        order: 0,
      },
      {
        id: 'task-5',
        title: '首页布局开发',
        description: '完成首页的页面布局开发，适配移动端和桌面端。',
        assigneeId: 'member-1',
        dueDate: '2026-06-20',
        comments: [],
        listId: 'list-in-progress',
        order: 1,
      },
    ],
  },
  {
    id: 'list-done',
    title: '已完成',
    tasks: [
      {
        id: 'task-6',
        title: '项目需求分析',
        description: '完成项目需求分析文档，明确项目目标和范围。',
        assigneeId: 'member-2',
        dueDate: '2026-06-15',
        comments: [
          {
            id: 'comment-4',
            authorId: 'member-1',
            content: '需求文档写得很详细，辛苦了！',
            createdAt: '2026-06-15T18:00:00Z',
          },
        ],
        listId: 'list-done',
        order: 0,
      },
    ],
  },
];

const initialBoard: BoardType = {
  id: 'board-1',
  title: '产品开发项目',
  lists: initialLists,
  members: initialMembers,
};

function App() {
  const [board, setBoard] = useLocalStorage<BoardType>('kanban-board', initialBoard);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const memberTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    board.members.forEach(member => {
      counts[member.id] = 0;
    });
    board.lists.forEach(list => {
      list.tasks.forEach(task => {
        if (task.assigneeId && counts[task.assigneeId] !== undefined) {
          counts[task.assigneeId]++;
        }
      });
    });
    return counts;
  }, [board]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = active.id as string;
    let foundTask: Task | null = null;
    board.lists.forEach(list => {
      const task = list.tasks.find(t => t.id === taskId);
      if (task) foundTask = task;
    });
    setActiveTask(foundTask);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    setBoard(prev => {
      const newBoard = { ...prev, lists: prev.lists.map(l => ({ ...l, tasks: [...l.tasks] })) };

      let activeListIndex = -1;
      let activeTaskIndex = -1;
      let overListIndex = -1;
      let overTaskIndex = -1;

      for (let i = 0; i < newBoard.lists.length; i++) {
        const taskIdx = newBoard.lists[i].tasks.findIndex(t => t.id === activeId);
        if (taskIdx !== -1) {
          activeListIndex = i;
          activeTaskIndex = taskIdx;
        }
        const overTaskIdx = newBoard.lists[i].tasks.findIndex(t => t.id === overId);
        if (overTaskIdx !== -1) {
          overListIndex = i;
          overTaskIndex = overTaskIdx;
        }
      }

      if (activeListIndex === -1 || overListIndex === -1) return prev;

      const [movedTask] = newBoard.lists[activeListIndex].tasks.splice(activeTaskIndex, 1);
      movedTask.listId = newBoard.lists[overListIndex].id;
      newBoard.lists[overListIndex].tasks.splice(overTaskIndex, 0, movedTask);

      newBoard.lists.forEach(list => {
        list.tasks.forEach((task, taskIdx) => {
          task.order = taskIdx;
        });
      });

      return newBoard;
    });
  };

  const addMember = (email: string) => {
    if (!email.trim()) return;
    const name = email.split('@')[0];
    const colorIndex = board.members.length % avatarColors.length;
    const newMember: Member = {
      id: generateId(),
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email: email.trim(),
      avatarColor: avatarColors[colorIndex],
    };
    setBoard(prev => ({
      ...prev,
      members: [...prev.members, newMember],
    }));
    setNewMemberEmail('');
  };

  const addTask = (listId: string, title: string) => {
    if (!title.trim()) return;
    const newTask: Task = {
      id: generateId(),
      title: title.trim(),
      description: '',
      assigneeId: null,
      dueDate: null,
      comments: [],
      listId,
      order: 0,
    };
    setBoard(prev => {
      const newBoard = { ...prev, lists: prev.lists.map(l => ({ ...l, tasks: [...l.tasks] })) };
      const listIndex = newBoard.lists.findIndex(l => l.id === listId);
      if (listIndex === -1) return prev;
      newTask.order = newBoard.lists[listIndex].tasks.length;
      newBoard.lists[listIndex].tasks.push(newTask);
      return newBoard;
    });
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setBoard(prev => {
      const newBoard = { ...prev, lists: prev.lists.map(l => ({ ...l, tasks: l.tasks.map(t => ({ ...t })) })) };
      for (const list of newBoard.lists) {
        const taskIndex = list.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          list.tasks[taskIndex] = { ...list.tasks[taskIndex], ...updates };
          break;
        }
      }
      return newBoard;
    });
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const assignTask = (taskId: string, memberId: string | null) => {
    updateTask(taskId, { assigneeId: memberId });
  };

  const getMemberById = (memberId: string | null) => {
    if (!memberId) return null;
    return board.members.find(m => m.id === memberId) || null;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">{board.title}</h1>
        <div className="member-list">
          {board.members.map(member => (
            <div key={member.id} className="member-item">
              <div
                className="member-avatar"
                style={{ background: member.avatarColor }}
              >
                {getInitials(member.name)}
              </div>
              <span>{member.name}</span>
              <span className="member-task-count">{memberTaskCounts[member.id] || 0}</span>
            </div>
          ))}
          <form
            className="add-member-form"
            onSubmit={e => {
              e.preventDefault();
              addMember(newMemberEmail);
            }}
          >
            <input
              type="email"
              className="add-member-input"
              placeholder="输入邮箱添加成员"
              value={newMemberEmail}
              onChange={e => setNewMemberEmail(e.target.value)}
            />
            <button type="submit" className="add-member-btn">
              添加
            </button>
          </form>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Board
          lists={board.lists}
          members={board.members}
          onTaskClick={setSelectedTask}
          onAddTask={addTask}
          onAssignTask={assignTask}
          getMemberById={getMemberById}
        />
        <DragOverlay>
          {activeTask ? (
            <div className="drag-overlay">
              <TaskCard
                task={activeTask}
                member={getMemberById(activeTask.assigneeId)}
                members={board.members}
                onClick={() => {}}
                onAssign={() => {}}
                isDragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          members={board.members}
          getMemberById={getMemberById}
          onClose={() => setSelectedTask(null)}
          onUpdate={updates => updateTask(selectedTask.id, updates)}
        />
      )}
    </div>
  );
}

export default App;
