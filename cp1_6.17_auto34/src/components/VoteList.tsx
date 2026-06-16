import { useState } from 'react';
import axios from 'axios';
import { Vote } from '../types';

interface Props {
  votes: Vote[];
  userId: string;
  onSelectVote: (id: string) => void;
  onRefresh: () => void;
}

function isExpired(v: Vote): boolean {
  return !!v.deadline && v.deadline < Date.now() / 1000;
}

export default function VoteList({ votes, userId, onSelectVote, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [voteType, setVoteType] = useState<'single' | 'multiple'>('single');
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const filtered = votes.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddOption = () => {
    if (options.length < 8) setOptions([...options, '']);
  };
  const handleRemoveOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };
  const handleOptionChange = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleSubmit = async () => {
    setError('');
    const validOpts = options.map(o => o.trim()).filter(Boolean);
    if (!title.trim()) { setError('请输入投票标题'); return; }
    if (title.length > 50) { setError('标题不能超过50字'); return; }
    if (validOpts.length < 2) { setError('至少需要2个有效选项'); return; }
    let deadlineTs: number | null = null;
    if (deadlineEnabled && deadline) {
      deadlineTs = Math.floor(new Date(deadline).getTime() / 1000);
      if (isNaN(deadlineTs) || deadlineTs < Date.now() / 1000) {
        setError('截止时间无效');
        return;
      }
    }
    setCreating(true);
    try {
      await axios.post('/api/votes', {
        title: title.trim(),
        vote_type: voteType,
        options: validOpts,
        creator_id: userId,
        deadline: deadlineTs,
      });
      setShowModal(false);
      setTitle('');
      setOptions(['', '']);
      setDeadlineEnabled(false);
      setDeadline('');
      onRefresh();
    } catch (e: any) {
      setError(e.response?.data?.error || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, voteId: string) => {
    e.stopPropagation();
    if (!confirm('确定删除该投票？')) return;
    try {
      await axios.delete(`/api/votes/${voteId}`, { data: { creator_id: userId } });
      onRefresh();
    } catch {
      alert('删除失败');
    }
  };

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 2px 8px rgba(59,130,246,0.08)',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    position: 'relative',
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ color: '#3B82F6', fontSize: 28, fontWeight: 700 }}>团队投票决策</h1>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: '#3B82F6',
              color: '#fff',
              padding: '10px 22px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
            }}
          >+ 创建投票</button>
        </div>
        <input
          type="text"
          placeholder="🔍 搜索投票主题..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid #D1D5DB',
            background: '#fff',
            fontSize: 14,
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>暂无投票</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 18,
        }}>
          {filtered.map(v => {
            const expired = isExpired(v);
            return (
              <div
                key={v.id}
                onClick={() => onSelectVote(v.id)}
                style={cardStyle}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 20px rgba(59,130,246,0.18)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(59,130,246,0.08)';
                }}
              >
                <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10, color: '#1F2937' }}>{v.title}</h3>
                <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
                  <span>📊 {v.options_count ?? v.options.length} 选项</span>
                  <span>👥 {v.total_voters} 参与</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: v.vote_type === 'single' ? '#DBEAFE' : '#E0E7FF',
                    color: v.vote_type === 'single' ? '#1D4ED8' : '#4338CA',
                    fontSize: 12,
                    fontWeight: 500,
                  }}>{v.vote_type === 'single' ? '单选' : '多选'}</span>
                  {expired && <span style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: '#FEE2E2',
                    color: '#DC2626',
                    fontSize: 12,
                    fontWeight: 500,
                  }}>已截止</span>}
                </div>
                {v.creator_id === userId && (
                  <button
                    onClick={(e) => handleDelete(e, v.id)}
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      background: 'transparent',
                      color: '#EF4444',
                      fontSize: 13,
                      padding: 4,
                    }}
                  >🗑</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: 20,
        }} onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff',
            borderRadius: 14,
            padding: 26,
            maxWidth: 480,
            width: '100%',
            maxHeight: '88vh',
            overflowY: 'auto',
          }}>
            <h2 style={{ marginBottom: 18, color: '#1F2937' }}>创建新投票</h2>

            <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: 500 }}>投票标题（最多50字）</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, 50))}
              placeholder="请输入投票标题"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: 8,
                marginBottom: 14,
                fontSize: 14,
              }}
            />

            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: 500 }}>类型</label>
                <select
                  value={voteType}
                  onChange={e => setVoteType(e.target.value as 'single' | 'multiple')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    fontSize: 14,
                    background: '#fff',
                  }}
                >
                  <option value="single">单选</option>
                  <option value="multiple">多选</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: 500 }}>
                  <input type="checkbox" checked={deadlineEnabled} onChange={e => setDeadlineEnabled(e.target.checked)} style={{ marginRight: 6 }} />
                  截止时间
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  disabled={!deadlineEnabled}
                  onChange={e => setDeadline(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    fontSize: 14,
                    background: deadlineEnabled ? '#fff' : '#F3F4F6',
                  }}
                />
              </div>
            </div>

            <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: 500 }}>选项（2-8个）</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {options.map((op, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={op}
                    onChange={e => handleOptionChange(i, e.target.value)}
                    placeholder={`选项 ${i + 1}`}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  />
                  {options.length > 2 && (
                    <button onClick={() => handleRemoveOption(i)} style={{
                      padding: '0 12px',
                      color: '#EF4444',
                      background: '#FEE2E2',
                      borderRadius: 8,
                      fontSize: 14,
                    }}>−</button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 8 && (
              <button onClick={handleAddOption} style={{
                width: '100%',
                padding: '9px',
                border: '1px dashed #93C5FD',
                borderRadius: 8,
                background: '#EFF6FF',
                color: '#2563EB',
                fontSize: 13,
                marginBottom: 14,
              }}>+ 添加选项</button>
            )}

            {error && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: '#F3F4F6',
                color: '#374151',
                fontSize: 14,
              }}>取消</button>
              <button onClick={handleSubmit} disabled={creating} style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: '#3B82F6',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                opacity: creating ? 0.6 : 1,
              }}>{creating ? '创建中...' : '创建'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
