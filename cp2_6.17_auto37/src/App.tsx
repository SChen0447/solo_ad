import { useState, useEffect, useCallback } from 'react';
import type { Task, CreateTaskData, UpdateTaskData } from './types';
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

      {!loading && (
        <Board
          tasks={tasks}
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
