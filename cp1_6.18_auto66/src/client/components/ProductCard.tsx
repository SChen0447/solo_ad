import { Link } from 'react-router-dom';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

const categoryLabels: Record<string, string> = {
  ebook: '电子书',
  course: '课程码',
  software: '软件激活码',
  other: '其他'
};

const categoryColors: Record<string, string> = {
  ebook: '#3498db',
  course: '#9b59b6',
  software: '#1abc9c',
  other: '#95a5a6'
};

export const ProductCard = ({ product }: ProductCardProps) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ebook': return '📚';
      case 'course': return '🎓';
      case 'software': return '💻';
      default: return '📦';
    }
  };

  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <div className="product-card-image">
        <span className="product-icon">{getCategoryIcon(product.category)}</span>
        <span
          className="product-category-badge"
          style={{ backgroundColor: categoryColors[product.category] }}
        >
          {categoryLabels[product.category]}
        </span>
        {product.negotiable && (
          <span className="product-negotiable-badge">可议价</span>
        )}
      </div>
      <div className="product-card-content">
        <h3 className="product-card-title">{product.title}</h3>
        <p className="product-card-desc">
          {product.description.length > 50
            ? product.description.substring(0, 50) + '...'
            : product.description}
        </p>
        {product.seller && (
          <div className="product-seller-info">
            <img src={product.seller.avatar} alt="" className="seller-avatar-small" />
            <span className="seller-name-small">{product.seller.username}</span>
            <span className="seller-rating">⭐ {product.seller.creditScore}</span>
          </div>
        )}
        <div className="product-card-footer">
          <span className="product-price">¥{product.price}</span>
          <span className="product-stock">库存: {product.stock}</span>
        </div>
      </div>
    </Link>
  );
};
