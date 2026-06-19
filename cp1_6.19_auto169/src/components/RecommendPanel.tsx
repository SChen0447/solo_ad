import { useState, useEffect } from 'react';
import { Book, User, api } from '../api';

interface Props {
  currentUserId: string;
  onBookClick: (bookId: string) => void;
  userTags: string[];
}

export default function RecommendPanel({ currentUserId, onBookClick, userTags }: Props) {
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.recommendations.get(currentUserId);
        if (!alive) return;
        setBooks(data.books);
        setUsers(data.users);
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [currentUserId]);

  const matchedTagSet = new Set(userTags);

  if (loading) {
    return (
      <div className="recommend-panel">
        <div className="section-title">✨ 为你推荐</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="recommend-panel">
      <div className="section-title">✨ 为你推荐</div>

      <div className="recommend-section">
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          marginBottom: '12px'
        }}>
          📚 相似书籍
        </div>
        {books.length === 0 ? (
          <div style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            padding: '10px 0'
          }}>
            暂无推荐，发布更多书籍或加入圈子吧
          </div>
        ) : (
          books.map((b) => (
            <div
              key={b.id}
              className="recommend-book-item"
              onClick={() => onBookClick(b.id)}
            >
              <img
                src={b.coverUrl}
                alt={b.title}
                className="recommend-book-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=120&h=160&fit=crop';
                }}
              />
              <div className="recommend-book-info">
                <div className="recommend-book-title">{b.title}</div>
                <div className="recommend-book-author">{b.author}</div>
                <div className="recommend-book-tags">
                  {b.tags.filter((t) => matchedTagSet.has(t)).slice(0, 2).map((t) => (
                    <span key={t} className="matched-tag">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="recommend-section">
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          marginBottom: '12px'
        }}>
          👥 志同道合的圈友
        </div>
        {users.length === 0 ? (
          <div style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            padding: '10px 0'
          }}>
            暂无匹配圈友
          </div>
        ) : (
          <div className="recommend-user-list">
            {users.map((u) => (
              <div key={u.id} className="recommend-user-item" title={`${u.name} · 标签: ${u.tags.join(', ')}`}>
                <div className="avatar-wrapper">
                  <img
                    className={'avatar' + (u.online ? ' online' : '')}
                    src={u.avatar}
                    alt={u.name}
                  />
                </div>
                <span className="recommend-user-name">{u.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
