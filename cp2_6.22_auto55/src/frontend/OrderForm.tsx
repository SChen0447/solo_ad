import { useState, useMemo } from 'react';
import type { RentalItem } from '@/types';
import './styles/OrderForm.css';

interface OrderFormProps {
  items: RentalItem[];
  onOrderCreated: () => void;
}

interface OrderItemInput {
  itemId: string;
  quantity: number;
}

function OrderForm({ items, onOrderCreated }: OrderFormProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [rentalDays, setRentalDays] = useState(1);
  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const availableItems = useMemo(() => {
    return items.filter((item) => {
      const available = item.totalStock - item.rentedCount;
      return available > 0;
    });
  }, [items]);

  const addOrderItem = () => {
    if (availableItems.length === 0) return;
    const firstAvailable = availableItems[0];
    setOrderItems([...orderItems, { itemId: firstAvailable.id, quantity: 1 }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: 'itemId' | 'quantity', value: string | number) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setOrderItems(newItems);
  };

  const getItemAvailable = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return 0;
    return item.totalStock - item.rentedCount;
  };

  const hasStockError = useMemo(() => {
    for (const oi of orderItems) {
      const available = getItemAvailable(oi.itemId);
      if (oi.quantity > available) {
        return true;
      }
    }
    return false;
  }, [orderItems, items]);

  const totalPrice = useMemo(() => {
    let total = 0;
    for (const oi of orderItems) {
      const item = items.find((i) => i.id === oi.itemId);
      if (item) {
        total += item.pricePerDay * rentalDays * oi.quantity;
      }
    }
    return total;
  }, [orderItems, rentalDays, items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!customerName.trim()) {
      setError('请输入客户姓名');
      return;
    }
    if (!customerPhone.trim()) {
      setError('请输入联系电话');
      return;
    }
    if (orderItems.length === 0) {
      setError('请至少选择一个租赁物品');
      return;
    }
    if (hasStockError) {
      setError('库存不足，请调整数量');
      return;
    }

    const itemIds: string[] = [];
    for (const oi of orderItems) {
      for (let i = 0; i < oi.quantity; i++) {
        itemIds.push(oi.itemId);
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          itemIds,
          rentalDays,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '下单失败');
      }

      setSuccessMsg('订单提交成功，等待管理员审核');
      setCustomerName('');
      setCustomerPhone('');
      setRentalDays(1);
      setOrderItems([]);
      onOrderCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '下单失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="order-form-page fade-in">
      <h1 className="page-title">客户下单</h1>
      <p className="page-subtitle">填写租赁信息，提交订单后等待管理员审核</p>

      <form className="order-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3 className="section-title">客户信息</h3>
          <div className="form-row">
            <div className="form-group">
              <label>客户姓名</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="请输入客户姓名"
              />
            </div>
            <div className="form-group">
              <label>联系电话</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="请输入联系电话"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="section-title">租赁信息</h3>
          <div className="form-row">
            <div className="form-group">
              <label>租赁天数</label>
              <input
                type="number"
                min="1"
                max="90"
                step="1"
                value={rentalDays}
                onChange={(e) => setRentalDays(Math.min(90, Math.max(1, parseInt(e.target.value) || 1)))}
              />
              <span className="input-hint">1-90天</span>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3 className="section-title">租赁物品</h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={addOrderItem}
              disabled={availableItems.length === 0}
            >
              + 添加物品
            </button>
          </div>

          {orderItems.length === 0 && (
            <p className="empty-tip">暂无物品，点击上方按钮添加租赁物品</p>
          )}

          <div className="order-items-list">
            {orderItems.map((oi, index) => {
              const item = items.find((i) => i.id === oi.itemId);
              const available = getItemAvailable(oi.itemId);
              const isOverStock = oi.quantity > available;

              return (
                <div key={index} className={`order-item-row ${isOverStock ? 'error' : ''}`}>
                  <div className="item-select-wrap">
                    <label>物品选择</label>
                    <select
                      value={oi.itemId}
                      onChange={(e) => updateOrderItem(index, 'itemId', e.target.value)}
                    >
                      {items.map((it) => {
                        const avail = it.totalStock - it.rentedCount;
                        return (
                          <option key={it.id} value={it.id} disabled={avail === 0}>
                            {it.name} (¥{it.pricePerDay}/天，可用{avail}件)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="item-quantity-wrap">
                    <label>数量</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      step="1"
                      value={oi.quantity}
                      onChange={(e) =>
                        updateOrderItem(
                          index,
                          'quantity',
                          Math.min(50, Math.max(1, parseInt(e.target.value) || 1))
                        )
                      }
                    />
                    {isOverStock && (
                      <span className="stock-error">库存不足，最多可租{available}件</span>
                    )}
                  </div>
                  <div className="item-price-wrap">
                    <label>小计</label>
                    <span className="item-price">
                      ¥{item ? item.pricePerDay * rentalDays * oi.quantity : 0}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeOrderItem(index)}
                    aria-label="删除"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="form-footer">
          <div className="total-price">
            订单总价：<span>¥{totalPrice}</span>
          </div>
          {error && <div className="form-error">{error}</div>}
          {successMsg && <div className="form-success">{successMsg}</div>}
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={submitting || hasStockError || orderItems.length === 0}
          >
            {submitting ? '提交中...' : '提交订单'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default OrderForm;
