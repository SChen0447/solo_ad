import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, Coins, TrendingUp, ShoppingBag } from 'lucide-react';
import type { MemberDetail } from '../types';

function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberDetail | null>(null);

  useEffect(() => {
    if (id) fetchMember(id);
  }, [id]);

  const fetchMember = async (memberId: string) => {
    const res = await fetch(`/api/members/${memberId}`);
    const data = await res.json();
    setMember(data);
  };

  const trendData = member
    ? [...member.pointsHistory]
        .reverse()
        .reduce(
          (acc: Array<{ date: string; points: number }>, curr) => {
            const last = acc[acc.length - 1];
            acc.push({
              date: curr.date.slice(5),
              points: last ? last.points + curr.points : curr.points,
            });
            return acc;
          },
          [] as Array<{ date: string; points: number }>
        )
    : [];

  const TrendTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
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
          <div style={{ opacity: 0.8, marginBottom: 4 }}>{label}</div>
          <div style={{ color: '#D4834A', fontWeight: 700 }}>
            累计积分：{payload[0].value}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {member && (
        <>
          <div className="detail-header">
            <button className="back-btn" onClick={() => navigate('/admin')}>
              <ArrowLeft size={20} />
            </button>
            <div className="member-profile" style={{ flex: 1, marginBottom: 0 }}>
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
          </div>

          <div className="three-columns">
            <div className="section" style={{ gridColumn: '1 / span 2' }}>
              <h3 className="section-title">
                <TrendingUp size={20} />
                积分走势
              </h3>
              <div className="chart-container">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendData}
                      margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#4DB8B8" />
                          <stop offset="100%" stopColor="#D4834A" />
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
                      <Tooltip content={<TrendTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="points"
                        stroke="url(#lineGradient)"
                        strokeWidth={3}
                        dot={{ fill: '#D4834A', r: 4 }}
                        activeDot={{ r: 6, fill: '#D4834A' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      textAlign: 'center',
                      padding: 40,
                    }}
                  >
                    暂无积分数据
                  </p>
                )}
              </div>
            </div>

            <div className="section">
              <h3 className="section-title">
                <ShoppingBag size={20} />
                兑换历史
              </h3>
              {member.exchanges && member.exchanges.length > 0 ? (
                <div className="exchange-list">
                  {[...member.exchanges].reverse().map((ex) => (
                    <div key={ex.id} className="exchange-item">
                      <div className="exchange-item-info">
                        <div className="name">{ex.rewardName}</div>
                        <div className="date">{ex.date}</div>
                      </div>
                      <div className="exchange-points">-{ex.pointsCost}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  style={{
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    padding: 40,
                    fontSize: 13,
                  }}
                >
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

export default MemberDetailPage;
