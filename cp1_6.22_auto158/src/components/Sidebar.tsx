import { NavLink } from 'react-router-dom';
import { useMemo } from 'react';
import { useFinance } from '../App';

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(
    new Date(year, month + 1, 0).getDate()
  ).padStart(2, '0')}`;
  return { firstDay, lastDay, monthLabel: `${year}年${month + 1}月` };
}

function Sidebar() {
  const { transactions } = useFinance();
  const { firstDay, lastDay, monthLabel } = useMemo(() => getCurrentMonthRange(), []);

  const { income, expense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of transactions) {
      if (t.date >= firstDay && t.date <= lastDay) {
        if (t.type === 'income') inc += t.amount;
        else exp += t.amount;
      }
    }
    return { income: inc, expense: exp };
  }, [transactions, firstDay, lastDay]);

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-header-icon">💰</span>
          <h1>家庭财务</h1>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-link-icon">📝</span>
            <span>交易记录</span>
          </NavLink>
          <NavLink to="/budget" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-link-icon">📊</span>
            <span>预算管理</span>
          </NavLink>
          <NavLink to="/analysis" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-link-icon">💡</span>
            <span>健康分析</span>
          </NavLink>
        </nav>
        <div className="sidebar-overview">
          <div className="sidebar-overview-title">{monthLabel} 概览</div>
          <div className="overview-item">
            <span className="overview-item-label">📈 收入</span>
            <span className="overview-item-value income">¥{income.toLocaleString()}</span>
          </div>
          <div className="overview-divider" />
          <div className="overview-item">
            <span className="overview-item-label">📉 支出</span>
            <span className="overview-item-value expense">¥{expense.toLocaleString()}</span>
          </div>
          <div className="overview-divider" />
          <div className="overview-item">
            <span className="overview-item-label">💵 结余</span>
            <span className={`overview-item-value ${income - expense >= 0 ? 'income' : 'expense'}`}>
              ¥{(income - expense).toLocaleString()}
            </span>
          </div>
        </div>
      </aside>

      <div className="mobile-nav-bar">
        <NavLink to="/" className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}>
          <span className="mobile-nav-icon">📝</span>
          <span>记录</span>
        </NavLink>
        <NavLink to="/budget" className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}>
          <span className="mobile-nav-icon">📊</span>
          <span>预算</span>
        </NavLink>
        <NavLink to="/analysis" className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}>
          <span className="mobile-nav-icon">💡</span>
          <span>分析</span>
        </NavLink>
      </div>
    </>
  );
}

export default Sidebar;
