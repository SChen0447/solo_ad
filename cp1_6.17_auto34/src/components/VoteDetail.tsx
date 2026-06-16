import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import axios from 'axios';
import { Vote, Option } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import ChatPanel from './ChatPanel';

interface Props {
  voteId: string;
  userId: string;
  socket: Socket | null;
  onBack: () => void;
}

function throttle<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any;
  return ((...args: any[]) => {
    const now = Date.now();
    const remaining = delay - (now - last);
    lastArgs = args;
    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      last = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn(...lastArgs);
      }, remaining);
    }
  }) as T;
}

export default function VoteDetail({ voteId, userId, socket, onBack }: Props) {
  const [vote, setVote] = useState<Vote | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pendingVoteRef = useRef<Vote | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const throttledSetVote = useRef(throttle((v: Vote) => setVote(v), 100)).current;

  const fetchVote = async () => {
    try {
      const res = await axios.get<Vote>(`/api/votes/${voteId}`);
      const v = res.data;
      setVote(v);
      setHasVoted((v.voter_ids || []).includes(userId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVote();
    if (socket) {
      socket.emit('join_vote', { vote_id: voteId });
      const handler = (updated: Vote) => {
        pendingVoteRef.current = updated;
        throttledSetVote(updated);
        if ((updated.voter_ids || []).includes(userId)) {
          setHasVoted(true);
        }
      };
      socket.on('vote_updated', handler);
      return () => {
        socket.off('vote_updated', handler);
        socket.emit('leave_vote', { vote_id: voteId });
      };
    }
  }, [voteId, userId, socket, throttledSetVote]);

  const isExpired = !!vote?.deadline && vote.deadline < Date.now() / 1000;
  const readonly = hasVoted || isExpired;

  const totalVotes = vote ? vote.options.reduce((s, o) => s + o.votes, 0) : 0;
  const maxVotes = vote ? Math.max(1, ...vote.options.map(o => o.votes)) : 1;

  const chartData = vote ? vote.options.map(o => ({
    name: o.text,
    votes: o.votes,
    percent: totalVotes > 0 ? Math.round((o.votes / totalVotes) * 100) : 0,
  })) : [];

  const handleSelectOption = (optId: string) => {
    if (readonly) return;
    if (vote?.vote_type === 'single') {
      setSelectedOptions([optId]);
    } else {
      setSelectedOptions(prev =>
        prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]
      );
    }
  };

  const handleSubmit = async () => {
    if (selectedOptions.length === 0 || submitting || readonly) return;
    setSubmitting(true);
    try {
      const res = await axios.post<Vote>(`/api/votes/${voteId}/vote`, {
        option_ids: selectedOptions,
        user_id: userId,
      });
      setVote(res.data);
      setHasVoted(true);
      setSelectedOptions([]);
    } catch (e: any) {
      alert(e.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const copyShareLink = () => {
    const link = window.location.href;
    navigator.clipboard?.writeText(link).then(() => alert('分享链接已复制'));
  };

  if (loading || !vote) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#3B82F6' }}>加载中...</div>;
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: 24,
        paddingRight: showChat && !isMobile ? 380 : 24,
        transition: 'padding-right 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={onBack} style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: '#fff',
            color: '#3B82F6',
            border: '1px solid #BFDBFE',
            fontSize: 14,
          }}>← 返回列表</button>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', flex: 1 }}>{vote.title}</h1>
          <button onClick={copyShareLink} style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: '#EFF6FF',
            color: '#2563EB',
            fontSize: 13,
          }}>🔗 分享</button>
          <button onClick={() => setShowChat(!showChat)} style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: '#3B82F6',
            color: '#fff',
            fontSize: 13,
          }}>💬 讨论 {showChat ? '▼' : '▶'}</button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{
            padding: '4px 12px',
            borderRadius: 999,
            background: vote.vote_type === 'single' ? '#DBEAFE' : '#E0E7FF',
            color: vote.vote_type === 'single' ? '#1D4ED8' : '#4338CA',
            fontSize: 13,
            fontWeight: 500,
          }}>{vote.vote_type === 'single' ? '单选' : '多选'}</span>
          <span style={{
            padding: '4px 12px',
            borderRadius: 999,
            background: '#E0F2FE',
            color: '#0369A1',
            fontSize: 13,
            fontWeight: 500,
          }}>👥 {vote.total_voters} 人参与</span>
          {isExpired && <span style={{
            padding: '4px 12px',
            borderRadius: 999,
            background: '#FEE2E2',
            color: '#DC2626',
            fontSize: 13,
            fontWeight: 500,
          }}>已截止</span>}
          {hasVoted && <span style={{
            padding: '4px 12px',
            borderRadius: 999,
            background: '#D1FAE5',
            color: '#047857',
            fontSize: 13,
            fontWeight: 500,
          }}>✓ 已投票</span>}
        </div>

        <div style={{
          background: '#fff',
          borderRadius: 14,
          padding: 24,
          boxShadow: '0 2px 10px rgba(59,130,246,0.08)',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            {vote.options.map(opt => {
              const percent = totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0;
              const isMax = opt.votes > 0 && opt.votes === maxVotes && totalVotes > 0;
              const isSelected = selectedOptions.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id)}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    border: `2px solid ${isSelected ? '#3B82F6' : '#E5E7EB'}`,
                    background: isSelected ? '#EFF6FF' : '#FAFBFF',
                    cursor: readonly ? 'default' : 'pointer',
                    opacity: readonly && !isSelected ? 0.9 : 1,
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 500, color: '#1F2937', fontSize: 15 }}>
                      {isSelected && '✓ '}{opt.text}
                    </span>
                    <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
                      {opt.votes} 票 · {percent.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{
                    height: 10,
                    background: '#E5E7EB',
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${percent}%`,
                        background: isMax
                          ? 'linear-gradient(90deg, #10B981, #34D399)'
                          : 'linear-gradient(90deg, #9CA3AF, #D1D5DB)',
                        transition: 'width 0.5s ease',
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {!readonly ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedOptions.length === 0}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 10,
                background: selectedOptions.length > 0 ? '#3B82F6' : '#D1D5DB',
                color: '#fff',
                fontWeight: 600,
                fontSize: 15,
                opacity: submitting ? 0.6 : 1,
              }}
            >{submitting ? '提交中...' : vote.vote_type === 'single' ? '提交投票' : `提交投票 (已选${selectedOptions.length}项)`}</button>
          ) : (
            <div style={{ textAlign: 'center', padding: 10, color: '#6B7280', fontSize: 14 }}>
              {hasVoted ? '您已参与投票，可查看实时结果' : '投票已截止'}
            </div>
          )}
        </div>

        <div style={{
          background: '#fff',
          borderRadius: 14,
          padding: 24,
          boxShadow: '0 2px 10px rgba(59,130,246,0.08)',
        }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 16, color: '#1F2937' }}>📊 实时结果统计</h3>
          <div style={{ height: Math.max(220, vote.options.length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: unknown) => {
                  const num = v as number;
                  return `${num} 票`;
                }} />
                <Bar dataKey="votes" radius={[0, 6, 6, 0]} animationDuration={500} barSize={26}>
                  {vote.options.map((opt: Option, idx: number) => (
                    <Cell key={idx} fill={opt.votes > 0 && opt.votes === maxVotes && totalVotes > 0 ? '#10B981' : '#93C5FD'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <ChatPanel
        voteId={voteId}
        userId={userId}
        socket={socket}
        visible={showChat}
        isMobile={isMobile}
        onClose={() => setShowChat(false)}
      />
    </div>
  );
}
