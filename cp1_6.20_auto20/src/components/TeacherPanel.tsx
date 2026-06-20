import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { User } from '../App';
import { useFeedback } from '../hooks/useFeedback';
import type { Homework, Feedback, Stats } from '../types';

type Panel = 'dashboard' | 'list' | 'grading';

interface Selection {
  startIndex: number;
  endIndex: number;
  selectedText: string;
  top: number;
  left: number;
}

const COLOR_MAP: Record<'A' | 'B', { bg: string; solid: string; border: string }> = {
  A: { bg: 'rgba(255, 230, 150, 0.5)', solid: '#FFF0B3', border: '#ECC94B' },
  B: { bg: 'rgba(255, 192, 203, 0.5)', solid: '#FFD6E0', border: '#ED64A6' },
};

export default function TeacherPanel({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [panel, setPanel] = useState<Panel>('dashboard');
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [currentHomework, setCurrentHomework] = useState<Homework | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoaded, setStatsLoaded] = useState(false);

  const { loading, error, fetchHomeworks, fetchStats, fetchHomeworkDetail } = useFeedback();

  useEffect(() => {
    fetchHomeworks('teacher', user.id).then(setHomeworks).catch(() => {});
    fetchStats(user.id).then((s) => {
      setStats(s);
      setStatsLoaded(true);
    }).catch(() => {});
  }, [user.id, fetchHomeworks, fetchStats]);

  const handleOpenGrading = useCallback(async (hw: Homework) => {
    setPanel('grading');
    const detail = await fetchHomeworkDetail(hw.id);
    setCurrentHomework(detail);
  }, [fetchHomeworkDetail]);

  const handleFeedbackChange = useCallback((updated: Homework) => {
    setCurrentHomework(updated);
    setHomeworks((prev) => prev.map((h) => (h.id === updated.id ? { ...h, feedbacks: updated.feedbacks } : h)));
    if (stats) {
      const myFeedbacks = updated.feedbacks.filter((f) => f.teacherId === user.id);
      const allOtherGraded = homeworks.filter(
        (h) => h.id !== updated.id && h.feedbacks.some((f) => f.teacherId === user.id)
      ).length;
      const isCurrentGraded = myFeedbacks.length > 0;
      const totalGraded = allOtherGraded + (isCurrentGraded ? 1 : 0);
      const totalComments = myFeedbacks.reduce((s, f) => s + f.comment.length, 0) +
        homeworks
          .filter((h) => h.id !== updated.id)
          .flatMap((h) => h.feedbacks.filter((f) => f.teacherId === user.id))
          .reduce((s, f) => s + f.comment.length, 0);
      const totalMyFeedbacks = myFeedbacks.length +
        homeworks
          .filter((h) => h.id !== updated.id)
          .flatMap((h) => h.feedbacks.filter((f) => f.teacherId === user.id)).length;
      setStats({
        totalHomework: stats.totalHomework,
        gradedHomework: totalGraded,
        avgCommentLength: totalMyFeedbacks > 0 ? Math.round(totalComments / totalMyFeedbacks) : 0,
      });
    }
  }, [stats, homeworks, user.id]);

  const colorStyle = COLOR_MAP[user.color];

  return (
    <div style={styles.container}>
      <TopBar user={user} onLogout={onLogout} panel={panel} setPanel={setPanel} colorStyle={colorStyle} />

      {error && (
        <div style={styles.errorBar}>
          <span>{error}</span>
          <button style={styles.errorClose}>×</button>
        </div>
      )}

      <main style={styles.main}>
        {loading && panel === 'dashboard' && (
          <div style={styles.centerLoader}><div className="loader loader-lg" /></div>
        )}

        {panel === 'dashboard' && statsLoaded && stats && (
          <Dashboard stats={stats} homeworks={homeworks} userId={user.id} onOpenGrading={handleOpenGrading} />
        )}

        {panel === 'list' && (
          <HomeworkList
            homeworks={homeworks}
            userId={user.id}
            loading={loading}
            onOpenGrading={handleOpenGrading}
          />
        )}

        {panel === 'grading' && currentHomework && (
          <GradingView
            homework={currentHomework}
            user={user}
            onBack={() => setPanel('list')}
            onFeedbackChange={handleFeedbackChange}
          />
        )}
      </main>
    </div>
  );
}

