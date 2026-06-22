/**
 * ProductList 商品列表组件（卡片网格）
 *
 * 数据流向 / 调用关系：
 *   ↓ 输入（来自父组件 App.tsx props）：
 *     products: Product[]       —  商品数组，来自 GET /api/products
 *     onProductClick: callback  —  点击商品卡片 → 冒泡到 App → 打开 QtyPickerModal
 *     isAdmin: boolean          —  是否显示库存调整输入框
 *     onUpdateStock: callback   —  管理员调整库存 → PUT /api/products/:id
 *
 *   ↑ 输出（向上冒泡）：
 *     onProductClick(product)   →  App.selectedProduct = product → QtyPickerModal 显示
 *     onUpdateStock(id, stock)  →  App.updateStock() → fetch PUT → 数据刷新
 *
 * 用户交互流程：
 *   鼠标点击商品卡片 → 判断库存 > 0 → 调用 onProductClick → 父组件弹数量浮层
 *   低库存（<5）：红圆点 + 轻微闪烁动画；库存充足：绿圆点
 */

import type { Product } from '../types';

interface Props {
  products: Product[];
  onProductClick: (p: Product) => void;
  isAdmin: boolean;
  onUpdateStock: (id: string, stock: number) => void;
}

const categoryIcons: Record<string, string> = {
  '水果': '🍎',
  '零食': '🍿',
  '日用品': '🧻',
  '食品': '🥚',
};

const ProductList = ({ products, onProductClick, isAdmin, onUpdateStock }: Props) => {
  return (
    <div className="product-grid">
      {products.map((p) => {
        const lowStock = p.stock > 0 && p.stock < 5;
        const outOfStock = p.stock === 0;
        const icon = categoryIcons[p.category] || '📦';

        return (
          <div
            key={p.id}
            className={`product-card ${lowStock ? 'low-stock' : ''} ${outOfStock ? 'out-of-stock' : ''}`}
            onClick={() => !outOfStock && onProductClick(p)}
            style={{ cursor: outOfStock ? 'not-allowed' : 'pointer' }}
          >
            {/* 底部橙棕色色条（通过 ::after 实现） */}
            <div className="stock-indicator" />

            {/* 右下角库存状态圆点：绿/红 */}
            <div className={`stock-dot ${outOfStock ? 'gray' : lowStock ? 'red' : 'green'}`} title={outOfStock ? '售罄' : lowStock ? '即将售罄' : '库存充足'} />

            {outOfStock && <div className="sold-out-badge">售罄</div>}

            {/* 分类图标 */}
            <div className="product-icon">{icon}</div>

            {/* 商品名称 */}
            <div className="product-name">{p.name}</div>

            {/* 分类标签 */}
            <div className="product-category">{p.category}</div>

            {/* 价格 */}
            <div className="product-price">¥{p.price.toFixed(2)}</div>

            {/* 库存数 */}
            <div className={`product-stock ${lowStock ? 'text-danger' : ''}`}>
              库存：{p.stock}
              {lowStock && p.stock > 0 && ' ⚠️'}
            </div>

            {/* 管理员：库存调整输入框 */}
            {isAdmin && (
              <div className="admin-stock-row" onClick={(e) => e.stopPropagation()}>
                <label className="stock-label">📝 调整库存</label>
                <input
                  type="number"
                  className="stock-input"
                  value={p.stock}
                  min={0}
                  onChange={(e) => onUpdateStock(p.id, Math.max(0, Number(e.target.value)))}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProductList;
