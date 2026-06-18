import { useEffect, useState } from 'react';
import axios from 'axios';
import type { PopupRule, PopupRuleCreate, DailyStats } from '../../shared/types';

type NavTab = 'rules' | 'dashboard';

const initialForm: PopupRuleCreate = {
  title: '',
  subtitle: '',
  productLink: '',
  bgColor: '#f0f4ff',
  triggerType: 'dwell',
  triggerValue: 5,
  maxDailyShows: 3
};

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<NavTab>('rules');
  const [rules, setRules] = useState<PopupRule[]>([]);
  const [formData, setFormData] = useState<PopupRuleCreate>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats();
    }
  }, [activeTab]);

  const fetchRules = async () => {
    try {
      const res = await axios.get('/api/rules');
      setRules(res.data);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/stats/daily');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleInputChange = (field: keyof PopupRuleCreate, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        await axios.put(`/api/rules/${editingId}`, formData);
      } else {
        await axios.post('/api/rules', formData);
      }
      setFormData(initialForm);
      setEditingId(null);
      await fetchRules();
      await fetchStats();
    } catch (err) {
      console.error('Failed to save rule:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule: PopupRule) => {
    setFormData({
      title: rule.title,
      subtitle: rule.subtitle,
      productLink: rule.productLink,
      bgColor: rule.bgColor,
      triggerType: rule.triggerType,
      triggerValue: rule.triggerValue,
      maxDailyShows: rule.maxDailyShows
    });
    setEditingId(rule.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此弹窗规则吗？')) return;
    try {
      await axios.delete(`/api/rules/${id}`);
      await fetchRules();
      await fetchStats();
      if (editingId === id) {
        setEditingId(null);
        setFormData(initialForm);
      }
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData(initialForm);
  };

  const renderNavItem = (id: NavTab, label: string, icon: string) => (
    <div
      className={`nav-item ${activeTab === id ? 'active' : ''}`}
      onClick={() => {
        setActiveTab(id);
        setMobileMenuOpen(false);
      }}
    >
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
    </div>
  );

  return (
    <div className="admin-layout">
      <button
        className="hamburger-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="菜单"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-badge">P</div>
          <span className="logo-text">弹窗管理</span>
        </div>
        <nav className="sidebar-nav">
          {renderNavItem('rules', '弹窗规则', '📋')}
          {renderNavItem('dashboard', '数据看板', '📊')}
        </nav>
      </aside>

      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      <main className="admin-content">
        {activeTab === 'rules' && (
          <div className="content-section">
            <h1 className="page-title">
              {editingId ? '编辑弹窗规则' : '创建弹窗规则'}
            </h1>

            <form className="rule-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">
                    标题
                    <span
                      className="tooltip-trigger"
                      onMouseEnter={() => setTooltip('title')}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      ?
                    </span>
                    {tooltip === 'title' && (
                      <div className="tooltip">弹窗的主标题，建议不超过15字</div>
                    )}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="请输入弹窗标题"
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    副标题
                    <span
                      className="tooltip-trigger"
                      onMouseEnter={() => setTooltip('subtitle')}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      ?
                    </span>
                    {tooltip === 'subtitle' && (
                      <div className="tooltip">辅助说明文字，可为空</div>
                    )}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.subtitle}
                    onChange={(e) => handleInputChange('subtitle', e.target.value)}
                    placeholder="请输入副标题"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    商品链接
                    <span
                      className="tooltip-trigger"
                      onMouseEnter={() => setTooltip('link')}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      ?
                    </span>
                    {tooltip === 'link' && (
                      <div className="tooltip">点击按钮后跳转的商品页面URL</div>
                    )}
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    value={formData.productLink}
                    onChange={(e) => handleInputChange('productLink', e.target.value)}
                    placeholder="https://..."
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    背景颜色
                    <span
                      className="tooltip-trigger"
                      onMouseEnter={() => setTooltip('bg')}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      ?
                    </span>
                    {tooltip === 'bg' && (
                      <div className="tooltip">弹窗卡片的背景颜色</div>
                    )}
                  </label>
                  <div className="color-picker-wrapper">
                    <input
                      type="color"
                      className="color-input"
                      value={formData.bgColor}
                      onChange={(e) => handleInputChange('bgColor', e.target.value)}
                    />
                    <span className="color-hex">{formData.bgColor}</span>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    触发条件
                    <span
                      className="tooltip-trigger"
                      onMouseEnter={() => setTooltip('trigger')}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      ?
                    </span>
                    {tooltip === 'trigger' && (
                      <div className="tooltip">选择弹窗的触发方式</div>
                    )}
                  </label>
                  <select
                    className="form-select"
                    value={formData.triggerType}
                    onChange={(e) => {
                      handleInputChange('triggerType', e.target.value);
                      if (e.target.value === 'dwell') {
                        handleInputChange('triggerValue', 5);
                      } else {
                        handleInputChange('triggerValue', 50);
                      }
                    }}
                  >
                    <option value="dwell">页面停留秒数</option>
                    <option value="scroll">滚动百分比</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    触发值
                    <span
                      className="tooltip-trigger"
                      onMouseEnter={() => setTooltip('value')}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      ?
                    </span>
                    {tooltip === 'value' && (
                      <div className="tooltip">
                        {formData.triggerType === 'dwell'
                          ? '停留秒数范围：3-30秒'
                          : '滚动百分比范围：20-80%'}
                      </div>
                    )}
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.triggerValue}
                    min={formData.triggerType === 'dwell' ? 3 : 20}
                    max={formData.triggerType === 'dwell' ? 30 : 80}
                    onChange={(e) =>
                      handleInputChange('triggerValue', Number(e.target.value))
                    }
                  />
                  <span className="field-suffix">
                    {formData.triggerType === 'dwell' ? '秒' : '%'}
                  </span>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    每日最大展示次数
                    <span
                      className="tooltip-trigger"
                      onMouseEnter={() => setTooltip('max')}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      ?
                    </span>
                    {tooltip === 'max' && (
                      <div className="tooltip">每个用户每日最多看到此弹窗的次数（1-10）</div>
                    )}
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.maxDailyShows}
                    min={1}
                    max={10}
                    onChange={(e) =>
                      handleInputChange('maxDailyShows', Number(e.target.value))
                    }
                  />
                  <span className="field-suffix">次</span>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? '保存中...' : editingId ? '更新规则' : '创建规则'}
                </button>
                {editingId && (
                  <button type="button" className="cancel-btn" onClick={handleCancel}>
                    取消
                  </button>
                )}
              </div>
            </form>

            <h2 className="section-title">已有规则（{rules.length}）</h2>
            <div className="table-wrapper">
              <table className="rules-table">
                <thead>
                  <tr>
                    <th>标题</th>
                    <th>触发方式</th>
                    <th>触发值</th>
                    <th>每日上限</th>
                    <th>背景色</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-row">
                        暂无规则，创建一个吧
                      </td>
                    </tr>
                  ) : (
                    rules.map((rule) => (
                      <tr key={rule.id}>
                        <td>
                          <div className="rule-title-cell">
                            <span
                              className="color-dot"
                              style={{ backgroundColor: rule.bgColor }}
                            />
                            <strong>{rule.title}</strong>
                          </div>
                          {rule.subtitle && (
                            <div className="rule-subtitle">{rule.subtitle}</div>
                          )}
                        </td>
                        <td>
                          {rule.triggerType === 'dwell' ? '停留时间' : '滚动深度'}
                        </td>
                        <td>
                          {rule.triggerValue}
                          {rule.triggerType === 'dwell' ? ' 秒' : '%'}
                        </td>
                        <td>{rule.maxDailyShows} 次</td>
                        <td>
                          <span
                            className="color-chip"
                            style={{ backgroundColor: rule.bgColor }}
                          >
                            {rule.bgColor}
                          </span>
                        </td>
                        <td>
                          <button
                            className="action-btn edit"
                            onClick={() => handleEdit(rule)}
                          >
                            编辑
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDelete(rule.id)}
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="content-section">
            <h1 className="page-title">今日数据概览</h1>
            <p className="page-subtitle">数据每小时缓存 5 分钟</p>

            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-label">展示总数</div>
                <div className="stat-value impressions">
                  {stats?.totalImpressions ?? 0}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">点击总数</div>
                <div className="stat-value clicks">{stats?.totalClicks ?? 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">点击率</div>
                <div className="stat-value rate">
                  {stats?.clickRate?.toFixed(1) ?? '0.0'}%
                </div>
              </div>
            </div>

            <h2 className="section-title">按规则分组</h2>
            <div className="table-wrapper">
              <table className="rules-table">
                <thead>
                  <tr>
                    <th>弹窗规则</th>
                    <th>展示次数</th>
                    <th>点击次数</th>
                    <th>点击率</th>
                  </tr>
                </thead>
                <tbody>
                  {!stats || stats.byRule.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-row">
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    stats.byRule.map((item) => {
                      const rate =
                        item.impressions > 0
                          ? ((item.clicks / item.impressions) * 100).toFixed(1)
                          : '0.0';
                      return (
                        <tr key={item.ruleId}>
                          <td>
                            <strong>{item.ruleTitle}</strong>
                          </td>
                          <td>{item.impressions}</td>
                          <td>{item.clicks}</td>
                          <td>{rate}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .admin-layout {
          display: flex;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .hamburger-btn {
          display: none;
          position: fixed;
          top: 16px;
          left: 16px;
          z-index: 1001;
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 8px;
          background: #1e1e2f;
          cursor: pointer;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 0;
        }

        .hamburger-btn span {
          display: block;
          width: 20px;
          height: 2px;
          background: #e0e0e0;
          border-radius: 1px;
        }

        .admin-sidebar {
          width: 220px;
          background: #1e1e2f;
          color: #e0e0e0;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 1000;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .logo-badge {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: linear-gradient(135deg, #6c63ff, #a594ff);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #fff;
          font-size: 18px;
        }

        .logo-text {
          font-size: 16px;
          font-weight: 600;
        }

        .sidebar-nav {
          flex: 1;
          padding: 12px 0;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          cursor: pointer;
          position: relative;
          transition: background 0.2s ease;
          font-size: 14px;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .nav-item.active {
          background: rgba(108, 99, 255, 0.1);
          color: #fff;
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: #6c63ff;
        }

        .nav-icon {
          font-size: 16px;
        }

        .mobile-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
        }

        .admin-content {
          flex: 1;
          margin-left: 220px;
          padding: 32px;
          background: #f5f6fa;
        }

        .content-section {
          max-width: 960px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 8px 0;
        }

        .page-subtitle {
          color: #888;
          margin: 0 0 24px 0;
          font-size: 14px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 32px 0 16px 0;
        }

        .rule-form {
          background: #fff;
          border-radius: 12px;
          padding: 28px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
        }

        .form-label {
          font-size: 13px;
          font-weight: 500;
          color: #333;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .tooltip-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #e0e0e0;
          color: #666;
          font-size: 11px;
          cursor: help;
          position: relative;
        }

        .tooltip {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%) translateY(-100%);
          background: #fff9c4;
          border: 1px dashed #d4c870;
          color: #6b5e1f;
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          z-index: 10;
          pointer-events: none;
        }

        .form-input,
        .form-select {
          height: 40px;
          padding: 0 12px;
          border: 1px solid #dcdfe6;
          border-radius: 8px;
          font-size: 14px;
          background: #fff;
          transition: border-color 0.2s ease;
        }

        .form-input:focus,
        .form-select:focus {
          outline: none;
          border-color: #6c63ff;
        }

        .field-suffix {
          position: absolute;
          right: 12px;
          bottom: 10px;
          color: #999;
          font-size: 13px;
          pointer-events: none;
        }

        .form-field:has(.field-suffix) .form-input {
          padding-right: 40px;
        }

        .color-picker-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .color-input {
          width: 44px;
          height: 40px;
          border: 1px solid #dcdfe6;
          border-radius: 8px;
          cursor: pointer;
          background: none;
          padding: 2px;
        }

        .color-input::-webkit-color-swatch-wrapper {
          padding: 0;
        }

        .color-input::-webkit-color-swatch {
          border: none;
          border-radius: 6px;
        }

        .color-hex {
          font-size: 13px;
          color: #666;
          font-family: monospace;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 28px;
        }

        .submit-btn {
          padding: 12px 32px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #6c63ff, #a594ff);
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: filter 0.2s ease, transform 0.1s ease;
        }

        .submit-btn:hover:not(:disabled) {
          filter: brightness(1.1);
        }

        .submit-btn:active:not(:disabled) {
          transform: scale(0.96);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cancel-btn {
          padding: 12px 24px;
          border: 1px solid #dcdfe6;
          border-radius: 8px;
          background: #fff;
          color: #666;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .cancel-btn:hover {
          background: #f5f6fa;
        }

        .table-wrapper {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          overflow-x: auto;
        }

        .rules-table {
          width: 100%;
          border-collapse: collapse;
        }

        .rules-table th,
        .rules-table td {
          padding: 14px 16px;
          text-align: left;
          border-bottom: 1px solid #f0f0f0;
          font-size: 14px;
        }

        .rules-table th {
          background: #fafafa;
          font-weight: 600;
          color: #555;
          font-size: 13px;
        }

        .rules-table tr:last-child td {
          border-bottom: none;
        }

        .empty-row {
          text-align: center;
          color: #999;
          padding: 32px 16px !important;
        }

        .rule-title-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .rule-subtitle {
          color: #999;
          font-size: 12px;
          margin-top: 2px;
          margin-left: 22px;
        }

        .color-chip {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-family: monospace;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .action-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          margin-right: 8px;
          transition: opacity 0.2s ease;
        }

        .action-btn.edit {
          background: #e8f0fe;
          color: #4a90d9;
        }

        .action-btn.delete {
          background: #fef0f0;
          color: #e74c3c;
        }

        .action-btn:hover {
          opacity: 0.8;
        }

        .stats-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .stat-label {
          font-size: 14px;
          color: #888;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
        }

        .stat-value.impressions {
          color: #6c63ff;
        }

        .stat-value.clicks {
          color: #4a90d9;
        }

        .stat-value.rate {
          color: #52c41a;
        }

        @media (max-width: 480px) {
          .hamburger-btn {
            display: flex;
          }

          .admin-sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }

          .admin-sidebar.open {
            transform: translateX(0);
          }

          .mobile-overlay.open {
            display: block;
          }

          .admin-content {
            margin-left: 0;
            padding: 64px 16px 16px 16px;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .rule-form {
            padding: 20px;
          }

          .stats-cards {
            grid-template-columns: 1fr;
          }

          .page-title {
            font-size: 20px;
          }

          .mobile-overlay {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}

export default AdminPage;
