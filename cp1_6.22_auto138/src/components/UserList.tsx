import { User } from '../types';
import { getInitials, lightenColor } from '../utils';

interface UserListProps {
  users: User[];
  currentUserId: string;
  isPopup?: boolean;
}

function UserList({ users, currentUserId, isPopup = false }: UserListProps) {
  const containerClass = isPopup ? '' : 'user-list';

  return (
    <div className={containerClass}>
      {users.map((user, index) => (
        <div 
          key={user.id}
          className={`user-list-item ${isPopup ? '' : 'user-enter'}`}
          style={{ 
            animationDelay: isPopup ? '0ms' : `${index * 50}ms`,
            animationFillMode: 'both'
          }}
        >
          <div 
            className="user-list-avatar"
            style={{ 
              backgroundColor: lightenColor(user.avatarColor, 0.3),
              border: `2px solid ${user.avatarColor}`
            }}
            title={user.name}
          >
            {getInitials(user.name)}
          </div>
          <div className="user-list-name" title={user.name}>
            {user.name}
            {user.id === currentUserId && (
              <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '4px' }}>
                (我)
              </span>
            )}
          </div>
        </div>
      ))}
      
      {users.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#64748b',
          fontSize: '13px'
        }}>
          暂无在线用户
        </div>
      )}
    </div>
  );
}

export default UserList;
