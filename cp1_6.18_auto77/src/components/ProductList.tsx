import { useState } from 'react';
import { usePromotionStore } from '../store';
import type { Product } from '../types';
import styles from '../styles/ProductList.module.css';

export default function ProductList() {
  const {
    availableProducts,
    selectedProducts,
    addProduct,
    removeProduct,
    reorderProducts,
    setSelectedProducts,
  } = usePromotionStore();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isSelected = (productId: string) =>
    selectedProducts.some((p) => p.id === productId);

  const handleProductClick = (product: Product) => {
    if (isSelected(product.id)) {
      removeProduct(product.id);
    } else {
      addProduct(product);
    }
  };

  const handleClearAll = () => {
    setSelectedProducts([]);
  };

  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      reorderProducts(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span>可选商品</span>
          <span className={styles.count}>{availableProducts.length} 件</span>
        </div>
        <div className={styles.productGrid}>
          {availableProducts.map((product) => (
            <div
              key={product.id}
              className={`${styles.productCard} ${
                isSelected(product.id) ? styles.selected : ''
              }`}
              onClick={() => handleProductClick(product)}
            >
              <img
                src={product.mainImageUrl}
                alt={product.name}
                className={styles.thumbnail}
                draggable={false}
              />
              <span className={styles.productName}>{product.name}</span>
              <div className={styles.priceTag}>
                <span className={styles.discountPrice}>
                  ¥{product.discountPrice}
                </span>
                <span className={styles.originalPrice}>
                  ¥{product.originalPrice}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className={styles.sectionTitle}>
          <span>活动商品列表</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={styles.count}>{selectedProducts.length} 件</span>
            {selectedProducts.length > 0 && (
              <button className={styles.clearBtn} onClick={handleClearAll}>
                清空
              </button>
            )}
          </div>
        </div>
        {selectedProducts.length === 0 ? (
          <div className={styles.emptyState}>
            点击上方商品添加到活动列表
          </div>
        ) : (
          <div className={styles.selectedList}>
            {selectedProducts.map((product, index) => (
              <div
                key={product.id}
                className={`${styles.selectedItem} ${
                  draggedIndex === index ? styles.dragging : ''
                } ${dragOverIndex === index ? styles.dragOver : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(index, e)}
                onDragOver={(e) => handleDragOver(index, e)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(index, e)}
                onDragEnd={handleDragEnd}
              >
                <div className={styles.dragHandle}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <img
                  src={product.mainImageUrl}
                  alt={product.name}
                  className={styles.itemThumbnail}
                  draggable={false}
                />
                <div className={styles.itemInfo}>
                  <div className={styles.itemName}>{product.name}</div>
                  <div className={styles.itemPrice}>¥{product.discountPrice}</div>
                </div>
                <button
                  className={styles.removeBtn}
                  onClick={() => removeProduct(product.id)}
                  title="移除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
