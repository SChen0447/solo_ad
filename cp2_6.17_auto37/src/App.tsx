import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Task, CreateTaskData, UpdateTaskData, TaskPriority } from './types';
import Board from './components/Board';
import TaskDetail from './components/TaskDetail';
import CreateTaskModal from './components/CreateTaskModal';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalDefaultStatus, setCreateModalDefaultStatus] = useState<Task['status']>('todo');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [filterKey, setFilterKey] = useState(0);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const showSuccess = useCallback(() => {
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2000);
  }, []);

  const handleCreateTask = useCallback(async (taskData: CreateTaskData) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });
      const newTask = await response.json();
      setTasks(prev => [...prev, newTask]);
      setIsCreateModalOpen(false);
      showSuccess();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  }, [showSuccess]);

  const handleUpdateTask = useCallback(async (id: string, updates: UpdateTaskData) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      const updatedTask = await response.json();
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      showSuccess();
      return updatedTask;
    } catch (error) {
      console.error('Failed to update task:', error);
      return null;
    }
  }, [showSuccess]);

  const handleUpdateTaskStatus = useCallback(async (id: string, status: Task['status']) => {
    try {
      const response = await fetch(`/api/tasks/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      const updatedTask = await response.json();
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      return updatedTask;
    } catch (error) {
      console.error('Failed to update task status:', error);
      return null;
    }
  }, []);

  const handleUpdateTaskOrder = useCallback(async (id: string, order: number) => {
    try {
      const response = await fetch(`/api/tasks/${id}/order`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order }),
      });
      if (!response.ok) throw new Error('Failed to update order');
      const updatedTask = await response.json();
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      return updatedTask;
    } catch (error) {
      console.error('Failed to update task order:', error);
      return null;
    }
  }, []);

  const handleOpenCreateModal = useCallback((status: Task['status'] = 'todo') => {
    setCreateModalDefaultStatus(status);
    setIsCreateModalOpen(true);
  }, []);

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }
      if (assigneeFilter.trim()) {
        const search = assigneeFilter.trim().toLowerCase();
        if (!task.assignee || !task.assignee.toLowerCase().includes(search)) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, priorityFilter, assigneeFilter]);

  const handlePriorityChange = (value: TaskPriority | 'all') => {
    setPriorityFilter(value);
    setFilterKey(prev => prev + 1);
  };

  const handleAssigneeChange = (value: string) => {
    setAssigneeFilter(value);
    setFilterKey(prev => prev + 1);
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-title">任务管理看板</div>
        <div className="navbar-right">
          <span className="navbar-user">当前用户：管理员</span>
          <button className="logout-btn">退出</button>
        </div>
      </nav>

      <div className={`success-toast ${showSuccessToast ? 'show' : ''}`}>
        操作成功！
      </div>

      <div className="filter-toolbar">
        <div className="filter-item">
          <label className="filter-label">优先级：</label>
          <select
            className="filter-select"
            value={priorityFilter}
            onChange={(e) => handlePriorityChange(e.target.value as TaskPriority | 'all')}
          >
            <option value="all">全部</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
        <div className="filter-item">
          <label className="filter-label">负责人：</label>
          <input
            type="text"
            className="filter-input"
            placeholder="输入负责人姓名"
            value={assigneeFilter}
            onChange={(e) => handleAssigneeChange(e.target.value)}
          />
        </div>
      </div>

      {!loading && (
        <Board
          key={filterKey}
          tasks={filteredTasks}
          onSelectTask={setSelectedTaskId}
          onOpenCreateModal={handleOpenCreateModal}
          onUpdateTaskStatus={handleUpdateTaskStatus}
          onUpdateTaskOrder={handleUpdateTaskOrder}
        />
      )}

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTask}
        defaultStatus={createModalDefaultStatus}
      />

      <TaskDetail
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={handleUpdateTask}
      />
    </div>
  );
}

export default App;
