import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import { Star, Heart, MessageCircle, Send, User } from 'lucide-react';
import {
  getPerformerScores,
  getPerformerFeedback,
  likeFeedback,
  replyFeedback,
  Score,
  Feedback,
  Performer,
} from './dataStore';

interface FeedbackHistoryProps {
  performer: Performer;
  performers: Performer[];
}

function getScoreGradient(score: number): string {
  const gradients = [
    'linear-gradient(135deg, rgba(231, 76, 60, 0.25), rgba(231, 76, 60, 0.1))',
    'linear-gradient(135deg, rgba(230, 126, 34, 0.25), rgba(230, 126, 34, 0.1))',
    'linear-gradient(135deg, rgba(241, 196, 15, 0.25), rgba(241, 196, 15, 0.1))',
    'linear-gradient(135deg, rgba(46, 204, 113, 0.25), rgba(46, 204, 113, 0.1))',
    'linear-gradient(135deg, rgba(39, 174, 96, 0.25), rgba(39, 174, 96, 0.1))',
  ];
  return gradients[Math.max(0, Math.min(4, score - 1))];
}

function getScoreColor(score: number): string {
  const colors = ['#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#27AE60'];
  return colors[Math.max(0, Math.min(4, score - 1))];
}

const CustomDot = (props: any) => {
  const { cx, cy, stroke, payload } = props;
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={6}
      stroke={getScoreColor(payload.score)}
      strokeWidth={2}
      fill="#fff"
    />
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'rgba(44, 62, 80, 0.95)',
          padding: '12px 16px',
          borderRadius: '8px',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        <p style={{ color: '#fff', fontSize: '12px', marginBottom: '4px' }}>{label}</p>
        <p style={{ color: getScoreColor(payload[0].value), fontSize: '14px', fontWeight: 600 }}>
          评分：{payload[0].value} 星
        </p>
      </div>
    );
  }
  return null;
};

export default function FeedbackHistory({ performer, performers }: FeedbackHistoryProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [replyFromName, setReplyFromName] = useState(performer.name);

  useEffect(() => {
    setLikedIds(new Set());
    setReplyingTo(null);
    setReplyContent('');
    Promise.all([
      getPerformerScores(performer.id),
      getPerformerFeedback(performer.id),
    ])
      .then(([scoresData, feedbackData]) => {
        setScores(scoresData);
        setFeedback(feedbackData);
      })
      .finally(() => setLoading(false));
  }, [performer.id]);

  const chartData = scores
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((s) => ({
      date: format(new Date(s.createdAt), 'MM月dd日', { locale: zhCN }),
      score: s.score,
      comment: s.comment,
    }));

  const avgScore =
    scores.length > 0
      ? (scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(1)
      : '0.0';

  const handleLike = async (feedbackId: string) => {
    if (likedIds.has(feedbackId)) return;
    try {
      const result = await likeFeedback(feedbackId);
      if (result.success) {
        setLikedIds((prev) => new Set(prev).add(feedbackId));
        setFeedback((prev) =>
          prev.map((f) => (f.id === feedbackId ? { ...f, likes: result.likes } : f))
        );
      }
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  const handleReply = async (feedbackId: string) => {
    if (!replyContent.trim() || !replyFromName.trim()) return;
    try {
      const updated = await replyFeedback(feedbackId, replyFromName, replyContent.trim());
      setFeedback((prev) => prev.map((f) => (f.id === feedbackId ? updated : f)));
      setReplyingTo(null);
      setReplyContent('');
    } catch (error) {
      console.error('回复失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{performer.name} 的成长记录</h1>
        <p className="page-subtitle">
          {performer.instrument} · {performer.part}
        </p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-value">{scores.length}</div>
          <div className="stat-label">累计排练</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: getScoreColor(Math.round(Number(avgScore))) }}>
            {avgScore}
          </div>
          <div className="stat-label">平均评分</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{feedback.length}</div>
          <div className="stat-label">收到评论</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {feedback.reduce((sum, f) => sum + f.likes, 0)}
          </div>
          <div className="stat-label">获得点赞</div>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <h3
          style={{
            fontSize: '16px',
            color: '#2C3E50',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Star size={18} />
          评分趋势
        </h3>
        {chartData.length > 0 ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#7f8c8d' }}
                  axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                />
                <YAxis
                  domain={[0, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 12, fill: '#7f8c8d' }}
                  axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                  tickFormatter={(value) => `${value}星`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3498DB"
                  strokeWidth={3}
                  dot={<CustomDot />}
                  activeDot={{ r: 8, stroke: '#3498DB', strokeWidth: 2, fill: '#fff' }}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-in-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#95a5a6' }}>
            暂无评分记录
          </div>
        )}
      </div>

      <div className="glass-card">
        <h3
          style={{
            fontSize: '16px',
            color: '#2C3E50',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MessageCircle size={18} />
          反馈评论
          <span style={{ fontSize: '13px', color: '#95a5a6', fontWeight: 400 }}>
            ({feedback.length} 条)
          </span>
        </h3>

        {feedback.length > 0 ? (
          <div className="feedback-list">
            {feedback.map((fb, index) => (
              <div
                key={fb.id}
                className={`feedback-card score-${fb.score}`}
                style={{
                  background: getScoreGradient(fb.score),
                  animationDelay: `${index * 0.05}s`,
                  opacity: 0,
                  animation: 'fadeInUp 0.4s ease forwards',
                }}
              >
                <div className="feedback-header">
                  <div
                    className="performer-avatar"
                    style={{ width: '36px', height: '36px', fontSize: '12px' }}
                  >
                    {fb.fromName.charAt(0)}
                  </div>
                  <div>
                    <div className="feedback-from">{fb.fromName}</div>
                    <div className="feedback-score">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          fill={i < fb.score ? getScoreColor(fb.score) : 'none'}
                          color={i