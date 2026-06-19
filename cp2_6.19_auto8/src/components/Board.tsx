import { useState } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { TaskList, Task, Member } from '../types';

interface BoardProps {
  lists: TaskList[];
  members: Member[];
  onTaskClick: (task: Task) => void;
  onAddTask: (listId: string, title: string) => void;
  onAssignTask: (taskId: string, memberId: string | null) => void;
  getMemberById: (memberId: string | null) => Member | null;
}

function Board({ lists, members, onTaskClick, onAddTask, onAssignTask, getMemberById }: BoardProps) {
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleAddTask = (listId: string) => {
    if (newTaskTitle.trim()) {
      onAddTask(listId, newTaskTitle);
      setNewTaskTitle('');
    }
    setAddingToList(null);
  };

  return (
    <div className="board-container">
      {lists.map(list => (
        <div key={list.id} className="task-list">
          <div className="task-list-header">
            <h3 className="task-list-title">{list.title}</h3>
            <span className="task-list-count">{list.tasks.length}</span>
          </div>
          <div className="task-list-content">
            <SortableContext items={list.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {list.tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  member={getMemberById(task.assigneeId)}
                  members={members}
                  onClick={() => onTaskClick(task)}
                  onAssign={memberId => onAssignTask(task.id, memberId)}
                />
              ))}
            </SortableContext>
            {addingToList === list.id ? (
              <div>
                <input
                  type="text"
                  className="add-task-input"
                  placeholder="输入任务标题..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleAddTask(list.id);
                    } else if (e.key === 'Escape') {
                      setAddingToList(null);
                      setNewTaskTitle('');
                    }
                  }}
                  autoFocus
                />
                <button
                  className="comment-submit"
                  style={{ width: '100%' }}
                  onClick={() => handleAddTask(list.id)}
                >
                  添加任务
                </button>
              </div>
            ) : (
              <button
                className="add-task-btn"
                onClick={() => {
                  setAddingToList(list.id);
                  setNewTaskTitle('');
                }}
              >
                + 添加任务
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Board;
