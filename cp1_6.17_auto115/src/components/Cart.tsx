import React, { useState, useEffect } from 'react';
import { CartItem, CATEGORY_COLORS, CategoryType } from '../types';
import { Socket } from 'socket.io-client';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  socket: Socket;
}

const Cart: React.FC<CartProps> = ({ isOpen, onClose, items, total, socket }) => {
  const [isCheckoutAnimating, setIsCheckoutAnimating] = useState(false);

  const handleRemove = (bookId: string) => {
    socket.emit('remove_from_cart', { book_id: bookId });
  };

  const handleUpdateQuantity = (bookId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemove(bookId);
    } else {
      socket.emit('update_cart_quantity', { book_id: bookId, quantity });
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    setIsCheckoutAnimating(true);
    setTimeout(() => {
      alert('结算成功！感谢您的购买！');
      items.forEach((item) => {
        socket.emit('remove_from_cart', { book_id: item.book_id });
      });
      setIsCheckoutAnimating(false);
      onClose();
    }, 500);
  };

  const groupedItems = items.reduce((acc, item) => {
    const category = item.category as CategoryType;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  const getCategoryColor = (category: string): string => {
    const colors = CATEGORY_COLORS[category as CategoryType] || CATEGORY_COLORS['小说'];
    return colors[0];
  };

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      zIndex: 999,
      opacity: isOpen ? 1 : 0,
      visibility: isOpen ? 'visible' : 'hidden',
      transition: 'opacity 0.3s ease, visibility 0.3s ease',
    },
    sidebar: {
      position: 'fixed',
      top: 0,
      right: 0,
      width: '350px',
      height: '100vh',
      backgroundColor: 'white',
      boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s ease',
    },
    header: {
      padding: '20px',
      borderBottom: '1px solid #efebe9',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#fff9f0',
    },
    title: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#5d4037',
    },
    closeBtn: {
      width: '32px',
      height: '32px',
      border: 'none',
      borderRadius: '50%',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontSize: '20px',
      color: '#8d6e63',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '16px',
    },
    categoryGroup: {
      marginBottom: '20px',
    },
    categoryTitle: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#8d6e63',
      marginBottom: '10px',
      paddingLeft: '8px',
      borderLeft: '3px solid',
    },
    itemCard: {
      backgroundColor: '#faf6f0',
      borderRadius: '10px',
      padding: '12px',
      marginBottom: '10px',
      display: 'flex',
      gap: '12px',
    },
    itemCover: {
      width: '50px',
      height: '70px',
      borderRadius: '6px',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '10px',
      fontWeight: 'bold',
      textAlign: 'center' as const,
      padding: '4px',
    },
    itemInfo: {
      flex: 1,
      minWidth: 0,
    },
    itemTitle: {
      fontSize: '14px',
      fontWeight: 500,
      color: '#5d4037',
      marginBottom: '4px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    itemAuthor: {
      fontSize: '12px',
      color: '#a1887f',
      marginBottom: '6px',
    },
    itemPrice: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#c44536',
    },
    quantityControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '8px',
    },
    qtyBtn: {
      width: '24px',
      height: '24px',
      border: '1px solid #d7ccc8',
      borderRadius: '6px',
      backgroundColor: 'white',
      cursor: 'pointer',
      fontSize: '14px',
      color: '#6d4c41',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyValue: {
      fontSize: '14px',
      fontWeight: 500,
      color: '#5d4037',
      minWidth: '20px',
      textAlign: 'center' as const,
    },
    deleteBtn: {
      border: 'none',
      backgroundColor: 'transparent',
      color: '#c44536',
      fontSize: '12px',
      cursor: 'pointer',
      padding: '4px 8px',
      marginTop: '4px',
    },
    footer: {
      padding: '20px',
      borderTop: '1px solid #efebe9',
      backgroundColor: '#fff9f0',
    },
    totalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
    },
    totalLabel: {
      fontSize: '14px',
      color: '#8d6e63',
    },
    totalValue: {
      fontSize: '24px',
      fontWeight: 700,
      color: '#c44536',
    },
    checkoutBtn: {
      width: '100%',
      padding: '14px',
      backgroundColor: '#2d5a3d',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'background-color 0.2s, transform 0.2s',
      transform: isCheckoutAnimating ? 'scale(0.95)' : 'scale(1)',
    },
    emptyCart: {
      textAlign: 'center' as const,
      padding: '40px 20px',
      color: '#a1887f',
    },
    emptyCartIcon: {
      fontSize: '48px',
      marginBottom: '12px',
    },
  };

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <h3 style={styles.title}>🛒 购物车</h3>
          <button style={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={styles.content}>
          {items.length === 0 ? (
            <div style={styles.emptyCart}>
              <div style={styles.emptyCartIcon}>📚</div>
              <p>购物车是空的</p>
              <p style={{ fontSize: '12px', marginTop: '6px' }}>快去挑选喜欢的书吧~</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} style={styles.categoryGroup}>
                <h4
                  style={{
                    ...styles.categoryTitle,
                    borderColor: getCategoryColor(category),
                    color: getCategoryColor(category),
                  }}
                >
                  {category} ({categoryItems.length})
                </h4>
                {categoryItems.map((item) => (
                  <div key={item.book_id} style={styles.itemCard}>
                    <div
                      style={{
                        ...styles.itemCover,
                        backgroundColor: getCategoryColor(item.category),
                      }}
                    >
                      {item.title.slice(0, 4)}
                    </div>
                    <div style={styles.itemInfo}>
                      <h4 style={styles.itemTitle}>{item.title}</h4>
                      <p style={styles.itemAuthor}>{item.author}</p>
                      <p style={styles.itemPrice}>¥{item.price.toFixed(2)}</p>
                      <div style={styles.quantityControls}>
                        <button
                          style={styles.qtyBtn}
                          onClick={() => handleUpdateQuantity(item.book_id, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span style={styles.qtyValue}>{item.quantity}</span>
                        <button
                          style={styles.qtyBtn}
                          onClick={() => handleUpdateQuantity(item.book_id, item.quantity + 1)}
                        >
                          +
                        </button>
                        <button
                          style={styles.deleteBtn}
                          onClick={() => handleRemove(item.book_id)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div style={styles.footer}>
          <div style={styles.totalRow}>
            <span style={styles.totalLabel}>合计</span>
            <span style={styles.totalValue}>¥{total.toFixed(2)}</span>
          </div>
          <button
            style={{
              ...styles.checkoutBtn,
              backgroundColor: items.length === 0 ? '#bcb8b1' : '#2d5a3d',
              cursor: items.length === 0 ? 'not-allowed' : 'pointer',
            }}
            onClick={handleCheckout}
            disabled={items.length === 0}
            onMouseEnter={(e) => {
              if (items.length > 0) {
                e.currentTarget.style.backgroundColor = '#1e3f2a';
              }
            }}
            onMouseLeave={(e) => {
              if (items.length > 0) {
                e.currentTarget.style.backgroundColor = '#2d5a3d';
              }
            }}
          >
            结算
          </button>
        </div>
      </div>
    </>
  );
};

export default Cart;
