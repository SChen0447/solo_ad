import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Coins, ShoppingBag, TrendingUp, Gift, Ticket } from 'lucide-react';
import type { MemberDetail, Reward, ExchangeRecord } from '../types';

function MemberPage() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [exchangeMsg, setExchangeMsg] = useState('');
  const [exchangeError, setExchangeError] = useState('');

  useEffect(() => {
    if (id) {
      fetchMember(id);
      fetchRewards();
    }
  }, [id]);

  const fetchMember = async (memberId: string) => {
    const res = await fetch(`/api/members/${memberId}`);
    const data = await res.json();
    setMember(data);
  };

  const fetchRewards = async () => {
    const res = await fetch('/api/rewards');
    const data = await res.json();
    setRewards(data);
  };

  const handleExchange = async (reward: Reward) => {
    setExchangeMsg('');
    setExchangeError('');
    if (!id || !member) return;
    if (member.points < reward.pointsCost) {
      setExchangeError('积分不足，无法兑换');
      return;
    }
    if (reward.stock <= 0) {
      setExchangeError('库存不足');
      return;
    }
    const res = await fetch('/api/exchanges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: id, rewardId: reward.id }),
    });
    if (res.ok) {
      setExchangeMsg(`成功兑换「${reward.name}」！`);
      fetchMember(id);
      fetchRewards();
      setTimeout(() => setExchangeMsg(''), 3000);
    } else {
      const data = await res.json();
      setExchangeError(data.error || '兑换失败');
    }
  };

  const chartData = member
    ? [...member.pointsHistory]
        .reverse()
        .map((h) => ({
          date: h.date.slice(5),
          fullDate: h.date,
          activity: h.activity,
          points: h.points,
        }))
    : [];

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { fullDate: string; activity: string; points: number } }>;
  }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div
          style={{
            background: '#3E2C1A',
            color: '#F5F0E8',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 13,
            boxShadow: '0 4px 12px rgba(62, 44, 26, 0.2)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.activity}</div>
          <div style={{ opacity: 0.8, marginBottom: 2 }}>{d.fullDate}</div>
          <div style={{ color: '#D4834A', fontWeight: 700 }}>+{d.points} 积分</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {member && (
        <>
          <div className="member-profile">
            <div className="member-profile-avatar">
              <img src={member.avatar} alt={member.name} />
            </div>
            <div className="member-profile-info">
              <h2>{member.name}</h2>
              <div className="points-display">
                <Coins size={18} style={{ display: 'inline', marginRight: 6 }} />
                当前积分：{member.points} 分
              </div>
            </div>
          </div>

          <div className="two-columns">
            <div className="section">
              <h3 className="section-title">
                <TrendingUp size={20} />
                积分获取记录
              </h3>
              <div className="chart-container">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4DB8B8" />
                          <stop offset="100%" stopColor="#4D8DD4" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFE8DD" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#6B5744', fontSize: 12 }}
                        axisLine={{ stroke: '#E0D5C7' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#6B5744', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(212, 131, 74, 0.08)' }} />
                      <Bar
                        dataKey="points"
                        fill="url(#barGradient)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 40 }}>
                    暂无积分记录
                  </p>
                )}
              </div>
            </div>

            <div className="section">
              <h3 className="section-title">
                <Gift size={20} />
                积分商城
              </h3>
              {exchangeMsg && (
                <p
                  style={{
                    background: '#E8F5E8',
                    color: '#2D7A2D',
                    padding: '10px 14px',
                    borderRadius: 8,
                    marginBottom: 14,
                    fontSize: 13,
                  }}
                >
                  ✓ {exchangeMsg}
                </p>
              )}
              {exchangeError && (
                <p
                  style={{
                    background: '#F5E8E8',
                    color: '#7A2D2D',
                    padding: '10px 14px',
                    borderRadius: 8,
                    marginBottom: 14,
                    fontSize: 13,
                  }}
                >
                  ✗ {exchangeError}
                </p>
              )}
              <div className="rewards-grid">
                {rewards.map((reward) => (
                  <div key={reward.id} className="reward-card">
                    <div className="reward-name">
                      {reward.type === 'coupon' ? (
                        <Ticket size={14} style={{ display: 'inline', marginRight: 4 }} />
                      ) : (
                        <Gift size={14} style={{ display: 'inline', marginRight: 4 }} />
                      )}
                      {reward.name}
                    </div>
                    <div className="reward-desc">{reward.description}</div>
                    <div className="reward-footer">
                      <div>
                        <span className="reward-cost">{reward.pointsCost} 积分</span>
                        <span className="reward-stock" style={{ marginLeft: 8 }}>
                          库存 {reward.stock}
                        </span>
                      </div>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => handleExchange(reward)}
                        disabled={
                          member.points < reward.pointsCost || reward.stock <= 0
                        }
                      >
                        兑换
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="section" style={{ gridColumn: '1 / -1' }}>
              <h3 className="section-title">
                <ShoppingBag size={20} />
                兑换历史
              </h3>
              {member.exchanges && member.exchanges.length > 0 ? (
                <div className="exchange-list">
                  {[...member.exchanges].reverse().map((ex: ExchangeRecord) => (
                    <div key={ex.id} className="exchange-item">
                      <div className="exchange-item-info">
                        <div className="name">{ex.rewardName}</div>
                        <div className="date">{ex.date}</div>
                      </div>
                      <div className="exchange-points">-{ex.pointsCost} 积分</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>
                  暂无兑换记录
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MemberPage;
