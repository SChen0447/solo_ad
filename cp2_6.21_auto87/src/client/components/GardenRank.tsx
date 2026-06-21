import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/client/services/api';
import type { Member, WeeklyHarvest, CurrentUser } from '@/types';

interface Props {
  currentUser: CurrentUser;
}

const PRODUCT_OPTIONS = ['西红柿', '生菜', '黄瓜', '茄子', '辣椒', '豆角', '南瓜', '萝卜', '草莓', '其他'];
const UNIT_OPTIONS = ['g', 'kg', '棵', '个', '束'];

export default function GardenRank({ currentUser }: Props) {
  const [rankings, setRankings] = useState<Member[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyHarvest[]>([]);
  const [showHarvestForm, setShowHarvestForm] = useState(false);
  const [harvestForm, setHarvestForm] = useState({
    productName: '西红柿',
    quantity: '',
    unit: 'g',
  });
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRankings = useCallback(async () => {
    try {
      const data = await api.getRankings();
      setRankings(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadWeekly = useCallback(async () => {
    try {
      const data = await api.getWeeklyHarvests();
      setWeeklyData(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadRankings();
    loadWeekly();
    pollRef.current = setInterval(() => {
      loadRankings();
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadRankings, loadWeekly]);

  const handleHarvest = async () => {
    const qty = parseFloat(harvestForm.quantity);
    if (!qty || qty <= 0) return;
    setSubmitting(true);
    try {
      let weightG = 0;
      if (harvestForm.unit === 'kg') {
        weightG = qty * 1000;
      } else if (harvestForm.unit === 'g') {
        weightG = qty;
      } else {
        weightG = qty * 100;
      }
      await api.addHarvest({
        memberId: currentUser.id,
        memberName: currentUser.name,
        productName: harvestForm.productName,
        weightG,
        quantity: qty,
      });
      setHarvestForm({ productName: '西红柿', quantity: '', unit: 'g' });
      setShowHarvestForm(false);
      await Promise.all([loadRankings(), loadWeekly()]);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const top5 = rankings.slice(0, 5);
  const maxWeight = Math.max(...weeklyData.map((w) => w.totalWeightG), 1);

  return (
    <section className="panel">
      <div className="panel-title">
        <span>🏆 排名 & 产出</span>
        <div className="actions">
          <button className="accordion-toggle" onClick={() => setShowHarvestForm((v) => !v)} title="记录产出">
            {showHarvestForm ? '−' : '+'}
          </button>
        </div>
      </div>
      <div className="panel-content">
        {showHarvestForm && (
          <div className="harvest-form">
            <h4>🌽 记录产出</h4>
            <div className="form-row">
              <select
                value={harvestForm.productName}
                onChange={(e) => setHarvestForm({ ...harvestForm, productName: e.target.value })}
              >
                {PRODUCT_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <input
                type="number"
                placeholder="数量"
                value={harvestForm.quantity}
                onChange={(e) => setHarvestForm({ ...harvestForm, quantity: e.target.value })}
                min="0"
                step="0.1"
              />
              <select
                value={harvestForm.unit}
                onChange={(e) => setHarvestForm({ ...harvestForm, unit: e.target.value })}
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary btn-block" onClick={handleHarvest} disabled={submitting}>
              {submitting ? '提交中...' : '记录产出'}
            </button>
          </div>
        )}

        <div className="harvest-chart">
          <h4>📊 近4周收获统计</h4>
          {weeklyData.length === 0 ? (
            <div className="empty-state">暂无数据</div>
          ) : (
            <div className="bar-chart">
              {weeklyData.map((week) => {
                const pct = Math.max((week.totalWeightG / maxWeight) * 100, 2);
                return (
                  <div key={week.weekLabel} className="bar-group">
                    <div className="bar" style={{ height: `${pct}%` }}>
                      <span className="bar-value">{week.totalWeightG >= 1000 ? `${(week.totalWeightG / 1000).toFixed(1)}kg` : `${week.totalWeightG}g`}</span>
                    </div>
                    <span className="bar-label">{week.weekLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ fontWeight: 600, margin: '4px 0 8px', fontSize: 13, color: 'var(--text-muted)' }}>
          🥇 积分排行榜
        </div>
        {top5.length === 0 && <div className="empty-state">加载中...</div>}
        {top5.map((member, idx) => {
          const isCurrentUser = member.id === currentUser.id;
          return (
            <div
              key={member.id}
              className={`rank-row ${isCurrentUser ? 'current-user' : ''}`}
            >
              <div className="rank-num">{idx + 1}</div>
              <div className="avatar avatar-sm" style={{
                width: 40,
                height: 40,
                minWidth: 40,
                fontSize: 16,
              }}>
                {member.name.charAt(0)}
              </div>
              <div className="rank-info">
                <div className="rank-name">
                  {member.name}
                  {isCurrentUser && <span style={{ fontSize: 11, color: '#D97706', marginLeft: 4 }}>（我）</span>}
                </div>
                <div className="rank-stats">任务 {member.tasksCompleted} · 归还 {member.toolsReturnedOnTime}</div>
              </div>
              <div className="rank-points">{member.points}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
