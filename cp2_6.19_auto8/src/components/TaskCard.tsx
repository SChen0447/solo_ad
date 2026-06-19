import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Member } from '../types';

interface TaskCardProps {
  task: Task;
  member: Member | null;
  members: Member[];
  onClick: () => void;
  onAssign: (memberId: string | null) => void;
  isDragging?: boolean;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
};

const isOverdue = (dateStr: string | null) => {
  if (!dateStr) return false;
  const dueDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
};

function TaskCard({ task, member, members, onClick, onAssign, isDragging = false }: TaskCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleAssign = (memberId: string | null) => {
    onAssign(memberId);
    setShowDropdown(false);
  };

  const dueDateClass = isOverdue(task.dueDate) ? 'task-card-due overdue' : 'task-card-due';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <div className="task-card-title">{task.title}</div>
      <div ref={dropdownRef} style={{ position: 'absolute', top: 10, right: 10 }}>
        {member ? (
          <div
            className="task-card-assignee"
            style={{ background: member.avatarColor }}
            onClick={handleAvatarClick}
          >
            {getInitials(member.name)}
          </div>
        ) : (
          <div
            className="task-card-assignee"
            style={{ background: '#ccc' }}
            onClick={handleAvatarClick}
            title="点击分配负责人"
          >
            ?
          </div>
        )}
        {showDropdown && (
          <div className="assignee-dropdown" onClick={e => e.stopPropagation()}>
            <div
              className="assignee-dropdown-item"
              onClick={() => handleAssign(null)}
            >
              <div className="member-avatar" style={{ background: '#ccc', width: 20, height: 20, fontSize: 10 }}>
                ?
              </div>
              <span>未分配</span>
            </div>
            {members.map(m => (
              <div
                key={m.id}
                className="assignee-dropdown-item"
                onClick={() => handleAssign(m.id)}
              >
                <div
                  className="member-avatar"
                  style={{ background: m.avatarColor, width: 20, height: 20, fontSize: 10 }}
                >
                  {getInitials(m.name)}
                </div>
                <span>{m.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {task.dueDate && (
        <div className={dueDateClass}>
          📅 {formatDate(task.dueDate)}
        </div>
      )}
    </div>
  );
}

export default TaskCard;
