import { useState, useMemo } from 'react';
import { useFinance } from '../../App';
import { Budget, api } from '../../utils/api';

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function BudgetPlan() {
  const { transactions, budgets, categories, refreshData } = useFinance();
  const currentMonth = getCurrentMonth();
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState('');

  const monthlyBudgets = useMemo(() => {
    return budgets.filter((b) => b.month === currentMonth);
  }, [budgets, currentMonth]);

  const categoryExpenses = useMemo(() => {
    const result: Record<string, number> = {};
    const [yearStr, monthStr] = currentMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    for (const t of transactions) {
      const tDate = new Date(t.date);
      if (t.type === 'expense' && tDate.getFullYear() === year && tDate.getMonth() === month) {
        result[t.category] = (result[t.category] || 0) + t.amount;
      }
    }
    return result;
  }, [transactions, currentMonth]);

  const getEmoji = (key: string) => {
    const found = categories.expense.find((c) => c.key === key);
    return found?.emoji || '📦';
  };

  const getProgressClass = (ratio: number) => {
    if (ratio >= 1) return 'danger';
    if (ratio >= 0.8) return 'warning';
    return '';
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudgetId(budget.id);
    setEditLimit(String(budget.limit));
  };

  const handleSave = async (budget: Budget) => {
    const limit = Number(editLimit);
    if (!limit || limit <= 0) return;
    await api.updateBudget(budget.id, limit);
    setEditingBudgetId(null);
    await refreshData();
  };

  const handleAddNewBudget = async () => {
    const existingCategories = new Set(monthlyBudgets.map((b) => b.category));
    for (const cat of categories.expense) {
      if (!existingCategories.has(cat.key)) {
        await api.addBudget({
          category: cat.key,
          limit: 1000,
          month: currentMonth,
        });
      }
    }
    await refreshData();
  };

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            📊 预算管理 - {currentMonth.replace('-', '年')}月
          </h2>
          {monthlyBudgets.length < categories.expense.length && (
            <button className="btn btn-secondary btn-sm" onClick={handleAddNewBudget}>
              ➕ 补充缺失预算
            </button>
          )}
        </div>

        {monthlyBudgets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div>暂无预算计划，点击上方按钮添加</div>
          </div>
        ) : (
          <div>
            {monthlyBudgets.map((budget) => {
              const spent = categoryExpenses[budget.category] || 0;
              const ratio = budget.limit > 0 ? spent / budget.limit : 0;
              const progressPercent = Math.min(ratio * 100, 100);
              const progressClass = getProgressClass(ratio);
              const emoji = getEmoji(budget.category);

              return (
                <div className="budget-item" key={budget.id}>
                  <div className="budget-header">
                    <div className="budget-category">
                      <span style={{ fontSize: 20 }}>{emoji}</span>
                      <span>{budget.category}</span>
                    </div>
                    <div className="budget-amounts">
                      {editingBudgetId === budget.id ? (
                        <>
                          <input
                            type="number"
                            className="budget-edit-input"
                            value={editLimit}
                            onChange={(e) => setEditLimit(e.target.value)}
                            min="0"
                            autoFocus
                          />
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSave(budget)}
                          >
                            ✓ 保存
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditingBudgetId(null)}
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <span>
                            ¥{spent.toLocaleString()} / ¥{budget.limit.toLocaleString()}
                          </span>
                          {ratio >= 1 && <span className="danger-icon">⚠️ 超支</span>}
                          {ratio >= 0.8 && ratio < 1 && <span className="warn-icon">⚡ 预警</span>}
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleEdit(budget)}
                          >
                            ✏️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${progressClass}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#64748b', textAlign: 'right' }}>
                    {ratio < 1
                      ? `剩余 ¥${Math.max(budget.limit - spent, 0).toLocaleString()}`
                      : `超支 ¥${(spent - budget.limit).toLocaleString()}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default BudgetPlan;
