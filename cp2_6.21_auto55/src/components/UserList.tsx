import type { User } from '../types';
import '../styles/userlist.css';

interface UserListProps {
  users: User[];
  currentUserId: string;
}

function UserList({ users, currentUserId }: UserListProps) {
  return (
    <div className="user-list">
      {users.map((user, index) => (
        <div
          key={user.id}
          className="user-item"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div
            className="user-avatar"
            style={{ backgroundColor: user.avatarColor }}
          >
            {user.nickname.charAt(0).toUpperCase()}
          </div>
          <span className="user-name">
            {user.nickname}
            {user.id === currentUserId && ' (我)'}
          </span>
          {user.isCreator && (
            <span className="crown-icon" title="房间创建者">
              👑
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default UserList;
