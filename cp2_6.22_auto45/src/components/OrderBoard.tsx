/**
 * OrderBoard 当前用户的订单列表组件
 *
 * 数据流向：
 *   父组件 App → props.orders (GET /api/orders?userId=xxx) → 本组件渲染
 *   点击取消订单 → onCancel(orderId) → App → DELETE /api/orders/:id
 *   修改订单项数量 → onModify(orderId, items) → App → PUT /api/orders/:id
 *
 * 依赖：types.ts (Order, Product)
 */

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

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const changeQty = (
    orderId: string,
    productId: string,
    items: Order['items'],
    newQty: number,
  ) => {
    const product = products.find((p) => p.id === productId);
    const maxStock = product?.stock ?? 999;
    const qty = Math.max(1, Math.min(newQty, maxStock));
    const newItems = items.map((it) =>
      it.productId === productId ? { ...it, quantity: qty } : it,
    );
    onModify(
      orderId,
      newItems.map((it) => ({ productId: it.productId, quantity: it.quantity })),
    );
  };

  if (orders.length === 0) {
    return <div className="empty-tip">暂无订单记录<br/>提交订单后会显示在这里</div>;
  }

  return (
    <div className="order-list">
      {orders.map((o) => {
        const expanded = expandedId === o.id;
        return (
          <div key={o.id} className="order-card">
            {/* 订单概要行：日期 / 金额 / 展开按钮 / 取消按钮 */}
            <div className="order-card-header" onClick={() => toggle(o.id)}>
              <div>
                <div className="order-date">
                  {new Date(o.createdAt).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="order-sum">
                  共 {o.items.length} 种商品 · <b>¥{o.totalAmount.toFixed(2)}</b>
                </div>
              </div>
              <div className="order-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn-danger-sm"
                  title="取消订单"
                  style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }}
                  onClick={() => onCancel(o.id)}
                >
                  取消订单
                </button>
                <span className="expand-icon">{expanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* 展开：订单项明细，支持修改数量 */}
            {expanded && (
              <div className="order-items-list">
                {o.items.map((it) => (
                  <div key={it.productId} className="order-item-row">
                    <div className="order-item-name">{it.productName}</div>
                    <div className="order-item-qty">
                      <button
                        className="qty-btn-sm"
                        onClick={() => changeQty(o.id, it.productId, o.items, it.quantity - 1)}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        className="qty-input-sm"
                        min={1}
                        value={it.quantity}
                        onChange={(e) =>
                          changeQty(o.id, it.productId, o.items, Number(e.target.value))
                        }
                      />
                      <button
                        className="qty-btn-sm"
                        onClick={() => changeQty(o.id, it.productId, o.items, it.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="order-item-subtotal">
                      ¥{(it.unitPrice * it.quantity).toFixed(2)}
                    </div>
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
