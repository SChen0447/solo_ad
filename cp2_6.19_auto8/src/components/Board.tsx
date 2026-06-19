import { useState, useMemo } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { TaskList, Task, Member } from '../types';

interface BoardProps {
  title: string;
  lists: TaskList[];
  members: Member[];
  onTaskClick: (task: Task) => void;
  onAddTask: (listId: string, title: string) => void;
  onAssignTask: (taskId: string, memberId: string | null) => void;
  onAddMember: (email: string) => void;
  getMemberById: (memberId: string | null) => Member | null;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

function Board({
  title,
  lists,
  members,
  onTaskClick,
  onAddTask,
  onAssignTask,
  onAddMember,
  getMemberById,
}: BoardProps) {
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const memberTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach(member => {
      counts[member.id] = 0;
    });
    lists.forEach(list => {
      list.tasks.forEach(task => {
        if (task.assigneeId && counts[task.assigneeId] !== undefined) {
          counts[task.assigneeId]++;
        }
      });
    });
    return counts;
  }, [lists, members]);

  const handleAddTask = (listId: string) => {
    if (newTaskTitle.trim()) {
      onAddTask(listId, newTaskTitle);
      setNewTaskTitle('');
    }
    setAddingToList(null);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMemberEmail.trim()) {
      onAddMember(newMemberEmail);
      setNewMemberEmail('');
    }
  };

  return (
    <div>
      <div className="board-header">
        <h1 className="app-title">{title}</h1>
        <div className="member-list">
          {members.map(member => (
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
          <form className="add-member-form" onSubmit={handleAddMember}>
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
      </div>

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
    </div>
  );
}

export default Board;
