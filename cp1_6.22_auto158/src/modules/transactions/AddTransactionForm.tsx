import { useState, useEffect } from 'react';
import { Transaction, api, CategoryItem } from '../utils/api';
import { useFinance } from '../App';

interface Props {
  editing?: Transaction | null;
  onClose: () => void;
}

function AddTransactionForm({ editing, onClose }: Props) {
  const { categories, refreshData } = useFinance();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setDate(editing.date);
      setNote(editing.note);
    } else {
      setType('expense');
      setAmount('');
      setCategory('');
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
    }
  }, [editing]);

  const currentCategories: CategoryItem[] = type === 'income' ? categories.income : categories.expense;

  useEffect(() => {
    if (currentCategories.length > 0 && !currentCategories.find((c) => c.key === category)) {
      setCategory(currentCategories[0].key);
    }
  }, [type, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date) return;

    const payload = {
      type,
      amount: Number(amount),
      category,
      date,
      note,
    };

    if (editing) {
      await api.updateTransaction(editing.id, payload);
    } else {
      await api.addTransaction(payload);
    }

    await refreshData();
    onClose();
  };

  const getEmoji = (key: string) => {
    const found = currentCategories.find((c) => c.key === key);
    return found?.emoji || '📦';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editing ? '编辑交易' : '新增交易'}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="type-toggle">
          <button
            type="button"
            className={`type-toggle-btn income ${type === 'income' ? 'active' : ''}`}
            onClick={() => setType('income')}
          >
            📈 收入
          </button>
          <button
            type="button"
            className={`type-toggle-btn expense ${type === 'expense' ? 'active' : ''}`}
            onClick={() => setType('expense')}
          >
            📉 支出
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">金额 (¥)</label>
            <input
              type="number"
              className="form-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="请输入金额"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">类别</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {currentCategories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.emoji} {c.key}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">日期</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">备注</label>
            <textarea
              className="form-textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="选填"
              rows={3}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {editing ? '保存修改' : `确认${getEmoji(category)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTransactionForm;
