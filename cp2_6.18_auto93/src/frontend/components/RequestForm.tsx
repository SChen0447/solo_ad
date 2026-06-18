import React, { useState, useMemo } from 'react';
import { createRequest } from '../Api';
import { Item } from '../../backend/types';

interface RequestFormProps {
  onSuccess: () => void;
  onShowToast: (type: 'success' | 'error', message: string) => void;
}

const createEmptyItem = (): Item => ({
  name: '',
  quantity: 1,
  unitPrice: 0,
});

const RequestForm: React.FC<RequestFormProps> = ({ onSuccess, onShowToast }) => {
  const [title, setTitle] = useState('');
  const [applicant, setApplicant] = useState('');
  const [items, setItems] = useState<Item[]>([createEmptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = isNaN(item.quantity) ? 0 : item.quantity;
      const price = isNaN(item.unitPrice) ? 0 : item.unitPrice;
      return sum + qty * price;
    }, 0);
  }, [items]);

  const handleAddItem = () => {
    setItems([...items, createEmptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof Item, value: string) => {
    const newItems = [...items];
    if (field === 'name') {
      newItems[index] = { ...newItems[index], name: value };
    } else {
      const numValue = parseFloat(value) || 0;
      newItems[index] = { ...newItems[index], [field]: numValue };
    }
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter((item) => item.name.trim() !== '' && item.quantity > 0);
    if (!title.trim()) {
      onShowToast('error', '请填写申购标题');
      return;
    }
    if (!applicant.trim()) {
      onShowToast('error', '请填写申请人');
      return;
    }
    if (validItems.length === 0) {
      onShowToast('error', '请至少添加一个有效物品');
      return;
    }

    setSubmitting(true);
    try {
      await createRequest({
        title: title.trim(),
        applicant: applicant.trim(),
        items: validItems,
      });
      onShowToast('success', '申购单提交成功！');
      onSuccess();
    } catch {
      onShowToast('error', '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <h2 className="page-title" style={{ marginBottom: 24 }}>
        新建申购单
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">申购标题</label>
          <input
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：2024年Q1部门办公用品采购"
          />
        </div>
        <div className="form-group">
          <label className="form-label">申请人</label>
          <input
            type="text"
            className="form-input"
            value={applicant}
            onChange={(e) => setApplicant(e.target.value)}
            placeholder="请输入您的姓名"
          />
        </div>

        <div className="form-group">
          <label className="form-label">物品清单</label>
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>物品名称</th>
                <th style={{ width: '20%' }}>数量</th>
                <th style={{ width: '20%' }}>单价 (元)</th>
                <th style={{ width: '10%' }}>小计</th>
                <th style={{ width: '10%' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      placeholder="例如：A4打印纸"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={item.quantity || ''}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice || ''}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                    />
                  </td>
                  <td style={{ color: '#374151', fontWeight: 500 }}>
                    ¥{(item.quantity * item.unitPrice).toFixed(2)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="remove-item-btn"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length === 1}
                      style={items.length === 1 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="add-item-btn" onClick={handleAddItem}>
            + 添加物品
          </button>
        </div>

        <div className="total-section">
          <span className="total-label">总金额：</span>
          <span className="total-amount" key={total}>
            ¥{total.toFixed(2)}
          </span>
        </div>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? '提交中...' : '提交申购单'}
        </button>
      </form>
    </div>
  );
};

export default RequestForm;