function TopBar({
  user,
  onLogout,
  panel,
  setPanel,
  colorStyle,
}: {
  user: User;
  onLogout: () => void;
  panel: Panel;
  setPanel: (p: Panel) => void;
  colorStyle: { bg: string; solid: string; border: string };
}) {
  return (
    <header style={styles.topBar}>
      <div style={styles.topBarInner}>
        <div style={styles.brand}>
          <div style={{ ...styles.brandIcon, backgroundColor: 'var(--accent)' }} />
          <span style={styles.brandText}>批注工作台</span>
        </div>

        <nav style={styles.navTabs}>
          <button
            style={{
              ...styles.navTab,
              ...(panel === 'dashboard' ? styles.navTabActive : {}),
            }}
            onClick={() => setPanel('dashboard')}
          >
            <div style={{ ...styles.navIcon, ...styles.dashboardIcon }} />
            概览
          </button>
          <button
            style={{
              ...styles.navTab,
              ...(panel === 'list' ? styles.navTabActive : {}),
            }}
            onClick={() => setPanel('list')}
          >
            <div style={{ ...styles.navIcon, ...styles.listIcon }} />
            待批改
          </button>
        </nav>

        <div style={styles.userArea}>
          <div style={{ ...styles.avatar, backgroundColor: colorStyle.solid, borderColor: colorStyle.border }}>
            {user.name.charAt(0)}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user.name}</div>
            <div style={styles.userRole}>教师 · {user.color === 'A' ? '批注组A' : '批注组B'}</div>
          </div>
          <button style={styles.logoutBtn} onClick={onLogout}>
            退出
          </button>
        </div>
      </div>
    </header>
  );
}

