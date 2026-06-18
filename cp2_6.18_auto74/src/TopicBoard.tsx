import { useState, useEffect } from 'react';
import { TopicApi, TopicCard } from './TopicApi';

interface TopicBoardProps {
  onSelectTopic: (id: string) => void;
  showCreate: boolean;
  onCreated: () => void;
  userId: string;
  nickname: string;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

const MAX_VOTES_FOR_BAR = 50;

function TopicCardComponent({
  topic,
  onClick,
}: {
  topic: TopicCard;
  onClick: () => void;
}) {
  const barWidth = Math.min(100, (topic.totalVotes / MAX_VOTES_FOR_BAR) * 100);
  return (
    <div className="topic-card" style={styles.card} onClick={onClick}>
      <div style={styles.cardContent}>
        <h3 style={styles.cardTitle}>{topic.title}</h3>
        <div style={styles.cardMeta}>
          <span style={styles.metaItem}>
            {topic.optionCount}个选项
          </span>
          <span style={styles.metaDot}>·</span>
          <span style={styles.metaItem}>
            {topic.totalVotes}票
          </span>
          <span style={styles.metaDot}>·</span>
          <span style={styles.metaItem}>
            {topic.commentCount}条评论
          </span>
        </div>
      </div>
      <div style={styles.cardFooter}>
        <div style={styles.progressBarContainer}>
          <div
            style={{
              ...styles.progressBarFill,
              width: `${barWidth}%`,
            }}
          />
        </div>
        <span style={styles.createdTime}>
          {formatRelativeTime(topic.createdAt)}
        </span>
      </div>
    </div>
  );
}

function CreateTopicForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (title: string, description: string, options: string[]) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [error, setError] = useState('');

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
    }
  };

  const updateOption = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (!title.trim()) {
      setError('请输入话题标题');
      return;
    }
    if (validOptions.length < 2) {
      setError('请至少填写2个选项');
      return;
    }
    setError('');
    onSubmit(title.trim(), description.trim(), validOptions);
  };

  return (
    <div style={styles.createCard}>
      <h3 style={styles.createTitle}>创建新话题</h3>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>话题标题 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：团建地点选择"
            style={styles.formInput}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>描述（可选）</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="简单介绍一下这个投票话题..."
            style={{ ...styles.formInput, height: 72, resize: 'vertical' }}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>投票选项 *</label>
          <div style={styles.optionsList}>
            {options.map((opt, idx) => (
              <div key={idx} style={styles.optionRow}>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`选项 ${idx + 1}`}
                  style={styles.optionInput}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    style={styles.removeOptionBtn}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              style={styles.addOptionBtn}
            >
              + 添加选项
            </button>
          )}
        </div>
        {error && <div style={styles.formError}>{error}</div>}
        <div style={styles.formActions}>
          <button type="button" onClick={onCancel} style={styles.cancelBtn}>
            取消
          </button>
          <button type="submit" style={styles.submitBtn}>
            创建话题
          </button>
        </div>
      </form>
    </div>
  );
}

export default function TopicBoard({
  onSelectTopic,
  showCreate,
  onCreated,
}: TopicBoardProps) {
  const [topics, setTopics] = useState<TopicCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTopicId, setNewTopicId] = useState<string | null>(null);

  const loadTopics = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await TopicApi.getTopics();
      setTopics(data);
    } catch (err: any) {
      setError(err.message || '加载话题失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  const handleCreateTopic = async (
    title: string,
    description: string,
    options: string[]
  ) => {
    try {
      const result: any = await TopicApi.createTopic({
        title,
        description,
        options,
      });
      setNewTopicId(result.id);
      onCreated();
      await loadTopics();
    } catch (err: any) {
      setError(err.message || '创建话题失败');
    }
  };

  return (
    <div>
      {showCreate && (
        <div style={styles.createSection}>
          <CreateTopicForm
            onSubmit={handleCreateTopic}
            onCancel={onCreated}
          />
        </div>
      )}

      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>全部话题</h2>
        <span style={styles.topicCount}>共 {topics.length} 个话题</span>
      </div>

      {loading && <div style={styles.statusText}>加载中...</div>}
      {error && !loading && (
        <div style={styles.errorBox}>
          {error}
          <button onClick={loadTopics} style={styles.retryBtn}>
            重试
          </button>
        </div>
      )}
      {!loading && !error && topics.length === 0 && (
        <div style={styles.emptyBox}>
          暂无话题，点击右上角「创建话题」开始吧！
        </div>
      )}

      {!loading && !error && (
        <div style={styles.grid}>
          {topics.map((topic) => (
            <div
              key={topic.id}
              style={{
                animation:
                  newTopicId === topic.id
                    ? 'fadeIn 0.5s ease'
                    : undefined,
              }}
            >
              <TopicCardComponent
                topic={topic}
                onClick={() => onSelectTopic(topic.id)}
              />
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .topic-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 8px 20px rgba(0,0,0,0.15) !important;
        }
        @media (max-width: 768px) {
          .board-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  createSection: {
    marginBottom: 32,
  },
  createCard: {
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    padding: 24,
  },
  createTitle: {
    margin: 0,
    marginBottom: 20,
    fontSize: 18,
    fontWeight: 700,
    color: '#1f2937',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
  },
  formInput: {
    height: 40,
    borderRadius: 8,
    border: '1px solid #d1d5db',
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  optionRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  optionInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    border: '1px solid #d1d5db',
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  removeOptionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: 14,
  },
  addOptionBtn: {
    marginTop: 8,
    background: 'none',
    border: '1px dashed #d1d5db',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: 14,
    alignSelf: 'flex-start',
  },
  formError: {
    color: '#dc2626',
    fontSize: 14,
    background: '#fef2f2',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #fecaca',
  },
  formActions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  submitBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    background: '#3b82f6',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: '#1f2937',
  },
  topicCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusText: {
    textAlign: 'center',
    padding: 48,
    color: '#9ca3af',
    fontSize: 14,
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 12,
    padding: 16,
    color: '#dc2626',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retryBtn: {
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    padding: '6px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  emptyBox: {
    background: '#ffffff',
    border: '1px dashed #d1d5db',
    borderRadius: 12,
    padding: 48,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, 320px)',
    gap: 20,
    justifyContent: 'start',
  },
  card: {
    width: 320,
    height: 180,
    borderRadius: 12,
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    padding: 16,
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  cardTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#1f2937',
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  metaItem: {
    fontSize: 14,
    color: '#9ca3af',
  },
  metaDot: {
    fontSize: 14,
    color: '#d1d5db',
    margin: '0 2px',
  },
  cardFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    background: '#f3f4f6',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    background: 'linear-gradient(90deg, #10b981, #6ee7b7)',
    transition: 'width 0.3s ease-out',
  },
  createdTime: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },
};
