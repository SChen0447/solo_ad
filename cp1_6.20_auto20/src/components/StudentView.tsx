import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { User } from '../App';
import { useFeedback } from '../hooks/useFeedback';
import type { Homework, Feedback } from '../types';

type View = 'list' | 'detail';

const COLOR_MAP: Record<'A' | 'B', { bg: string; solid: string; border: string; text: string }> = {
  A: { bg: 'rgba(255, 230, 150, 0.5)', solid: '#FFF0B3', border: '#ECC94B', text: '#975A16' },
  B: { bg: 'rgba(255, 192, 203, 0.5)', solid: '#FFD6E0', border: '#ED64A6', text: '#97266D' },
};

export default function StudentView({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [view, setView] = useState<View>('list');
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [currentHomework, setCurrentHomework] = useState<Homework | null>(null);

  const { loading, error, fetchHomeworks, fetchHomeworkDetail } = useFeedback();

  useEffect(() => {
    fetchHomeworks('student', user.id).then(setHomeworks).catch(() => {});
  }, [user.id, fetchHomeworks]);

  const handleOpenDetail = useCallback(async (hw: Homework) => {
    setView('detail');
    const detail = await fetchHomeworkDetail(hw.id);
    setCurrentHomework(detail);
  }, [fetchHomeworkDetail]);

  return (
    <div style={styles.container}>
      <header style={styles.topBar}>
        <div style={styles.topBarInner}>
          <div style={styles.brand}>
            <div style={{ ...styles.brandIcon, backgroundColor: '#48BB78' }} />
            <span style={styles.brandText}>作业反馈中心</span>
          </div>
          <div style={styles.userArea}>
            <div style={{ ...styles.avatar, backgroundColor: '#BEE3F8' }}>{user.name.charAt(0)}</div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>{user.name}</div>
              <div style={styles.userRole}>学生</div>
            </div>
            <button style={styles.logoutBtn} onClick={onLogout}>退出</button>
          </div>
        </div>
      </header>

      {error && (
        <div style={styles.errorBar}>
          <span>{error}</span>
          <button style={styles.errorClose}>×</button>
        </div>
      )}

      <main style={styles.main}>
        {view === 'list' && (
          <HomeworkListView
            homeworks={homeworks}
            loading={loading}
            onOpenDetail={handleOpenDetail}
          />
        )}
        {view === 'detail' && currentHomework && (
          <DetailView
            homework={currentHomework}
            onBack={() => setView('list')}
          />
        )}
      </main>
    </div>
  );
}

function HomeworkListView({
  homeworks,
  loading,
  onOpenDetail,
}: {
  homeworks: Homework[];
  loading: boolean;
  onOpenDetail: (hw: Homework) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'graded' | 'ungraded'>('all');

  const filtered = homeworks.filter((hw) => {
    const graded = hw.feedbacks.length > 0;
    if (filter === 'graded') return graded;
    if (filter === 'ungraded') return !graded;
    return true;
  });

  return (
    <div style={styles.listContainer}>
      <div style={styles.listHeader}>
        <div>
          <h1 style={styles.pageTitle}>我的作业</h1>
          <p style={styles.pageSubtitle}>查看老师给出的批注和反馈</p>
        </div>
        <div style={styles.filterTabs}>
          {(['all', 'graded', 'ungraded'] as const).map((f) => (
            <button
              key={f}
              style={{
                ...styles.filterTab,
                ...(filter === f ? styles.filterTabActive : {}),
              }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '全部' : f === 'graded' ? '已批改' : '待批改'}
              <span style={styles.filterCount}>
                {homeworks.filter((hw) => {
                  const g = hw.feedbacks.length > 0;
                  if (f === 'all') return true;
                  if (f === 'graded') return g;
                  return !g;
                }).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading && filtered.length === 0 && (
        <div style={styles.centerLoader}><div className="loader loader-lg" /></div>
      )}

      {filtered.length === 0 && !loading ? (
        <div style={styles.emptyBig}>暂无作业记录</div>
      ) : (
        <div style={styles.cardGrid}>
          {filtered.map((hw, i) => {
            const graded = hw.feedbacks.length > 0;
            const uniqueTeachers = new Set(hw.feedbacks.map((f) => f.teacherId)).size;
            return (
              <button
                key={hw.id}
                className="fade-in-up"
                style={{ ...styles.hwCard, animationDelay: `${i * 60}ms` }}
                onClick={() => onOpenDetail(hw)}
              >
                <div style={styles.hwCardTop}>
                  <div style={styles.hwIconWrap}>
                    <div style={{ ...styles.hwIcon, backgroundColor: graded ? '#C6F6D5' : '#FEEBC8' }} />
                  </div>
                  <div style={{ ...styles.hwStatus, backgroundColor: graded ? '#C6F6D5' : '#FEEBC8' }}>
                    {graded ? '已批改' : '待批改'}
                  </div>
                </div>
                <h3 style={styles.hwTitle}>{hw.title}</h3>
                <div style={styles.hwMeta}>
                  <span>📅 提交：{hw.submittedAt}</span>
                </div>
                {graded && (
                  <div style={styles.hwFooter}>
                    <div style={styles.teacherAvatars}>
                      {Array.from(new Set(hw.feedbacks.map((f) => ({ id: f.teacherId, name: f.teacherName, color: f.teacherColor })))).map((t) => {
                        const cs = COLOR_MAP[t.color];
                        return (
                          <div
                            key={t.id}
                            style={{
                              ...styles.miniAvatar,
                              backgroundColor: cs.solid,
                              borderColor: cs.border,
                              color: cs.text,
                            }}
                            title={t.name}
                          >
                            {t.name.charAt(0)}
                          </div>
                        );
                      })}
                    </div>
                    <span style={styles.fbCount}>
                      {hw.feedbacks.length}条批注 · {uniqueTeachers}位教师
                    </span>
                  </div>
                )}
                {!graded && (
                  <div style={styles.hwFooter}>
                    <span style={styles.ungradedHint}>等待老师批改中...</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailView({ homework, onBack }: { homework: Homework; onBack: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const bubbleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedFb, setSelectedFb] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { top: number; left: number }>>({});

  const sortedFeedbacks = useMemo(
    () => [...homework.feedbacks].sort((a, b) => a.startIndex - b.startIndex),
    [homework.feedbacks]
  );

  const teacherGroups = useMemo(() => {
    const groups = new Map<string, Feedback[]>();
    sortedFeedbacks.forEach((f) => {
      if (!groups.has(f.teacherId)) groups.set(f.teacherId, []);
      groups.get(f.teacherId)!.push(f);
    });
    return groups;
  }, [sortedFeedbacks]);

  const filteredFeedbacks = useMemo(() => {
    if (activeFilter === 'all') return sortedFeedbacks;
    return sortedFeedbacks.filter((f) => f.teacherId === activeFilter);
  }, [sortedFeedbacks, activeFilter]);

  useEffect(() => {
    const computePositions = () => {
      if (!contentRef.current) return;
      const newPositions: Record<string, { top: number; left: number }> = {};
      const containerRect = contentRef.current.getBoundingClientRect();
      filteredFeedbacks.forEach((fb) => {
        const el = contentRef.current?.querySelector(`[data-fb-id="${fb.id}"]`) as HTMLElement | null;
        if (el) {
          const r = el.getBoundingClientRect();
          newPositions[fb.id] = {
            top: r.top - containerRect.top,
            left: r.right - containerRect.left,
          };
        }
      });
      setPositions(newPositions);
    };
    computePositions();
    window.addEventListener('resize', computePositions);
    const t = setTimeout(computePositions, 100);
    return () => {
      window.removeEventListener('resize', computePositions);
      clearTimeout(t);
    };
  }, [filteredFeedbacks, homework.id]);

  const renderHighlightedContent = () => {
    const text = homework.content;
    if (filteredFeedbacks.length === 0) {
      return <p style={styles.contentParagraph}>{text}</p>;
    }
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    filteredFeedbacks.forEach((fb, idx) => {
      if (cursor < fb.startIndex) {
        parts.push(<span key={`t${idx}`}>{text.slice(cursor, fb.startIndex)}</span>);
      }
      const cs = COLOR_MAP[fb.teacherColor];
      const isSelected = selectedFb === fb.id;
      parts.push(
        <mark
          key={fb.id}
          data-fb-id={fb.id}
          ref={(el) => {
            if (el) bubbleRefs.current.set(fb.id, el as HTMLDivElement);
          }}
          onClick={() => setSelectedFb(isSelected ? null : fb.id)}
          style={{
            backgroundColor: isSelected ? cs.solid : cs.bg,
            borderBottom: `2px solid ${cs.border}`,
            borderRadius: 3,
            padding: '1px 3px',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
            boxShadow: isSelected ? `0 0 0 2px ${cs.border}` : 'none',
          }}
        >
          {text.slice(fb.startIndex, fb.endIndex)}
        </mark>
      );
      cursor = fb.endIndex;
    });
    if (cursor < text.length) {
      parts.push(<span key="tend">{text.slice(cursor)}</span>);
    }
    return <p style={styles.contentParagraph}>{parts}</p>;
  };

  const uniqueTeachers = Array.from(
    new Map(
      homework.feedbacks.map((f) => [
        f.teacherId,
        { id: f.teacherId, name: f.teacherName, color: f.teacherColor },
      ])
    ).values()
  );

  return (
    <div>
      <div style={styles.detailHeader}>
        <button style={styles.backBtn} onClick={onBack}>← 返回列表</button>
        <div style={styles.detailTitleWrap}>
          <h1 style={styles.detailTitle}>{homework.title}</h1>
          <p style={styles.detailMeta}>提交时间：{homework.submittedAt}</p>
        </div>
      </div>

      {uniqueTeachers.length > 0 && (
        <div style={styles.filterRow}>
          <span style={styles.filterLabel}>按教师筛选：</span>
          <div style={styles.chipsWrap}>
            <button
              style={{
                ...styles.chip,
                ...(activeFilter === 'all' ? styles.chipActive : {}),
              }}
              onClick={() => setActiveFilter('all')}
            >
              全部（{homework.feedbacks.length}）
            </button>
            {uniqueTeachers.map((t) => {
              const count = teacherGroups.get(t.id)?.length ?? 0;
              const cs = COLOR_MAP[t.color];
              return (
                <button
                  key={t.id}
                  style={{
                    ...styles.chip,
                    ...(activeFilter === t.id ? { ...styles.chipActive, backgroundColor: cs.solid, borderColor: cs.border, color: cs.text } : {}),
                  }}
                  onClick={() => setActiveFilter(t.id)}
                >
                  <span style={{ ...styles.chipDot, backgroundColor: cs.solid, borderColor: cs.border }}>
                    {t.name.charAt(0)}
                  </span>
                  {t.name}（{count}）
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="student-detail-container" style={styles.detailContainer}>
        <div style={styles.contentWrapper}>
          <div style={styles.contentHeader}>
            <h4 style={styles.panelSubtitle}>📄 作业原文</h4>
            <span style={styles.hint}>点击高亮文字查看批注</span>
          </div>
          <div
            ref={contentRef}
            style={styles.contentArea}
            className="student-content"
          >
            {renderHighlightedContent()}
          </div>

          {filteredFeedbacks.map((fb) => {
            const pos = positions[fb.id];
            if (!pos) return null;
            const cs = COLOR_MAP[fb.teacherColor];
            const isActive = selectedFb === fb.id;
            return (
              <div
                key={`bubble-${fb.id}`}
                ref={(el) => {
                  if (el) bubbleRefs.current.set('bubble-' + fb.id, el);
                }}
                onClick={() => setSelectedFb(isActive ? null : fb.id)}
                style={{
                  ...styles.sidebarBubble,
                  backgroundColor: cs.solid,
                  borderColor: cs.border,
                  top: pos.top,
                  left: `calc(100% + 12px)`,
                  opacity: isActive ? 1 : 0.9,
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  zIndex: isActive ? 10 : 1,
                }}
              >
                <div
                  style={{
                    ...styles.bubbleArrow,
                    borderColor: `transparent ${cs.border} transparent transparent`,
                    left: '-9px',
                  }}
                />
                <div style={styles.bubbleHeader}>
                  <div style={{ ...styles.bubbleAvatar, backgroundColor: cs.solid, borderColor: cs.border, color: cs.text }}>
                    {fb.teacherName.charAt(0)}
                  </div>
                  <div style={styles.bubbleTeacher}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{fb.teacherName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {new Date(fb.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>
                {isActive && (
                  <div style={styles.bubbleBody}>
                    <div style={{ ...styles.bubbleQuote, color: cs.text }}>"{fb.selectedText}"</div>
                    <div style={styles.bubbleComment}>{fb.comment}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={styles.sidebarPanel}>
          <div style={styles.sidebarHeader}>
            <h4 style={styles.panelSubtitle}>💬 全部批注</h4>
          </div>
          {uniqueTeachers.length === 0 ? (
            <div style={styles.emptyFbBig}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🕐</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                这份作业还没有批注，老师正在批改中...
              </p>
            </div>
          ) : (
            <div style={styles.groupedList}>
              {Array.from(teacherGroups.entries()).map(([teacherId, fbs]) => {
                const teacher = fbs[0];
                const cs = COLOR_MAP[teacher.teacherColor];
                const groupVisible = activeFilter === 'all' || activeFilter === teacherId;
                return (
                  <div
                    key={teacherId}
                    style={{
                      ...styles.teacherGroup,
                      display: groupVisible ? 'block' : 'none',
                    }}
                  >
                    <div style={{ ...styles.groupHeader, backgroundColor: cs.solid, borderColor: cs.border }}>
                      <div style={{ ...styles.groupAvatar, backgroundColor: cs.solid, color: cs.text }}>
                        {teacher.teacherName.charAt(0)}
                      </div>
                      <div style={styles.groupMeta}>
                        <div style={{ ...styles.groupName, color: cs.text }}>
                          {teacher.teacherName} 的批注
                        </div>
                        <div style={{ fontSize: 11, color: cs.text, opacity: 0.75 }}>
                          共 {fbs.length} 条
                        </div>
                      </div>
                    </div>
                    <div style={styles.groupItems}>
                      {fbs.map((fb) => (
                        <div
                          key={fb.id}
                          style={{
                            ...styles.groupItem,
                            borderLeft: `3px solid ${cs.border}`,
                            backgroundColor: selectedFb === fb.id ? cs.solid : 'transparent',
                          }}
                          onClick={() => setSelectedFb(selectedFb === fb.id ? null : fb.id)}
                        >
                          <div style={styles.itemQuote}>"{fb.selectedText}"</div>
                          <div style={styles.itemComment}>{fb.comment}</div>
                          <div style={styles.itemTime}>
                            {new Date(fb.createdAt).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
  },
  topBar: {
    backgroundColor: '#fff',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  topBarInner: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '32px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  brandIcon: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius)',
  },
  brandText: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#2F855A',
  },
  userArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '15px',
    color: '#2B6CB0',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  userRole: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.2,
  },
  logoutBtn: {
    padding: '6px 14px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    transition: 'all 0.15s ease',
  },
  errorBar: {
    maxWidth: '1400px',
    margin: '12px auto 0',
    padding: '10px 16px',
    backgroundColor: '#FFF5F5',
    border: '1px solid #FED7D7',
    borderRadius: 'var(--radius)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#C53030',
    fontSize: '14px',
  },
  errorClose: {
    fontSize: '20px',
    lineHeight: 1,
    color: '#C53030',
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '28px 24px',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  filterTabs: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '4px',
    border: '1px solid var(--border)',
  },
  filterTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    borderRadius: '6px',
    transition: 'all 0.15s ease',
  },
  filterTabActive: {
    backgroundColor: '#2F855A',
    color: '#fff',
  },
  filterCount: {
    fontSize: '11px',
    padding: '2px 7px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'inherit',
  },
  centerLoader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
  },
  emptyBig: {
    padding: '80px 24px',
    textAlign: 'center',
    backgroundColor: '#fff',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: '15px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  hwCard: {
    backgroundColor: '#fff',
    borderRadius: 'var(--radius)',
    padding: '20px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    transition: 'all 0.2s ease',
  },
  hwCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hwIconWrap: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hwIcon: {
    width: '22px',
    height: '26px',
    borderRadius: '3px',
    position: 'relative',
  },
  hwStatus: {
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  hwTitle: {
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.35,
  },
  hwMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  hwFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '10px',
    borderTop: '1px dashed var(--border)',
  },
  teacherAvatars: {
    display: 'flex',
  },
  miniAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '12px',
    border: '2px solid #fff',
    marginLeft: '-8px',
    position: 'relative',
  },
  fbCount: {
    fontSize: '12px',
    color: '#2F855A',
    fontWeight: 500,
  },
  ungradedHint: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  backBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    color: 'var(--accent)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    backgroundColor: '#fff',
    fontWeight: 500,
    transition: 'all 0.15s ease',
  },
  detailTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  detailTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  detailMeta: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    padding: '14px 18px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  chipsWrap: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    fontSize: '13px',
    borderRadius: '20px',
    border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    transition: 'all 0.15s ease',
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: 'rgba(47, 133, 90, 0.08)',
    borderColor: '#2F855A',
    color: '#2F855A',
  },
  chipDot: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '11px',
    border: '1.5px solid',
  },
  detailContainer: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 340px',
    gap: '20px',
    position: 'relative',
  },
  contentWrapper: {
    position: 'relative',
    minHeight: '600px',
  },
  contentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    backgroundColor: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    marginBottom: '12px',
  },
  panelSubtitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  hint: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  contentArea: {
    backgroundColor: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '40px 48px',
    minHeight: '600px',
    marginRight: '200px',
    position: 'relative',
    overflow: 'hidden',
  },
  contentParagraph: {
    fontSize: '15px',
    lineHeight: 2,
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  sidebarBubble: {
    position: 'absolute',
    width: '190px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1.5px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: 'var(--shadow-sm)',
  },
  bubbleArrow: {
    position: 'absolute',
    top: '14px',
    width: 0,
    height: 0,
    borderTop: '8px solid transparent',
    borderBottom: '8px solid transparent',
    borderRight: '8px solid',
  },
  bubbleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  bubbleAvatar: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '11px',
    flexShrink: 0,
  },
  bubbleTeacher: {
    flex: 1,
    minWidth: 0,
  },
  bubbleBody: {
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px dashed rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  bubbleQuote: {
    fontSize: '12px',
    fontStyle: 'italic',
    padding: '6px 8px',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: '4px',
    lineHeight: 1.4,
  },
  bubbleComment: {
    fontSize: '14px',
    lineHeight: 1.55,
    color: 'var(--text-primary)',
  },
  sidebarPanel: {
    backgroundColor: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 200px)',
    position: 'sticky',
    top: '80px',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
  },
  emptyFbBig: {
    padding: '48px 24px',
    textAlign: 'center',
  },
  groupedList: {
    overflow: 'auto',
    flex: 1,
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  teacherGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid',
  },
  groupAvatar: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '13px',
    flexShrink: 0,
  },
  groupMeta: {
    flex: 1,
  },
  groupName: {
    fontSize: '13px',
    fontWeight: 600,
  },
  groupItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  groupItem: {
    padding: '10px 12px',
    borderRadius: '6px',
    backgroundColor: 'var(--border-light)',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  itemQuote: {
    fontSize: '12px',
    fontStyle: 'italic',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    lineHeight: 1.4,
  },
  itemComment: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
  },
  itemTime: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginTop: '6px',
  },
};