function Dashboard({
  stats,
  homeworks,
  userId,
  onOpenGrading,
}: {
  stats: Stats;
  homeworks: Homework[];
  userId: string;
  onOpenGrading: (hw: Homework) => void;
}) {
  const ungraded = homeworks.filter((h) => !h.feedbacks.some((f) => f.teacherId === userId));
  const recentGraded = homeworks
    .filter((h) => h.feedbacks.some((f) => f.teacherId === userId))
    .slice(0, 3);

  return (
    <div style={styles.dashboard}>
      <section style={styles.dashSection}>
        <h2 style={styles.sectionTitle}>数据概况</h2>
        <div style={styles.statsGrid}>
          <div className="fade-in-up" style={{ ...styles.statCard, animationDelay: '0ms' }}>
            <div style={styles.statIconWrap}>
              <div style={{ ...styles.statIcon, backgroundColor: '#4299E1' }} />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>总作业数</div>
              <div style={styles.statValue}>{stats.totalHomework}</div>
            </div>
          </div>

          <div className="fade-in-up" style={{ ...styles.statCard, animationDelay: '120ms' }}>
            <div style={styles.statIconWrap}>
              <div style={{ ...styles.statIcon, backgroundColor: '#48BB78' }} />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>已批改</div>
              <div style={styles.statValue}>{stats.gradedHomework}</div>
            </div>
          </div>

          <div className="fade-in-up" style={{ ...styles.statCard, animationDelay: '240ms' }}>
            <div style={styles.statIconWrap}>
              <div style={{ ...styles.statIcon, backgroundColor: '#ED8936' }} />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>平均评语长度</div>
              <div style={styles.statValue}>{stats.avgCommentLength} <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>字</span></div>
            </div>
          </div>

          <div className="fade-in-up" style={{ ...styles.statCard, animationDelay: '360ms' }}>
            <div style={styles.statIconWrap}>
              <div style={{ ...styles.statIcon, backgroundColor: '#ED64A6' }} />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>待批改</div>
              <div style={styles.statValue}>{stats.totalHomework - stats.gradedHomework}</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...styles.dashSection, ...styles.twoCol }}>
        <div className="fade-in-up" style={{ ...styles.dashCard, animationDelay: '480ms' }}>
          <h3 style={styles.dashCardTitle}>待批改作业</h3>
          <div style={styles.dashList}>
            {ungraded.length === 0 ? (
              <p style={styles.emptyState}>太棒了！暂无待批改作业 🎉</p>
            ) : (
              ungraded.slice(0, 4).map((hw, i) => (
                <button
                  key={hw.id}
                  style={styles.dashListItem}
                  onClick={() => onOpenGrading(hw)}
                >
                  <div style={styles.dashListBadge}>{hw.studentName.charAt(0)}</div>
                  <div style={styles.dashListContent}>
                    <div style={styles.dashListTitle}>{hw.title}</div>
                    <div style={styles.dashListMeta}>{hw.studentName} · {hw.submittedAt}</div>
                  </div>
                  <div style={{ ...styles.dashListArrow, transitionDelay: `${i * 30}ms` }}>→</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="fade-in-up" style={{ ...styles.dashCard, animationDelay: '600ms' }}>
          <h3 style={styles.dashCardTitle}>最近批改</h3>
          <div style={styles.dashList}>
            {recentGraded.length === 0 ? (
              <p style={styles.emptyState}>还没有批改记录</p>
            ) : (
              recentGraded.map((hw) => {
                const myFeedbacks = hw.feedbacks.filter((f) => f.teacherId === userId);
                return (
                  <div key={hw.id} style={styles.dashListItem}>
                    <div style={{ ...styles.dashListBadge, backgroundColor: '#C6F6D5' }}>{hw.studentName.charAt(0)}</div>
                    <div style={styles.dashListContent}>
                      <div style={styles.dashListTitle}>{hw.title}</div>
                      <div style={styles.dashListMeta}>
                        {hw.studentName} · {myFeedbacks.length}条批注
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function HomeworkList({
  homeworks,
  userId,
  loading,
  onOpenGrading,
}: {
  homeworks: Homework[];
  userId: string;
  loading: boolean;
  onOpenGrading: (hw: Homework) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'graded'>('all');

  const filtered = homeworks.filter((hw) => {
    const hasMyFeedback = hw.feedbacks.some((f) => f.teacherId === userId);
    if (filter === 'pending') return !hasMyFeedback;
    if (filter === 'graded') return hasMyFeedback;
    return true;
  });

  return (
    <div style={styles.listView}>
      <div style={styles.listHeader}>
        <h2 style={styles.sectionTitle}>作业列表</h2>
        <div style={styles.filterTabs}>
          {(['all', 'pending', 'graded'] as const).map((f) => (
            <button
              key={f}
              style={{
                ...styles.filterTab,
                ...(filter === f ? styles.filterTabActive : {}),
              }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '全部' : f === 'pending' ? '待批改' : '已批改'}
              <span style={styles.filterCount}>
                {homeworks.filter((hw) => {
                  const has = hw.feedbacks.some((ff) => ff.teacherId === userId);
                  if (f === 'all') return true;
                  if (f === 'pending') return !has;
                  return has;
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
        <div style={styles.emptyStateBig}>暂无作业</div>
      ) : (
        <div style={styles.cardGrid}>
          {filtered.map((hw, i) => {
            const hasMyFeedback = hw.feedbacks.some((f) => f.teacherId === userId);
            const myCount = hw.feedbacks.filter((f) => f.teacherId === userId).length;
            return (
              <button
                key={hw.id}
                className="fade-in-up"
                style={{ ...styles.hwCard, animationDelay: `${i * 50}ms` }}
                onClick={() => onOpenGrading(hw)}
              >
                <div style={styles.hwCardTop}>
                  <div style={styles.hwAvatar}>{hw.studentName.charAt(0)}</div>
                  <div style={{ ...styles.hwStatus, backgroundColor: hasMyFeedback ? '#C6F6D5' : '#FEEBC8' }}>
                    {hasMyFeedback ? '已批改' : '待批改'}
                  </div>
                </div>
                <h3 style={styles.hwTitle}>{hw.title}</h3>
                <div style={styles.hwMeta}>
                  <span>👤 {hw.studentName}</span>
                  <span>🕒 {hw.submittedAt}</span>
                </div>
                {hasMyFeedback && (
                  <div style={styles.hwTag}>
                    <div style={{ ...styles.hwTagDot, backgroundColor: '#48BB78' }} />
                    {myCount} 条批注
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

function GradingView({
  homework,
  user,
  onBack,
  onFeedbackChange,
}: {
  homework: Homework;
  user: User;
  onBack: () => void;
  onFeedbackChange: (updated: Homework) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(55);
  const [isDragging, setIsDragging] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [inputComment, setInputComment] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { createFeedback, updateFeedback, deleteFeedback } = useFeedback();
  const colorStyle = COLOR_MAP[user.color];

  const sortedFeedbacks = useMemo(
    () => [...homework.feedbacks].sort((a, b) => a.startIndex - b.startIndex),
    [homework.feedbacks]
  );

  const myFeedbacks = useMemo(
    () => sortedFeedbacks.filter((f) => f.teacherId === user.id),
    [sortedFeedbacks, user.id]
  );
  const otherFeedbacks = useMemo(
    () => sortedFeedbacks.filter((f) => f.teacherId !== user.id),
    [sortedFeedbacks, user.id]
  );

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !contentRef.current) {
      return;
    }
    const range = sel.getRangeAt(0);
    const container = contentRef.current;
    if (!container.contains(range.commonAncestorContainer)) return;

    const preRange = document.createRange();
    preRange.selectNodeContents(container);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startIndex = preRange.toString().length;
    const selectedText = sel.toString();
    const endIndex = startIndex + selectedText.length;

    if (selectedText.trim().length === 0) return;

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const top = rect.bottom - containerRect.top + 8;
    const left = rect.left - containerRect.left;

    setSelection({ startIndex, endIndex, selectedText, top, left });
    setInputComment('');
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!selection) return;
      const target = e.target as HTMLElement;
      if (!target.closest('.feedback-popup') && !target.closest('.grading-content')) {
        setSelection(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selection]);

  const handleSubmitSelection = async () => {
    if (!selection || !inputComment.trim()) return;
    const tempId = 'temp_' + Date.now();
    const tempFb: Feedback = {
      id: tempId,
      homeworkId: homework.id,
      teacherId: user.id,
      teacherName: user.name,
      teacherColor: user.color,
      startIndex: selection.startIndex,
      endIndex: selection.endIndex,
      selectedText: selection.selectedText,
      comment: inputComment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onFeedbackChange({ ...homework, feedbacks: [...homework.feedbacks, tempFb] });
    setSavingId(tempId);
    try {
      const fb = await createFeedback({
        homeworkId: homework.id,
        teacherId: user.id,
        teacherName: user.name,
        teacherColor: user.color,
        startIndex: selection.startIndex,
        endIndex: selection.endIndex,
        selectedText: selection.selectedText,
        comment: inputComment,
      });
      onFeedbackChange({
        ...homework,
        feedbacks: homework.feedbacks.map((f) => (f.id === tempId ? fb : f)),
      });
    } catch (e) {
      onFeedbackChange({
        ...homework,
        feedbacks: homework.feedbacks.filter((f) => f.id !== tempId),
      });
    } finally {
      setSavingId(null);
      setSelection(null);
      setInputComment('');
    }
  };

  const handleEdit = (fb: Feedback) => {
    setEditId(fb.id);
    setEditValue(fb.comment);
  };

  const handleSaveEdit = async (fb: Feedback) => {
    if (!editValue.trim()) return;
    setSavingId(fb.id);
    try {
      const updated = await updateFeedback({ id: fb.id, comment: editValue });
      onFeedbackChange({
        ...homework,
        feedbacks: homework.feedbacks.map((f) => (f.id === fb.id ? updated : f)),
      });
    } finally {
      setSavingId(null);
      setEditId(null);
      setEditValue('');
    }
  };

  const handleDelete = async (fb: Feedback) => {
    setDeletingId(fb.id);
    try {
      await deleteFeedback(fb.id);
      onFeedbackChange({
        ...homework,
        feedbacks: homework.feedbacks.filter((f) => f.id !== fb.id),
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleMouseDown = () => setIsDragging(true);
  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const container = contentRef.current?.closest('.grading-container') as HTMLElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.max(30, Math.min(75, pct)));
    };
    const handleUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  const renderHighlightedContent = () => {
    const text = homework.content;
    if (sortedFeedbacks.length === 0) {
      return <p style={styles.contentParagraph}>{text}</p>;
    }
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    sortedFeedbacks.forEach((fb, idx) => {
      if (cursor < fb.startIndex) {
        parts.push(<span key={`t${idx}`}>{text.slice(cursor, fb.startIndex)}</span>);
      }
      const isMine = fb.teacherId === user.id;
      const bg = COLOR_MAP[fb.teacherColor].bg;
      parts.push(
        <mark
          key={fb.id}
          data-fb-id={fb.id}
          style={{
            backgroundColor: bg,
            borderBottom: `2px solid ${COLOR_MAP[fb.teacherColor].border}`,
            borderRadius: 2,
            padding: '1px 2px',
            cursor: isMine ? 'pointer' : 'default',
          }}
          title={`${fb.teacherName}：${fb.comment}`}
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

  return (
    <div>
      <div style={styles.gradingHeader}>
        <button style={styles.backBtn} onClick={onBack}>← 返回列表</button>
        <div style={styles.gradingTitleWrap}>
          <h2 style={styles.gradingTitle}>{homework.title}</h2>
          <div style={styles.gradingSubtitle}>
            <span style={styles.chip}>👤 {homework.studentName}</span>
            <span style={styles.chip}>🕒 {homework.submittedAt}</span>
            <span style={{ ...styles.chip, backgroundColor: colorStyle.solid }}>
              我的批注：{myFeedbacks.length} 条
            </span>
          </div>
        </div>
      </div>

      <div
        className="grading-container"
        style={{
          ...styles.gradingContainer,
          flexDirection: window.innerWidth < 768 ? 'column' : 'row',
        }}
      >
        <div
          style={{
            ...styles.gradingLeft,
            width: window.innerWidth < 768 ? '100%' : `${split}%`,
          }}
        >
          <div style={styles.gradingLeftHeader}>
            <h4 style={styles.panelSubtitle}>📝 作业原文</h4>
            <span style={styles.selectTip}>选取文字可添加批注</span>
          </div>
          <div
            ref={contentRef}
            className="grading-content"
            style={styles.gradingContent}
            onMouseUp={handleMouseUp}
          >
            {renderHighlightedContent()}
          </div>

          {selection && (
            <div
              className="feedback-popup"
              style={{
                ...styles.popup,
                top: selection.top,
                left: Math.min(selection.left, 200),
              }}
            >
              <div style={styles.popupTitle}>
                <div style={{ ...styles.popupColor, backgroundColor: colorStyle.solid }} />
                为选中内容添加批注
              </div>
              <div style={styles.popupSelection}>{selection.selectedText}</div>
              <textarea
                value={inputComment}
                onChange={(e) => setInputComment(e.target.value)}
                placeholder="输入评语..."
                autoFocus
                style={{
                  ...styles.popupInput,
                  borderBottomColor: inputComment ? '#4299E1' : '#CBD5E0',
                }}
              />
              <div style={styles.popupActions}>
                <button
                  style={styles.popupCancel}
                  onClick={() => {
                    setSelection(null);
                    setInputComment('');
                  }}
                >
                  取消
                </button>
                <button
                  style={styles.popupSubmit}
                  onClick={handleSubmitSelection}
                  disabled={!inputComment.trim() || savingId !== null}
                >
                  {savingId ? <span className="loader" /> : '保存批注'}
                </button>
              </div>
            </div>
          )}
        </div>

        {window.innerWidth >= 768 && (
          <div
            style={styles.splitter}
            onMouseDown={handleMouseDown}
          >
            <div style={styles.splitterGrip} />
          </div>
        )}

        <div
          style={{
            ...styles.gradingRight,
            width: window.innerWidth < 768 ? '100%' : `calc(${100 - split}% - 6px)`,
          }}
        >
          <div style={styles.gradingLeftHeader}>
            <h4 style={styles.panelSubtitle}>💬 批注列表</h4>
          </div>

          <div style={styles.feedbackSection}>
            <div style={styles.feedbackSectionTitle}>
              <div style={{ ...styles.sectionDot, backgroundColor: colorStyle.solid }} />
              我的批注（{myFeedbacks.length}）
            </div>
            {myFeedbacks.length === 0 ? (
              <div style={styles.emptyFb}>
                <div style={styles.emptyFbIcon}>📝</div>
                <p>选取原文文字添加你的第一条批注</p>
              </div>
            ) : (
              myFeedbacks.map((fb) => (
                <div
                  key={fb.id}
                  style={{
                    ...styles.fbBubble,
                    backgroundColor: colorStyle.solid,
                    borderLeft: `3px solid ${colorStyle.border}`,
                    opacity: deletingId === fb.id ? 0.5 : 1,
                  }}
                >
                  <div style={styles.fbQuote}>"{fb.selectedText}"</div>
                  {editId === fb.id ? (
                    <>
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                        style={{
                          ...styles.editInput,
                          borderBottomColor: editValue ? '#4299E1' : '#CBD5E0',
                        }}
                      />
                      <div style={styles.fbActions}>
                        <button
                          style={styles.fbCancel}
                          onClick={() => {
                            setEditId(null);
                            setEditValue('');
                          }}
                        >
                          取消
                        </button>
                        <button
                          style={styles.fbSave}
                          onClick={() => handleSaveEdit(fb)}
                          disabled={savingId === fb.id}
                        >
                          {savingId === fb.id ? <span className="loader" /> : '保存'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={styles.fbComment}>{fb.comment}</div>
                      <div style={styles.fbMeta}>
                        <span>{new Date(fb.createdAt).toLocaleString('zh-CN')}</span>
                        <div style={styles.fbActionBtns}>
                          <button style={styles.fbEditBtn} onClick={() => handleEdit(fb)}>✏️ 修改</button>
                          <button
                            style={styles.fbDeleteBtn}
                            onClick={() => handleDelete(fb)}
                            disabled={deletingId === fb.id}
                          >
                            {deletingId === fb.id ? <span className="loader" /> : '🗑 删除'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {otherFeedbacks.length > 0 && (
            <div style={styles.feedbackSection}>
              <div style={styles.feedbackSectionTitle}>
                <div style={{ ...styles.sectionDot, backgroundColor: '#E2E8F0' }} />
                其他教师批注（{otherFeedbacks.length}）
              </div>
              {otherFeedbacks.map((fb) => {
                const cs = COLOR_MAP[fb.teacherColor];
                return (
                  <div
                    key={fb.id}
                    style={{
                      ...styles.fbBubble,
                      backgroundColor: cs.solid,
                      borderLeft: `3px solid ${cs.border}`,
                      opacity: 0.85,
                    }}
                  >
                    <div style={styles.fbTeacherTag}>
                      <div style={{ ...styles.avatar, width: 22, height: 22, fontSize: 11, backgroundColor: cs.solid }}>
                        {fb.teacherName.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 600 }}>{fb.teacherName}</span>
                    </div>
                    <div style={styles.fbQuote}>"{fb.selectedText}"</div>
                    <div style={styles.fbComment}>{fb.comment}</div>
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
    color: 'var(--accent)',
  },
  navTabs: {
    display: 'flex',
    gap: '4px',
    flex: 1,
  },
  navTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    transition: 'all 0.15s ease',
  },
  navTabActive: {
    backgroundColor: 'rgba(26, 54, 93, 0.08)',
    color: 'var(--accent)',
  },
  navIcon: {
    width: '16px',
    height: '16px',
    borderRadius: '2px',
  },
  dashboardIcon: {
    backgroundColor: 'currentColor',
    boxShadow: '0 -6px 0 currentColor, 6px 0 0 currentColor, 6px -6px 0 currentColor',
    opacity: 0.7,
  },
  listIcon: {
    backgroundColor: 'transparent',
    borderTop: '2px solid currentColor',
    borderBottom: '2px solid currentColor',
    height: '10px',
    width: '16px',
    opacity: 0.7,
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
    color: 'var(--text-primary)',
    border: '2px solid',
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
  centerLoader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
  },
  dashboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  },
  dashSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--accent)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 'var(--radius)',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.2s ease',
  },
  statIconWrap: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: 'var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statIcon: {
    width: '22px',
    height: '22px',
    borderRadius: '6px',
    opacity: 0.85,
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
    flexDirection: 'row',
  },
  dashCard: {
    backgroundColor: '#fff',
    borderRadius: 'var(--radius)',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border)',
  },
  dashCardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '16px',
  },
  dashList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  dashListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: 'var(--border-light)',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    width: '100%',
  },
  dashListBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#BEE3F8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    color: 'var(--accent)',
    flexShrink: 0,
  },
  dashListContent: {
    flex: 1,
    minWidth: 0,
  },
  dashListTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  dashListMeta: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  dashListArrow: {
    color: 'var(--accent)',
    fontSize: '16px',
    fontWeight: 600,
  },
  emptyState: {
    padding: '32px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  listView: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
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
    backgroundColor: 'var(--accent)',
    color: '#fff',
  },
  filterCount: {
    fontSize: '11px',
    padding: '2px 7px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'inherit',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
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
    gap: '12px',
    transition: 'all 0.2s ease',
  },
  hwCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hwAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#BEE3F8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    color: 'var(--accent)',
    fontSize: '16px',
  },
  hwStatus: {
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  hwTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
  },
  hwMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  hwTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#2F855A',
    fontWeight: 500,
  },
  hwTagDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  emptyStateBig: {
    padding: '80px 24px',
    textAlign: 'center',
    backgroundColor: '#fff',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: '15px',
  },
  gradingHeader: {
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
  gradingTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  gradingTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  gradingSubtitle: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  chip: {
    fontSize: '13px',
    padding: '4px 12px',
    borderRadius: '12px',
    backgroundColor: '#fff',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  gradingContainer: {
    display: 'flex',
    gap: 0,
    minHeight: '650px',
    position: 'relative',
  },
  gradingLeft: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  gradingRight: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
  },
  splitter: {
    width: '6px',
    cursor: 'col-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  splitterGrip: {
    width: '3px',
    height: '40px',
    backgroundColor: '#CBD5E0',
    borderRadius: '3px',
  },
  gradingLeftHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
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
  selectTip: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  gradingContent: {
    backgroundColor: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '32px 40px',
    minHeight: '600px',
    userSelect: 'text',
    position: 'relative',
    overflow: 'auto',
    transition: 'all 0.2s ease',
  },
  contentParagraph: {
    fontSize: '15px',
    lineHeight: 2,
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  popup: {
    position: 'absolute',
    zIndex: 50,
    width: '320px',
    backgroundColor: '#fff',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border)',
    padding: '16px',
  },
  popupTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  popupColor: {
    width: '14px',
    height: '14px',
    borderRadius: '4px',
  },
  popupSelection: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    padding: '8px 10px',
    backgroundColor: 'var(--border-light)',
    borderRadius: '6px',
    borderLeft: '3px solid var(--accent)',
    marginBottom: '10px',
    fontStyle: 'italic',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  popupInput: {
    width: '100%',
    minHeight: '70px',
    border: 'none',
    borderBottom: '2px solid',
    fontSize: '14px',
    padding: '8px 4px',
    resize: 'vertical',
    color: 'var(--text-primary)',
    backgroundColor: 'transparent',
    transition: 'border-color 0.2s ease',
  },
  popupActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '12px',
  },
  popupCancel: {
    padding: '7px 14px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    borderRadius: '6px',
    fontWeight: 500,
  },
  popupSubmit: {
    padding: '7px 14px',
    fontSize: '13px',
    backgroundColor: 'var(--accent)',
    color: '#fff',
    borderRadius: '6px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '90px',
    justifyContent: 'center',
  },
  feedbackSection: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-light)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '45%',
    overflow: 'auto',
  },
  feedbackSectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    marginBottom: '4px',
  },
  sectionDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  fbBubble: {
    borderRadius: 'var(--radius)',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    transition: 'opacity 0.2s ease',
  },
  fbTeacherTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'var(--text-primary)',
  },
  fbQuote: {
    fontSize: '13px',
    fontStyle: 'italic',
    color: 'var(--text-primary)',
    padding: '6px 10px',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: '6px',
    borderLeft: '2px solid rgba(0,0,0,0.1)',
  },
  fbComment: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    lineHeight: 1.55,
  },
  fbMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    gap: '10px',
    flexWrap: 'wrap',
  },
  fbActionBtns: {
    display: 'flex',
    gap: '8px',
  },
  fbEditBtn: {
    fontSize: '12px',
    color: 'var(--accent)',
    fontWeight: 500,
  },
  fbDeleteBtn: {
    fontSize: '12px',
    color: '#C53030',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  editInput: {
    width: '100%',
    minHeight: '60px',
    border: 'none',
    borderBottom: '2px solid',
    fontSize: '14px',
    padding: '6px 4px',
    resize: 'vertical',
    color: 'var(--text-primary)',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: '4px 4px 0 0',
    transition: 'border-color 0.2s ease',
  },
  fbActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  fbCancel: {
    padding: '5px 12px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    borderRadius: '5px',
    fontWeight: 500,
  },
  fbSave: {
    padding: '5px 12px',
    fontSize: '12px',
    backgroundColor: 'var(--accent)',
    color: '#fff',
    borderRadius: '5px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  emptyFb: {
    padding: '28px 16px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '13px',
  },
  emptyFbIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
};
