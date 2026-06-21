import React, { useEffect, useState } from 'react';

interface BorrowedBook {
  bookId: string;
  borrowDate: string;
  dueDate: string;
  title: string;
  coverUrl: string;
  author: string;
}

interface NoteItem {
  id: string;
  bookId: string;
  rating: number;
  content: string;
  date: string;
  bookTitle: string;
  bookCover: string;
}

interface UserData {
  id: string;
  name: string;
  avatar: string;
  borrowedBooks: BorrowedBook[];
  notes: NoteItem[];
  badges: string[];
}

interface ProfilePageProps {
  userId: string;
  onBack: () => void;
}

const badgeConfig: Record<string, { label: string; bg: string; icon: string }> = {
  gold_7day: { label: '连续7天', bg: '#F59E0B', icon: '🔥' },
  green_10books: { label: '读完10本', bg: '#10B981', icon: '📚' },
  blue_share: { label: '分享达人', bg: '#3B82F6', icon: '🤝' },
};

const ProfilePage: React.FC<ProfilePageProps> = ({ userId, onBack }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  const getDaysLeft = (dueDate: string): number => {
    const now = new Date();
    const due = new Date(dueDate);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#8B5CF6' }}>加载中...</div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>用户不存在</div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <button
        onClick={onBack}
        style={{
          border: 'none',
          background: 'none',
          color: '#8B5CF6',
          fontSize: 14,
          cursor: 'pointer',
          marginBottom: 16,
          padding: 0,
          fontWeight: 600,
        }}
      >
        ← 返回首页
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <img
          src={user.avatar}
          alt={user.name}
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            border: '3px solid #8B5CF6',
            objectFit: 'cover',
          }}
        />
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#374151' }}>{user.name}</h2>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
            已读 {user.notes.length} 本 · 在借 {user.borrowedBooks.length} 本
          </p>
        </div>
      </div>

      {user.badges && user.badges.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 12 }}>阅读徽章</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {user.badges.map((badge) => {
              const config = badgeConfig[badge] || { label: badge, bg: '#6B7280', icon: '🏅' };
              return (
                <div
                  key={badge}
                  title={config.label}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: config.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    transition: 'transform 0.2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.15)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                  }}
                >
                  {config.icon}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {user.borrowedBooks.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 12 }}>当前借阅</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {user.borrowedBooks.map((b) => {
              const daysLeft = getDaysLeft(b.dueDate);
              const isUrgent = daysLeft <= 3;
              return (
                <div
                  key={b.bookId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    borderRadius: 8,
                    background: '#F3E8FF',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)';
                  }}
                >
                  <img
                    src={b.coverUrl}
                    alt={b.title}
                    style={{ width: 40, height: 52, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{b.author}</div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isUrgent ? '#EF4444' : '#374151',
                      animation: isUrgent ? 'blink 0.5s infinite' : 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    剩{daysLeft}天
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {user.notes.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 12 }}>阅读记录</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {user.notes.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: '#F9FAFB',
                  border: '1px solid #F3F4F6',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    📖 {n.bookTitle}
                  </span>
                  <span style={{ fontSize: 12 }}>
                    {'★'.repeat(n.rating)}
                    <span style={{ color: '#D1D5DB' }}>{'★'.repeat(5 - n.rating)}</span>
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>{n.content}</p>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{n.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
