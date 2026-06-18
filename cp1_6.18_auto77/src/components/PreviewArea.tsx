import { useState, useMemo } from 'react';
import { usePromotionStore } from '../store';
import type { Product, TemplateId } from '../types';
import styles from '../styles/PreviewArea.module.css';

const TEMPLATES: { id: TemplateId; name: string }[] = [
  { id: 'vertical', name: '上下图文型' },
  { id: 'horizontal', name: '左右图文型' },
  { id: 'grid', name: '卡片网格型' },
];

interface ProductCardProps {
  product: Product;
  template: TemplateId;
  discountColor: string;
  onClick: () => void;
}

function ProductCard({ product, template, discountColor, onClick }: ProductCardProps) {
  const cardClass =
    template === 'vertical'
      ? styles.verticalCard
      : template === 'horizontal'
      ? styles.horizontalCard
      : styles.gridCard;

  return (
    <div className={cardClass} onClick={onClick}>
      <img
        src={product.mainImageUrl}
        alt={product.name}
        className={styles.cardImage}
        draggable={false}
      />
      <div className={styles.cardBody}>
        <div className={styles.cardName}>{product.name}</div>
        <span className={styles.stockTag}>剩余 {product.stock} 件</span>
        <div className={styles.cardPriceRow}>
          <span className={styles.cardOriginalPrice}>¥{product.originalPrice}</span>
          <span
            className={styles.cardDiscountPrice}
            style={{ color: discountColor }}
          >
            ¥{product.discountPrice}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PreviewArea() {
  const { selectedProducts, templateId, activityConfig, setTemplateId } =
    usePromotionStore();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const layoutClass = useMemo(() => {
    switch (templateId) {
      case 'vertical':
        return styles.verticalLayout;
      case 'horizontal':
        return styles.horizontalLayout;
      case 'grid':
        return styles.gridLayout;
      default:
        return styles.verticalLayout;
    }
  }, [templateId]);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h2 className={styles.activityTitle}>{activityConfig.activityName}</h2>
        <div className={styles.templateSelector}>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              className={`${styles.templateBtn} ${
                templateId === t.id ? styles.active : ''
              }`}
              onClick={() => setTemplateId(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.previewContent}>
        {selectedProducts.length === 0 ? (
          <div className={styles.emptyPreview}>
            <div className={styles.emptyIcon}>🛍️</div>
            <div className={styles.emptyText}>暂无商品</div>
            <div className={styles.emptyHint}>
              从左侧选择商品后在此处预览活动页面效果
            </div>
          </div>
        ) : (
          <div className={layoutClass}>
            {selectedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                template={templateId}
                discountColor={activityConfig.discountColor}
                onClick={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSelectedProduct(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>商品详情</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setSelectedProduct(null)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <img
                src={selectedProduct.mainImageUrl}
                alt={selectedProduct.name}
                className={styles.modalImage}
              />
              <div className={styles.modalInfo}>
                <div className={styles.modalName}>{selectedProduct.name}</div>
                <div className={styles.modalPriceRow}>
                  <span className={styles.modalOriginalPrice}>
                    ¥{selectedProduct.originalPrice}
                  </span>
                  <span
                    className={styles.modalDiscountPrice}
                    style={{ color: activityConfig.discountColor }}
                  >
                    ¥{selectedProduct.discountPrice}
                  </span>
                </div>
                <span className={styles.modalStock}>
                  剩余库存 {selectedProduct.stock} 件
                </span>
              </div>
              <div className={styles.modalDescription}>
                {selectedProduct.description}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
