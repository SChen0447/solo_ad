import { useState } from 'react';
import type { Order, Product } from '../types';

interface Props {
  orders: Order[];
  userId: string;
  onCancel: (orderId: string) => void;
  onModify: (orderId: string, items: { productId: string; quantity: number }[]) => void;
  products: Product[];
}

const OrderBoard = ({ orders, onCancel, onModify, products }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const changeItemQty = (orderId: string, productId: string, items: Order['items'], newQty: number) => {
    const product = products.find(p => p.id === productId);
    const maxStock = product?.stock ?? 999;
    const qty = Math.max(1, Math.min(newQty, maxStock));
    const newItems = items.map(it => it.productId === productId ? { ...it, quantity: qty } : it);
    onModify(orderId, newItems.map(it => ({ productId: it.productId, quantity: it.quantity })));
  };

  if (orders.length === 0) {
    return <div className="empty-tip">暂无订单记录</div>;
  }

  return (
    <div className="order-list">
      {orders.map(o => {
        const isExpanded = expandedId === o.id;
        return (
          <div key={o.id} className="order-card">
            <div className="order-card-header" onClick={() => toggleExpand(o.id)}>
              <div>
                <div className="order-date">{new Date(o.createdAt).toLocaleString('zh-CN')}</div>
                <div className="order-sum">共 {o.items.length} 种商品 · ¥{o.totalAmount.toFixed(2)}</div>
              </div>
              <div className="order-actions" onClick={e => e.stopPropagation()}>
                <button className="btn-danger-sm" title="取消订单" onClick={() => onCancel(o.id)}>取消</button>
                <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>
            {isExpanded && (
              <div className="order-items-list">
                {o.items.map(it => (
                  <div key={it.productId} className="order-item-row">
                    <div className="order-item-name">{it.productName}</div>
                    <div className="order-item-qty">
                      <input
                        type="number"
                        className="qty-input-sm"
                        min={1}
                        value={it.quantity}
                        onChange={e => changeItemQty(o.id, it.productId, o.items, Number(e.target.value))}
                      />
                    </div>
                    <div className="order-item-subtotal">¥{it.subtotal.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OrderBoard;
