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
      {products.map(p => {
        const lowStock = p.stock < 5;
        const icon = categoryIcons[p.category] || '📦';
        return (
          <div
            key={p.id}
            className={`product-card ${lowStock ? 'low-stock' : ''}`}
            onClick={() => !lowStock || p.stock > 0 ? onProductClick(p) : null}
          >
            <div className="stock-indicator" />
            <div className={`stock-dot ${lowStock ? 'red' : 'green'}`} />
            <div className="product-icon">{icon}</div>
            <div className="product-name">{p.name}</div>
            <div className="product-category">{p.category}</div>
            <div className="product-price">¥{p.price.toFixed(2)}</div>
            <div className="product-stock">库存：{p.stock}</div>
            {isAdmin && (
              <div className="admin-stock-row" onClick={e => e.stopPropagation()}>
                <input
                  type="number"
                  className="stock-input"
                  value={p.stock}
                  min={0}
                  onChange={e => onUpdateStock(p.id, Math.max(0, Number(e.target.value)))}
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
