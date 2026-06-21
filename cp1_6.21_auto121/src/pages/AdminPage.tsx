import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, ArrowUpDown, Coins, CalendarDays, Repeat } from 'lucide-react';
import type { RankedMember } from '../types';

type SortBy = 'points' | 'recentPoints' | 'exchangeCount';

function AdminPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<RankedMember[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('points');

  useEffect(() => {
    fetchRanking();
  }, [sortBy]);

  const fetchRanking = async () => {
    const res = await fetch(`/api/members/ranking?sortBy=${sortBy}`);
    const data = await res.json();
    setMembers(data);
  };

  const GoldCrown = () => (
    <Crown size={20} className="rank-crown" style={{ color: '#FFD700' }} fill="#FFD700" />
  );
  const SilverCrown = () => (
    <Crown size={20} className="rank-crown" style={{ color: '#C0C0C0' }} fill="#C0C0C0" />
  );
  const BronzeCrown = () => (
    <Crown size={20} className="rank-crown" style={{ color: '#CD7F32' }} fill="#CD7F32" />
  );

  const getCrown = (index: number) => {
    if (index === 0) return <GoldCrown />;
    if (index === 1) return <SilverCrown />;
    if (index === 2) return <BronzeCrown />;
    return null;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">会员积分排名</h1>
      </div>

      <div className="sort-buttons">
        <button
          className={`sort-btn ${sortBy === 'points' ? 'active' : ''}`}
          onClick={() => setSortBy('points')}
        >
          <Coins size={14} style={{ display: 'inline', marginRight: 4 }} />
          按积分总额
        </button>
        <button
          className={`sort-btn ${sortBy === 'recentPoints' ? 'active' : ''}`}
          onClick={() => setSortBy('recentPoints')}
        >
          <CalendarDays size={14} style={{ display: 'inline', marginRight: 4 }} />
          近30天积分
        </button>
        <button
          className={`sort-btn ${sortBy === 'exchangeCount' ? 'active' : ''}`}
          onClick={() => setSortBy('exchangeCount')}
        >
          <Repeat size={14} style={{ display: 'inline', marginRight: 4 }} />
          按兑换次数
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="ranking-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>
                <ArrowUpDown size={14} style={{ display: 'inline', marginRight: 4 }} />
                排名
              </th>
              <th>会员</th>
              <th className={sortBy === 'points' ? 'sorted' : ''}>
                <Coins size={14} style={{ display: 'inline', marginRight: 4 }} />
                积分总额
              </th>
              <th className={sortBy === 'recentPoints' ? 'sorted' : ''}>
                <CalendarDays size={14} style={{ display: 'inline', marginRight: 4 }} />
                近30天获得
              </th>
              <th className={sortBy === 'exchangeCount' ? 'sorted' : ''}>
                <Repeat size={14} style={{ display: 'inline', marginRight: 4 }} />
                兑换次数
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => (
              <tr key={member.id}>
                <td>
                  <div className="rank-cell">
                    {getCrown(index)}
                    {!getCrown(index) && (
                      <span className="rank-number">{index + 1}</span>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="table-avatar">
                      <img src={member.avatar} alt={member.name} />
                    </div>
                    <span
                      className="member-link"
                      onClick={() => navigate(`/admin/member/${member.id}`)}
                    >
                      {member.name}
                    </span>
                  </div>
                </td>
                <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {member.points}
                </td>
                <td style={{ color: '#2D7A2D' }}>+{member.recentPoints}</td>
                <td>{member.exchangeCount} 次</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminPage;
