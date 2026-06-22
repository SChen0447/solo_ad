/**
 * CartPanel 购物车面板组件
 *
 * 数据流向：
 *   父组件 App.tsx 通过 props 传入 cartItems / onUpdateQty / onRemove / onSubmit
 *   ↓
 *   用户在本组件内修改数量 → 调用 onUpdateQty → App 更新 cart 状态 → 重新渲染
 *   用户移除商品 → 调用 onRemove → App 从 cart 中移除 → 重新渲染
 *   用户提交订单 → 调用 onSubmit → App 发起 POST /api/orders → 清空购物车
 *
 * 与其他文件的调用关系：
 *   - 被 App.tsx import 并渲染在左侧面板
 *   - 使用 types.ts 中定义的 CartItem 接口
 */

import type { CartItem } from '../types';

interface Props {
  cartItems: CartItem[];
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onSubmit: () => void;
}

const CartPanel = ({ cartItems, onUpdateQty, onRemove, onSubmit }: Props) => {
  const total = cartItems.reduce((s, c) => s + c.unitPrice * c.quantity, 0);

  return (
    <div className="cart-panel">
      <div className="panel-title">🧺 购物车</div>

      {cartItems.length === 0 ? (
        <div className="empty-tip">
          购物车是空的<br />
          点击中间商品卡片选择数量加入～
        </div>
      ) : (
        <>
          <div className="cart-list">
            {cartItems.map((c) => {
              const subtotal = c.unitPrice * c.quantity;
              return (
                <div key={c.productId} className="cart-item">
                  <div className="cart-item-info">
                    <div className="cart-item-name">{c.productName}</div>
                    <div className="cart-item-price">
                      ¥{c.unitPrice.toFixed(2)} × {c.quantity} ={' '}
                      <b>¥{subtotal.toFixed(2)}</b>
                    </div>
                  </div>
                  <div className="cart-item-actions">
                    <button
                      className="qty-btn-sm"
                      onClick={() => onUpdateQty(c.productId, Math.max(1, c.quantity - 1))}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      className="qty-input-sm"
                      min={1}
                      max={c.stock}
                      value={c.quantity}
                      onChange={(e) => onUpdateQty(c.productId, Number(e.target.value))}
                    />
                    <button
                      className="qty-btn-sm"
                      onClick={() =>
                        onUpdateQty(c.productId, Math.min(c.stock, c.quantity + 1))
                      }
                    >
                      +
                    </button>
                    <button
                      className="btn-danger-sm"
                      title="移除商品"
                      onClick={() => onRemove(c.productId)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-total">
            <span>合计：</span>
            <span className="cart-total-amount">¥{total.toFixed(2)}</span>
          </div>

          <button className="btn-primary btn-submit" onClick={onSubmit}>
            📦 提交订单
          </button>
        </>
      )}
    </div>
  );
};

export default CartPanel;
