import { useCanvasStore } from './store';

export function MembersBar() {
  const { users, currentUser, saveCanvas, isConnected } = useCanvasStore();

  const handleSave = async () => {
    const ok = await saveCanvas();
    if (ok) {
      alert('保存成功！');
    } else {
      alert('保存失败');
    }
  };

  return (
    <div className="members-bar">
      <div className="members-list">
        {users.map((user) => (
          <div
            key={user.id}
            className="member-item"
            title={user.nickname + (user.id === currentUser?.id ? ' (我)' : '')}
          >
            <div
              className="member-avatar"
              style={{
                background: user.color,
                borderColor: user.id === currentUser?.id ? '#007bff' : 'transparent',
              }}
            >
              <span className="avatar-text">
                {user.nickname.slice(0, 1)}
              </span>
            </div>
            <div className="member-name">{user.nickname}</div>
          </div>
        ))}
      </div>
      <div className="members-right">
        <span className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        <span className="connection-text">
          {isConnected ? '已连接' : '连接中...'}
        </span>
        <button className="save-btn" onClick={handleSave}>
          保存
        </button>
      </div>
    </div>
  );
}
