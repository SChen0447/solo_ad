import './UserList.css';

interface User {
  id: string;
  nickname: string;
  avatar: string;
  color: string;
}

interface UserListProps {
  users: User[];
  currentUserId: string;
}

const UserList = ({ users, currentUserId }: UserListProps) => {
  const displayUsers = users.length > 0 ? users : [
    { id: currentUserId, nickname: '我', avatar: '#1a73e8', color: '#1a73e8' },
  ];

  return (
    <div className="user-list">
      <div className="user-list-header">
        <span className="user-list-title">在线用户</span>
        <span className="user-count">{displayUsers.length}</span>
      </div>
      <div className="user-list-content">
        {displayUsers.map((user) => (
          <div
            key={user.id}
            className={`user-item ${user.id === currentUserId ? 'current' : ''}`}
          >
            <div
              className="user-avatar"
              style={{ backgroundColor: user.color || user.avatar }}
            >
              {user.nickname.charAt(0)}
            </div>
            <div className="user-details">
              <span className="user-nickname">
                {user.nickname}
                {user.id === currentUserId && ' (我)'}
              </span>
              <span className="user-status">
                <span className="status-dot" />
                在线
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserList;
