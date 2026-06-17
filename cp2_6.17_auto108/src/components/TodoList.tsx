import { useState } from 'react';
import { Socket } from 'socket.io-client';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

interface TodoListProps {
  socket: Socket;
  roomCode: string;
  todos: TodoItem[];
  completedCount: number;
}

export default function TodoList({ socket, roomCode, todos, completedCount }: TodoListProps) {
  const [newTodo, setNewTodo] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    socket.emit('todo:add', { roomCode, text: newTodo.trim() });
    setNewTodo('');
  };

  const handleToggle = (todoId: string) => {
    socket.emit('todo:toggle', { roomCode, todoId });
  };

  const handleDelete = (todoId: string) => {
    if (confirmDelete === todoId) {
      socket.emit('todo:delete', { roomCode, todoId });
      setConfirmDelete(null);
    } else {
      setConfirmDelete(todoId);
      setTimeout(() => {
        setConfirmDelete((prev) => (prev === todoId ? null : prev));
      }, 3000);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>📋 待办列表</span>
        <span style={styles.counter}>
          {completedCount} / {todos.length}
        </span>
      </div>

      <form onSubmit={handleAddTodo} style={styles.addForm}>
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="添加新待办..."
          style={styles.input}
        />
        <button type="submit" style={styles.addBtn}>
          +
        </button>
      </form>

      <div style={styles.list}>
        {todos.length === 0 && (
          <div style={styles.emptyState}>暂无待办事项</div>
        )}
        {todos.map((todo) => (
          <div key={todo.id} style={styles.todoItem}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggle(todo.id)}
                style={styles.checkbox}
              />
              <span
                style={{
                  ...styles.todoText,
                  textDecoration: todo.completed ? 'line-through' : 'none',
                  opacity: todo.completed ? 0.5 : 1,
                }}
              >
                {todo.text}
              </span>
            </label>
            <button
              onClick={() => handleDelete(todo.id)}
              style={{
                ...styles.deleteBtn,
                backgroundColor: confirmDelete === todo.id ? '#e53935' : 'transparent',
                color: confirmDelete === todo.id ? '#fff' : '#888',
              }}
              title={confirmDelete === todo.id ? '再次点击确认删除' : '删除'}
            >
              {confirmDelete === todo.id ? '⚠️ 确认' : '🗑️'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#2d2d2d',
    borderRadius: '12px',
    padding: '16px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #3a3a3a',
  },
  title: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
  },
  counter: {
    color: '#aaa',
    fontSize: '13px',
    backgroundColor: '#1e1e1e',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  addForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #3a3a3a',
    backgroundColor: '#1e1e1e',
    color: '#e0e0e0',
    fontSize: '13px',
    outline: 'none',
  },
  addBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#5b6cff',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    transition: 'filter 0.2s, transform 0.2s',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  emptyState: {
    color: '#666',
    textAlign: 'center',
    padding: '24px',
    fontSize: '13px',
  },
  todoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#1e1e1e',
    borderRadius: '6px',
  },
  checkboxLabel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: '#5b6cff',
    cursor: 'pointer',
  },
  todoText: {
    color: '#e0e0e0',
    fontSize: '14px',
    transition: 'opacity 0.2s',
    wordBreak: 'break-word',
  },
  deleteBtn: {
    padding: '6px 8px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
};
