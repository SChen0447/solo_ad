import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LabelList
} from 'recharts';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface PollData {
  id: string;
  title: string;
  options: PollOption[];
  deadline: number;
  createdAt: number;
  totalVotes: number;
  isExpired: boolean;
}

interface PollVoteProps {
  pollId: string;
  onBack: () => void;
  onNavigate: (id: string) => void;
}

type ChartType = 'bar' | 'pie';

const CHART_COLORS = ['#2B6CB0', '#3182CE', '#4299E1', '#63B3ED', '#90CDF4', '#BEE3F8', '#2C5282', '#2A4365'];

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '已结束';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}天${hours % 24}小时${minutes % 60}分${seconds % 60}秒`;
  }
  if (hours > 0) {
    return `${hours}小时${minutes % 60}分${seconds % 60}秒`;
  }
  if (minutes > 0) {
    return `${minutes}分${seconds % 60}秒`;
  }
  return `${seconds}秒`;
}

function PollVote({ pollId, onBack }: PollVoteProps) {
  const [poll, setPoll] = useState<PollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showResults, setShowResults] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [isVoting, setIsVoting] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const pollRef = useRef<PollData | null>(null);
  const deadlineRef = useRef<number>(0);
  const countdownTimerRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  pollRef.current = poll;

  const fetchPoll = useCallback(async () => {
    try {
      const response = await fetch(`/api/polls/${pollId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('投票不存在或已被删除');
        }
        throw new Error('加载投票失败');
      }
      const data: PollData = await response.json();
      setPoll(data);
      deadlineRef.current = data.deadline;

      const votedKey = `voted_${data.id}`;
      const votedVal = localStorage.getItem(votedKey);
      if (votedVal) {
        setHasVoted(true);
        setVotedOptionId(votedVal);
      }

      const remaining = Math.max(0, data.deadline - Date.now());
      setTimeRemaining(remaining);

      if (data.isExpired || remaining <= 0) {
        setShowResults(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  useEffect(() => {
    if (!poll) return;

    deadlineRef.current = poll.deadline;

    const tick = () => {
      const remaining = Math.max(0, deadlineRef.current - Date.now());
      setTimeRemaining(remaining);

      if (remaining <= 0 && !pollRef.current?.isExpired) {
        setPoll((prev) => (prev ? { ...prev, isExpired: true } : prev));
        setShowResults(true);
        if (countdownTimerRef.current !== null) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
      }
    };

    tick();
    countdownTimerRef.current = window.setInterval(tick, 1000);

    return () => {
      if (countdownTimerRef.current !== null) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [poll]);

  useEffect(() => {
    if (!poll || hasVoted || poll.isExpired) return;

    refreshTimerRef.current = window.setInterval(() => {
      fetchPoll();
    }, 3000);

    return () => {
      if (refreshTimerRef.current !== null) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [poll, hasVoted, fetchPoll]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleVote = async (optionId: string) => {
    if (!poll || hasVoted || poll.isExpired || isVoting) return;

    setIsVoting(true);
    setError(null);

    try {
      const response = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          optionId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '投票失败');
      }

      const data: PollData = await response.json();
      setPoll(data);
      setHasVoted(true);
      setVotedOptionId(optionId);
      localStorage.setItem(`voted_${data.id}`, optionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '投票失败');
    } finally {
      setIsVoting(false);
    }
  };

  const getChartData = () => {
    if (!poll) return [];
    return poll.options.map((opt, index) => ({
      name: opt.text.length > 10 ? opt.text.slice(0, 10) + '...' : opt.text,
      fullName: opt.text,
      votes: opt.votes,
      fill: CHART_COLORS[index % CHART_COLORS.length]
    }));
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="card">
        <div className="error-message">{error}</div>
        <button className="btn-secondary" onClick={onBack}>
          返回创建投票
        </button>
      </div>
    );
  }

  if (!poll) return null;

  const isExpired = poll.isExpired || timeRemaining <= 0;
  const displayResults = showResults || hasVoted || isExpired;
  const maxVotes = Math.max(...poll.options.map((o) => o.votes), 1);

  return (
    <>
      <span className="back-link" onClick={onBack}>
        ← 返回首页
      </span>

      <div className="card">
        <div className="poll-header">
          <h2 className="poll-title">{poll.title}</h2>
          <div className="poll-stats">
            <div className="stat-item">
              <div className="stat-value">{poll.totalVotes}</div>
              <div className="stat-label">参与人数</div>
            </div>
            <div className="stat-item">
              <div className={`stat-value ${isExpired ? 'countdown-expired' : timeRemaining < 60000 ? 'countdown-warning' : ''}`}>
                {formatTimeRemaining(timeRemaining)}
              </div>
              <div className="stat-label">剩余时间</div>
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {hasVoted && (
          <div className="success-message">
            您已成功投票！感谢您的参与。
          </div>
        )}

        {isExpired && !hasVoted && (
          <div className="error-message">
            投票已结束，无法再进行投票。
          </div>
        )}

        <div className="options-list">
          {poll.options.map((option) => {
            const percentage = poll.totalVotes > 0
              ? Math.round((option.votes / poll.totalVotes) * 100)
              : 0;
            const isMyVote = votedOptionId === option.id;
            const disabled = hasVoted || isExpired || isVoting;

            return (
              <div
                key={option.id}
                className={`option-item ${isMyVote ? 'voted' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => handleVote(option.id)}
              >
                {displayResults && (
                  <div
                    className="progress-bar-container"
                    style={{
                      width: poll.totalVotes > 0
                        ? `${(option.votes / maxVotes) * 100}%`
                        : '0%'
                    }}
                  />
                )}
                <span className="option-text">
                  {option.text}
                  {isMyVote && ' ✓'}
                </span>
                {displayResults && (
                  <div className="option-vote-info">
                    <span className="vote-count">
                      {option.votes} 票 ({percentage}%)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!showResults && !isExpired && (
          <button
            className="btn-secondary"
            style={{ width: '100%' }}
            onClick={() => setShowResults(true)}
          >
            查看结果统计
          </button>
        )}

        {showResults && !isExpired && !hasVoted && (
          <button
            className="btn-secondary"
            style={{ width: '100%', marginTop: '12px' }}
            onClick={() => setShowResults(false)}
          >
            返回投票
          </button>
        )}
      </div>

      {(displayResults || isExpired) && (
        <div className="card">
          <h2 className="card-title">结果统计</h2>

          <div className="chart-toggle">
            <button
              className={`toggle-btn ${chartType === 'bar' ? 'active' : ''}`}
              onClick={() => setChartType('bar')}
            >
              柱状图
            </button>
            <button
              className={`toggle-btn ${chartType === 'pie' ? 'active' : ''}`}
              onClick={() => setChartType('pie')}
            >
              饼图
            </button>
          </div>

          <div style={{ width: '100%', height: windowWidth < 640 ? 300 : 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart
                  data={getChartData()}
                  margin={{
                    top: windowWidth < 640 ? 16 : 20,
                    right: windowWidth < 640 ? 16 : 30,
                    left: windowWidth < 640 ? 10 : 20,
                    bottom: windowWidth < 640 ? 50 : 60
                  }}
                >
                  <XAxis
                    dataKey="name"
                    angle={windowWidth < 640 ? -45 : -30}
                    textAnchor="end"
                    interval={0}
                    height={windowWidth < 640 ? 60 : 80}
                    tick={{ fontSize: windowWidth < 640 ? 10 : 12, fill: '#4A5568' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: windowWidth < 640 ? 10 : 12, fill: '#4A5568' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    label={{
                      value: '票数',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#718096',
                      fontSize: windowWidth < 640 ? 10 : 12
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, _name: string, props: any) => [
                      `${value} 票`,
                      props?.payload?.fullName || ''
                    ]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                  />
                  <Bar
                    dataKey="votes"
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                    radius={[6, 6, 0, 0]}
                  >
                    {getChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    <LabelList
                      dataKey="votes"
                      position="top"
                      fill="#2D3748"
                      fontSize={windowWidth < 640 ? 10 : 12}
                      fontWeight={600}
                    />
                  </Bar>
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={getChartData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      windowWidth < 640
                        ? `${(percent * 100).toFixed(0)}%`
                        : `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={windowWidth < 640 ? 80 : 120}
                    fill="#8884d8"
                    dataKey="votes"
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {getChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _name: string, props: any) => [
                      `${value} 票`,
                      props?.payload?.fullName || ''
                    ]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: windowWidth < 640 ? 11 : 12 }}
                  />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>

          {poll.totalVotes === 0 && (
            <div style={{ textAlign: 'center', color: '#718096', marginTop: '16px' }}>
              暂无投票数据
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default PollVote;
