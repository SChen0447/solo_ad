import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchOkrs, createOkr, updateOkr, addKr, updateKr as apiUpdateKr, addCheckin } from './api';
import type { Okr, Kr, Checkin } from './types';
import { TEAM_MEMBERS, QUARTERS, YEARS } from './types';
import OkrCard from './components/OkrCard';
import CheckinModal from './components/CheckinModal';
import ProgressChart from './components/ProgressChart';

export default function App() {
  const [okrs, setOkrs] = useState<Okr[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newOkr, setNewOkr] = useState({ title: '', owner: TEAM_MEMBERS[0], period: getDefaultPeriod() });
  const [modalKr, setModalKr] = useState<Kr | null>(null);
  const [chartKr, setChartKr] = useState<Kr | null>(null);
  const newCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchOkrs();
      const sorted = [...data].sort((a, b) => a.title.localeCompare(b.title, 'zh'));
      setOkrs(sorted);
    } finally {
      setLoading(false);
    }
  }

  function getDefaultPeriod(): string {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + 1;
    return `Q${q} ${now.getFullYear()}`;
  }

  const handleCreateOkr = useCallback(async () => {
    if (!newOkr.title.trim()) return;
    const created = await createOkr(newOkr);
    setOkrs((prev) => {
      const updated = [created, ...prev];
      return updated.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
    });
    setNewOkr({ title: '', owner: TEAM_MEMBERS[0], period: getDefaultPeriod() });
    setShowForm(false);
    setTimeout(() => {
      const el = document.querySelector(`[data-okr-id="${created.id}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [newOkr]);

  const handleUpdateOkrTitle = useCallback(async (id: string, title: string) => {
    const updated = await updateOkr(id, { title });
    setOkrs((prev) =>
      prev.map((o) => (o.id === id ? { ...o, title: updated.title } : o))
        .sort((a, b) => a.title.localeCompare(b.title, 'zh'))
    );
  }, []);

  const handleAddKr = useCallback(async (okrId: string, krData: { description: string; owner: string; dueDate: string }) => {
    const kr = await addKr(okrId, { ...krData, progress: 0 });
    setOkrs((prev) => prev.map((o) => o.id === okrId ? { ...o, krs: [...o.krs, kr] } : o));
  }, []);

  const handleUpdateKr = useCallback(async (krId: string, data: Partial<Kr>) => {
    const kr = await apiUpdateKr(krId, data);
    setOkrs((prev) => prev.map((o) => ({
      ...o,
      krs: o.krs.map((k) => k.id === krId ? kr : k),
    })));
  }, []);

  const handleCheckinSubmit = useCallback(async (comment: string, progress: number) => {
    if (!modalKr) return;
    const kr = await addCheckin(modalKr.id, { comment, progress });
    setOkrs((prev) => prev.map((o) => ({
      ...o,
      krs: o.krs.map((k) => k.id === modalKr.id ? kr : k),
    })));
    if (chartKr && chartKr.id === modalKr.id) setChartKr(kr);
    setModalKr(kr);
  }, [modalKr, chartKr]);

  const updateKrInState = useCallback((okrId: string, kr: Kr) => {
    setOkrs((prev) => prev.map((o) =>
      o.id === okrId ? { ...o, krs: o.krs.map((k) => (k.id === kr.id ? kr : k)) } : o
    ));
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">🎯</span>
            团队 OKR 追踪与复盘系统
          </h1>
          <button
            className="btn btn-primary add-okr-btn"
            onClick={() => setShowForm((s) => !s)}
          >
            <span className="btn-icon">+</span>
            {showForm ? '收起表单' : '新增 OKR'}
          </button>
        </div>
      </header>

      <div className={`new-okr-form-wrapper ${showForm ? 'expanded' : ''}`}>
        {showForm && (
          <div className="new-okr-form animate-collapse">
            <div className="form-group">
              <label>目标标题</label>
              <input
                type="text"
                placeholder="请输入目标标题..."
                value={newOkr.title}
                onChange={(e) => setNewOkr({ ...newOkr, title: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateOkr()}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>负责人</label>
                <select
                  value={newOkr.owner}
                  onChange={(e) => setNewOkr({ ...newOkr, owner: e.target.value })}
                >
                  {TEAM_MEMBERS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>周期</label>
                <div className="period-picker">
                  <select
                    value={newOkr.period.split(' ')[0]}
                    onChange={(e) => {
                      const year = newOkr.period.split(' ')[1];
                      setNewOkr({ ...newOkr, period: `${e.target.value} ${year}` });
                    }}
                  >
                    {QUARTERS.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  <select
                    value={newOkr.period.split(' ')[1]}
                    onChange={(e) => {
                      const q = newOkr.period.split(' ')[0];
                      setNewOkr({ ...newOkr, period: `${q} ${e.target.value}` });
                    }}
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                取消
              </button>
              <button
                className="btn btn-primary ripple-btn"
                onClick={handleCreateOkr}
                disabled={!newOkr.title.trim()}
              >
                创建 OKR
              </button>
            </div>
          </div>
        )}
      </div>

      <main className="okr-list">
        {okrs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>暂无 OKR，点击上方按钮创建第一个目标</p>
          </div>
        ) : (
          okrs.map((okr) => (
            <div key={okr.id} data-okr-id={okr.id} ref={newCardRef}>
              <OkrCard
                okr={okr}
                onUpdateTitle={(t) => handleUpdateOkrTitle(okr.id, t)}
                onAddKr={(d) => handleAddKr(okr.id, d)}
                onUpdateKr={handleUpdateKr}
                onOpenCheckin={(kr) => setModalKr(kr)}
                onOpenChart={(kr) => setChartKr(kr)}
              />
            </div>
          ))
        )}
      </main>

      {modalKr && (
        <CheckinModal
          kr={modalKr}
          onClose={() => setModalKr(null)}
          onSubmit={handleCheckinSubmit}
        />
      )}

      {chartKr && (
        <div className="chart-modal-overlay" onClick={() => setChartKr(null)}>
          <div className="chart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chart-modal-header">
              <h3>{chartKr.description}</h3>
              <button className="close-btn" onClick={() => setChartKr(null)}>×</button>
            </div>
            <ProgressChart kr={chartKr} />
          </div>
        </div>
      )}
    </div>
  );
}
