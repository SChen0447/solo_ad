import { useState, useEffect, useRef } from 'react';
import { createRequest } from '../Api';

interface FormItem {
  id: string;
  name: string;
  quantity: string;
  unitPrice: string;
}

interface RequestFormPageProps {
  currentUser: string | null;
  onNavigate: (page: string) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function RequestFormPage({
  currentUser,
  onNavigate,
  onSuccess,
  onError,
}: RequestFormPageProps) {
  const [title, setTitle] = useState('');
  const [applicant, setApplicant] = useState(currentUser || '');
  const [items, setItems] = useState<FormItem[]>([
    { id: '1', name: '', quantity: '', unitPrice: '' },
  ]);
  const [isAmountFading, setIsAmountFading] = useState(false);
  const prevTotalRef = useRef<number>(0);

  useEffect(() => {
    if (currentUser) {
      setApplicant(currentUser);
    }
  }, [currentUser]);

  const calculateTotal = (): number => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  };

  const total = calculateTotal();

  useEffect(() => {
    if (prevTotalRef.current !== total && prevTotalRef.current !== 0) {
      setIsAmountFading(true);
      const timer = setTimeout(() => setIsAmountFading(false), 300);
      return () => clearTimeout(timer);
    }
    prevTotalRef.current = total;
  }, [total]);

  const addItemRow = () => {
    setItems([...items, { id: Date.now().toString(), name: '', quantity: '', unitPrice: '' }]);
  };

  const removeItemRow = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof FormItem, value: string) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      onError('请填写申购标题');
      return;
    }
    if (!applicant.trim()) {
      onError('请填写申请人');
      return;
    }

    const validItems = items.filter(
      (item) => item.name.trim() && item.quantity && item.unitPrice
    );

    if (validItems.length === 0) {
      onError('请至少填写一项完整的物品信息');
      return;
    }

    try {
      await createRequest({
        title: title.trim(),
        applicant: applicant.trim(),
        items: validItems.map((item) => ({
          name: item.name.trim(),
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
        })),
      });
      onSuccess('申购单提交成功！');
      onNavigate('list');
    } catch (err) {
      onError(err instanceof Error ? err.message : '提交失败');
    }
  };

  const handleReset = () => {
    setTitle('');
    setItems([{ id: '1', name: '', quantity: '', unitPrice: '' }]);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">新建申购单</h1>
      </div>

      <form className="form-container" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">申购标题</label>
          <input
            className="form-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：Q3季度办公文具采购"
          />
        </div>

        <div className="form-group">
          <label className="form-label">申请人</label>
          <input
            className="form-input"
            type="text"
            value={applicant}
            onChange={(e) => setApplicant(e.target.value)}
            placeholder="请输入申请人姓名"
          />
        </div>

        <div className="form-group">
          <label className="form-label">物品清单</label>
          {items.map((item, index) => (
            <div key={item.id} className="item-row">
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  物品名 {index + 1}
                </label>
                <input
                  className="form-input"
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                  placeholder="如：A4打印纸"
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  数量
                </label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  单价(元)
                </label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => removeItemRow(item.id)}
                disabled={items.length === 1}
                style={{ opacity: items.length === 1 ? 0.5 : 1 }}
              >
                删除
              </button>
            </div>
          ))}
          <button type="button" className="btn-add" onClick={addItemRow}>
            + 添加物品
          </button>
        </div>

        <div className="total-section">
          <span className="total-label">总金额：</span>
          <span className={`total-amount ${isAmountFading ? 'fading' : ''}`}>
            ¥{total.toFixed(2)}
          </span>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-outline"
            style={{ color: '#374151', borderColor: '#d1d5db' }}
            onClick={handleReset}
          >
            重置
          </button>
          <button type="submit" className="btn btn-primary">
            提交申购
          </button>
        </div>
      </form>
    </div>
  );
}
