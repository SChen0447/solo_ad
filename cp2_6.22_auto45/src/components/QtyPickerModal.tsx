/**
 * QtyPickerModal 数量选择浮层组件
 *
 * 数据流向：
 *   ProductList → 父组件 App handleProductClick → 设置 selectedProduct → 本组件显示
 *   ↓
 *   用户调整数量 / 点击确认 → 父组件 onConfirm(product, qty) → 加入购物车
 *   用户点击取消 / 遮罩 → 父组件 onCancel() → 关闭浮层
 *
 * 被 App.tsx import，使用时需挂载到全局 DOM（modal-mask）
 */

import { useState } from 'react';
import type { Product } from '../types';

interface Props {
  product: Product;
  onConfirm: (product: Product, qty: number) => void;
  onCancel: () => void;
}

const QtyPickerModal = ({ product, onConfirm, onCancel }: Props) => {
  const [qty, setQty] = useState(1);
  const maxQty = product.stock;

  const change = (v: number) => setQty(Math.max(1, Math.min(maxQty, v)));

  return (
    <div className="modal-mask" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{product.name}</div>

        <div className="modal-info">
          <div>
            单价：<b>¥{product.price.toFixed(2)}</b>
          </div>
          <div>
            库存：<b>{product.stock}</b> 件
          </div>
        </div>

        <div className="modal-qty">
          <button
            className="qty-btn"
            onClick={() => change(qty - 1)}
            disabled={qty <= 1}
          >
            −
          </button>
          <input
            type="number"
            className="qty-input"
            min={1}
            max={maxQty}
            value={qty}
            onChange={(e) => change(Number(e.target.value))}
          />
          <button
            className="qty-btn"
            onClick={() => change(qty + 1)}
            disabled={qty >= maxQty}
          >
            +
          </button>
        </div>

        <div className="modal-subtotal">
          小计：<b>¥{(product.price * qty).toFixed(2)}</b>
        </div>

        <div className="modal-actions">
          <button className="btn-default" onClick={onCancel}>
            取消
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              if (qty > 0 && qty <= maxQty) onConfirm(product, qty);
            }}
          >
            加入购物车
          </button>
        </div>
      </div>
    </div>
  );
};

export default QtyPickerModal;
