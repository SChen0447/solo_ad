import { useState, useMemo } from 'react';
import { Transaction, api } from '../../utils/api';
import { useFinance } from '../../App';
import AddTransactionForm from './AddTransactionForm';

function TransactionList() {
  const { transactions, categories, refreshData } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [visibleCount, setVisibleCount] = useState(50);

  const getEmoji = (key: string, type: 'income' | 'expense') => {
    const list = type === 'income' ? categories.income : categories.expense;
    const found = list.find((c) => c.key === key);
    return found?.emoji || '📦';
  };

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (filterCategory !== 'all') {
      list = list.filter((t) => t.category === filterCategory);
    }
    if (filterType !== 'all') {
      list = list.filter((t) => t.type === filterType);
    }
    switch (sortBy) {
      case 'date_desc':
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'date_asc':
        list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'amount_desc':
        list.sort((a, b) => b.amount - a.amount);
        break;
      case 'amount_asc':
        list.sort((a, b) => a.amount - b.amount);
        break;
    }
    return list;
  }, [transactions, filterCategory, filterType, sortBy]);

  const displayed = filtered.slice(0, visibleCount);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
      if (visibleCount < filtered.length) {
        setVisibleCount((prev) => Math.min(prev + 50, filtered.length));
      }
    }
  };

  const handleEdit = (t: Transaction) => {
    setEditing(t);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      await api.deleteTransaction(id);
      await refreshData();
    }
  };

  const openAddForm = () => {
    setEditing(null);
    setShowForm(true);
  };

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [transactions]);

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>交易记录</h2>
          <button className="btn btn-primary" onClick={openAddForm}>
            ➕ 新增记录
          </button>
        </div>

        <div className="filter-row">
          <div className="form-group">
            <label className="form-label">类型</label>
            <select
              className="form-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">全部</option>
              <option value="income">📈 收入</option>
              <option value="expense">📉 支出</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">类别</label>
            <select
              className="form-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">全部类别</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">排序</label>
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date_desc">日期 ↓</option>
              <option value="date_asc">日期 ↑</option>
              <option value="amount_desc">金额 ↓</option>
              <option value="amount_asc">金额 ↑</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div>暂无交易记录</div>
          </div>
        ) : (
          <div className="transaction-list" onScroll={handleScroll}>
            {displayed.map((t) => (
              <div className="transaction-item" key={t.id}>
                <div className={`transaction-icon ${t.type}`}>
                  {getEmoji(t.category, t.type)}
                </div>
                <div className="transaction-info">
                  <div className="transaction-category">{t.category}</div>
                  <div className="transaction-note">{t.note || '无备注'}</div>
                </div>
                <div className="transaction-date">{t.date}</div>
                <div className={`transaction-amount ${t.type}`}>
                  {t.type === 'income' ? '+' : '-'}¥{t.amount.toLocaleString()}
                </div>
                <div className="transaction-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(t)}>
                    ✏️ 编辑
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>
                    🗑️ 删除
                  </button>
                </div>
              </div>
            ))}
            {visibleCount < filtered.length && (
              <div style={{ textAlign: 'center', padding: 16, color: '#94a3b8', fontSize: 13 }}>
                加载中... 已显示 {visibleCount} / {filtered.length} 条
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <AddTransactionForm
          editing={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

export default TransactionList;
