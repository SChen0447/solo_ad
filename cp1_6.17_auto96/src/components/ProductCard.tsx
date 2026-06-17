import { useNavigate } from 'react-router-dom';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const thumbnail = product.photos[0];
  const hasDiscount = product.currentPrice < product.originalPrice;

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 4,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 4px 16px rgba(0,0,0,0.12)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 1px 3px rgba(0,0,0,0.08)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '4 / 3',
          backgroundColor: '#f5f5f5',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {thumbnail ? (
          <img
            src={thumbnail.url}
            alt={product.title}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#bfbfbf',
              fontSize: 14,
            }}
          >
            暂无图片
          </div>
        )}
        {product.annotations.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              padding: '2px 8px',
              backgroundColor: 'rgba(24, 144, 255, 0.9)',
              color: '#fff',
              fontSize: 12,
              borderRadius: 4,
            }}
          >
            {product.annotations.length} 标注
          </div>
        )}
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#333',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {product.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: hasDiscount ? '#f5222d' : '#333',
            }}
          >
            ¥{product.currentPrice}
          </span>
          {hasDiscount && (
            <>
              <span
                style={{
                  fontSize: 12,
                  color: '#999',
                  textDecoration: 'line-through',
                }}
              >
                ¥{product.originalPrice}
              </span>
              <span
                style={{
                  fontSize: 11,
                  backgroundColor: '#f6ffed',
                  color: '#52c41a',
                  border: '1px solid #b7eb8f',
                  padding: '0 4px',
                  borderRadius: 4,
                }}
              >
                已降价
              </span>
            </>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#999' }}>
          {new Date(product.createdAt).toLocaleDateString('zh-CN')}
        </div>
      </div>
    </div>
  );
}
