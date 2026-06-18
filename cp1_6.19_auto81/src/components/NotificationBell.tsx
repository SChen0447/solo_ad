import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useStore } from '@/store';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifications = useStore(state => state.notifications);
  const unreadCount = useStore(state => state.unreadCount);
  const fetchNotifications = useStore(state => state.fetchNotifications);
  const markNotificationRead = useStore(state => state.markNotificationRead);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const latestNotifications = notifications.slice(0, 5);

  return (
    <>
      <style>{`
        @keyframes bell-blink-anim {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .bell-blink { animation: bell-blink-anim 1.5s ease-in-out infinite; }
        .notif-item:hover { background: #ebf4ff !important; }
      `}</style>

      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            position: 'relative',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#555',
          }}
        >
          <Bell size={22} />
          {unreadCount > 0 && (
            <span
              className="bell-blink"
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                background: '#e74c3c',
                color: 'white',
                borderRadius: 10,
                padding: '1px 6px',
                fontSize: 11,
                fontWeight: 'bold',
                minWidth: 18,
                textAlign: 'center',
                lineHeight: '16px',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            width: 340,
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            zIndex: 2000,
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #eee',
              fontWeight: 'bold',
              fontSize: 14,
              color: '#333',
            }}>
              通知
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {latestNotifications.length === 0 && (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#999',
                  fontSize: 14,
                }}>
                  暂无通知
                </div>
              )}
              {latestNotifications.map(n => (
                <div
                  key={n.id}
                  className="notif-item"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '12px 16px',
                    borderBottom: '1px solid #f5f5f5',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    position: 'relative',
                  }}
                >
                  {!n.read && (
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#3498db',
                      flexShrink: 0,
                      marginTop: 6,
                    }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      color: '#333',
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}>
                      {n.content}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: '#999',
                      marginTop: 4,
                    }}>
                      {formatDistanceToNow(new Date(n.createdAt), { locale: zhCN, addSuffix: true })}
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markNotificationRead(n.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3498db',
                        fontSize: 12,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        padding: 0,
                      }}
                    >
                      标为已读
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
