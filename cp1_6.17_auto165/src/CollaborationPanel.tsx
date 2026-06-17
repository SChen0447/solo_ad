import { useState, useCallback } from 'react';
import { Users, History, Clock, User, GripHorizontal } from 'lucide-react';
import { useAppStore } from './store';
import { User as UserType, Version } from './types';

interface CollaborationPanelProps {
  users: UserType[];
  currentUser: UserType;
  versions: Version[];
  onRollback: (versionId: string) => void;
  isMobile: boolean;
}

export default function CollaborationPanel({
  users,
  currentUser,
  versions,
  onRollback,
  isMobile,
}: CollaborationPanelProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'history'>('members');
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [drawerHeight, setDrawerHeight] = useState(200);
  const [isDragging, setIsDragging] = useState(false);

  const { cursors } = useAppStore();

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const handleRollback = useCallback((versionId: string) => {
    setRollingBackId(versionId);
    setTimeout(() => {
      onRollback(versionId);
      setTimeout(() => {
        setRollingBackId(null);
      }, 300);
    }, 300);
  }, [onRollback]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (isMobile) {
      setIsDragging(true);
      e.preventDefault();
    }
  };

  const handleDragMove = (e: MouseEvent) => {
    if (isDragging && isMobile) {
      const newHeight = window.innerHeight - e.clientY;
      setDrawerHeight(Math.max(100, Math.min(400, newHeight)));
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useState(() => {
    if (isMobile) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, isMobile]);

  const allUsers = [currentUser, ...users];

  const panelStyle = isMobile
    ? { height: `${drawerHeight}px`, maxHeight: '40vh' }
    : { width: '320px' };

  return (
    <div
      className={`flex flex-col bg-[var(--bg-secondary)] border-l border-[var(--border-color)] ${
        isMobile ? 'border-t fixed bottom-0 left-0 right-0 z-50' : ''
      }`}
      style={panelStyle}
    >
      {isMobile && (
        <div
          className="flex items-center justify-center py-2 cursor-row-resize border-b border-[var(--border-color)]"
          onMouseDown={handleDragStart}
        >
          <GripHorizontal className="w-6 h-6 text-[var(--border-color)]" />
        </div>
      )}

      <div className="flex border-b border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-none ${
            activeTab === 'members'
              ? 'bg-[var(--accent-primary)] text-white'
              : 'hover:bg-[var(--bg-primary)]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>成员</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-none ${
            activeTab === 'history'
              ? 'bg-[var(--accent-primary)] text-white'
              : 'hover:bg-[var(--bg-primary)]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>历史</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'members' && (
          <div className="p-4 space-y-3">
            {allUsers.map((user) => {
              const cursor = cursors.find((c) => c.userId === user.id);
              const isCurrentUser = user.id === currentUser.id;
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-primary)] transition-colors"
                >
                  <div
                    className="relative"
                    style={{ width: '32px', height: '32px' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{
                        backgroundColor: user.color,
                        border: `2px solid ${user.color}`,
                      }}
                    >
                      {user.name.charAt(0)}
                    </div>
                    {isCurrentUser && (
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-[var(--accent-success)] rounded-full border-2 border-[var(--bg-secondary)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {user.name}
                      {isCurrentUser && (
                        <span className="text-[var(--text-secondary)] text-xs ml-2">(你)</span>
                      )}
                    </div>
                    {cursor && !isCurrentUser && (
                      <div className="text-xs text-[var(--text-secondary)]">
                        位置: ({Math.round(cursor.x)}, {Math.round(cursor.y)})
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-4 space-y-2">
            {versions.length === 0 ? (
              <div className="text-center text-[var(--text-secondary)] py-8">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无历史版本</p>
              </div>
            ) : (
              versions.map((version) => (
                <div
                  key={version.id}
                  onClick={() => handleRollback(version.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                    rollingBackId === version.id
                      ? 'slide-left-animation border-2 border-[var(--accent-primary)]'
                      : 'border border-transparent hover:bg-[var(--bg-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: version.userId === currentUser.id ? currentUser.color : '#7F8C8D' }}
                    />
                    <span className="font-medium text-sm">{version.userName}</span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mb-1">
                    {formatTime(version.timestamp)}
                  </div>
                  <div className="text-xs truncate">
                    {version.description || '更新乐谱'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
