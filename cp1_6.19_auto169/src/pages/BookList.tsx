import { Book, Circle, User } from '../api';

interface BookListProps {
  books: Book[];
  onBookClick: (id: string) => void;
}

export function BookListPage({ books, onBookClick }: BookListProps) {
  const statusBadge = (s: Book['status']) => {
    switch (s) {
      case 'available':
        return <span className="book-card-badge badge-available">可交换</span>;
      case 'borrowed':
        return <span className="book-card-badge badge-borrowed">已借出</span>;
      case 'offline':
        return <span className="book-card-badge badge-offline">已下架</span>;
    }
  };

  return (
    <div className="content-area">
      <div className="page-header">
        <div>
          <div className="page-title">📚 书籍广场</div>
          <div className="page-subtitle">共 {books.length} 本闲置书籍等你来看</div>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="book-grid">
          <div className="empty-state">
            <div className="empty-state-icon">📖</div>
            <div className="empty-state-text">暂无符合条件的书籍，换个关键词试试？</div>
          </div>
        </div>
      ) : (
        <div className="book-grid cross-fade" key={books.map((b) => b.id).join(',')}>
          {books.map((b) => (
            <div
              key={b.id}
              className="book-card"
              onClick={() => onBookClick(b.id)}
            >
              <div className="book-card-cover">
                <img
                  src={b.coverUrl}
                  alt={b.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop';
                  }}
                />
                {statusBadge(b.status)}
              </div>
              <div className="book-card-body">
                <div className="book-card-title" title={b.title}>
                  {b.title}
                </div>
                <div className="book-card-author">{b.author}</div>
                {b.tags.length > 0 && (
                  <div className="tag-list" style={{ marginTop: 8, gap: 6 }}>
                    {b.tags.slice(0, 3).map((t) => (
                      <span key={t} className="tag-pill" style={{ padding: '3px 10px', fontSize: 11 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="book-card-footer">
                  <span className="book-card-category">{b.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CircleListProps {
  circles: Circle[];
  users: User[];
  books: Book[];
  onCircleClick: (id: string) => void;
  onJoinCircle: (circleId: string) => void;
  currentUserId: string;
}

export function CircleListPage({ circles, users, books, onCircleClick, onJoinCircle, currentUserId }: CircleListProps) {
  const getCircleBook = (c: Circle) =>
    books.find((b) => b.id === (c.currentBookId || c.bookIds[0]));

  const getOwner = (c: Circle) => users.find((u) => u.id === c.ownerId);

  return (
    <div className="content-area">
      <div className="page-header">
        <div>
          <div className="page-title">🤝 阅读圈</div>
          <div className="page-subtitle">共 {circles.length} 个活跃阅读圈</div>
        </div>
      </div>

      {circles.length === 0 ? (
        <div className="circle-grid">
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-text">还没有阅读圈，快来创建第一个吧！</div>
          </div>
        </div>
      ) : (
        <div className="circle-grid">
          {circles.map((c) => {
            const b = getCircleBook(c);
            const owner = getOwner(c);
            const isMember = c.members.includes(currentUserId);
            const isPending = c.pendingMembers.includes(currentUserId);
            const isFull = c.members.length >= c.maxMembers;
            return (
              <div key={c.id} className="circle-card" onClick={() => onCircleClick(c.id)}>
                <div className="circle-card-name">{c.name}</div>
                <div className="circle-card-desc">{c.description}</div>
                {b && (
                  <div style={{
                    display: 'flex',
                    gap: 10,
                    padding: '12px',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 14
                  }}>
                    <img
                      src={b.coverUrl}
                      alt={b.title}
                      style={{
                        width: 50,
                        height: 70,
                        borderRadius: 6,
                        objectFit: 'cover',
                        flexShrink: 0
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=140&fit=crop';
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>当前共读</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{b.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.author}</div>
                    </div>
                  </div>
                )}
                {c.tags.length > 0 && (
                  <div className="tag-list" style={{ marginBottom: 14, gap: 6 }}>
                    {c.tags.slice(0, 3).map((t) => (
                      <span key={t} className="tag-pill" style={{ padding: '3px 10px', fontSize: 11 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="circle-card-footer">
                  <div className="circle-card-members">
                    <span style={{ display: 'flex', gap: -6 }}>
                      {c.members.slice(0, 3).map((m) => {
                        const mu = users.find((u) => u.id === m);
                        return (
                          <img
                            key={m}
                            src={mu?.avatar}
                            alt=""
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              border: '2px solid var(--bg-card)',
                              marginLeft: c.members.indexOf(m) > 0 ? -8 : 0
                            }}
                          />
                        );
                      })}
                    </span>
                    <span>
                      <span className="member-count">{c.members.length}</span>
                      <span> / {c.maxMembers}</span>
                    </span>
                  </div>
                  {!isMember ? (
                    <button
                      className={'btn btn-sm ' + (isPending ? 'btn-secondary' : 'btn-primary')}
                      disabled={isPending || isFull}
                      onClick={(e) => {
                        e.stopPropagation();
                        onJoinCircle(c.id);
                      }}
                    >
                      {isPending ? '等待审核' : isFull ? '已满员' : '申请加入'}
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--accent-hover)', fontWeight: 600 }}>
                      ✓ 已加入
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
