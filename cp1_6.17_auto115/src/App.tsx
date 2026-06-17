import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Book, CartItem } from './types';
import AdminPanel from './components/AdminPanel';
import ThreeBookShelf from './components/ThreeBookShelf';
import Cart from './components/Cart';

interface AppProps {
  socket: Socket;
}

const App: React.FC<AppProps> = ({ socket }) => {
  const [currentPage, setCurrentPage] = useState<'customer' | 'admin'>('customer');
  const [books, setBooks] = useState<Book[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    socket.on('initial_data', (data: { books: Book[]; cart: { items: CartItem[]; total: number } }) => {
      setBooks(data.books);
      setCartItems(data.cart.items);
      setCartTotal(data.cart.total);
    });

    socket.on('books_updated', (data: { books: Book[] }) => {
      setBooks(data.books);
    });

    socket.on('cart_updated', (data: { items: CartItem[]; total: number }) => {
      setCartItems(data.items);
      setCartTotal(data.total);
      triggerCartBounce();
    });

    return () => {
      socket.off('initial_data');
      socket.off('books_updated');
      socket.off('cart_updated');
    };
  }, [socket]);

  const triggerCartBounce = () => {
    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 500);
  };

  const handleAddToCart = (book: Book) => {
    socket.emit('add_to_cart', { book_id: book.id, quantity: 1 });
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const styles: Record<string, React.CSSProperties> = {
    app: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f0e8',
    },
    navbar: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: 'rgba(62, 39, 35, 0.85)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      padding: '0 24px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    },
    logo: {
      fontSize: '20px',
      fontWeight: 700,
      color: '#faf6f0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    navLinks: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
    },
    navBtn: {
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'transparent',
      color: '#d7ccc8',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
      transition: 'background-color 0.2s, color 0.2s',
    },
    navBtnActive: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      color: '#fff9f0',
    },
    cartBtn: {
      position: 'relative' as const,
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      border: 'none',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: '#faf6f0',
      cursor: 'pointer',
      fontSize: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 0.2s',
      marginLeft: '8px',
    },
    cartBadge: {
      position: 'absolute' as const,
      top: '-2px',
      right: '-2px',
      minWidth: '18px',
      height: '18px',
      borderRadius: '9px',
      backgroundColor: '#c44536',
      color: 'white',
      fontSize: '11px',
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 4px',
    },
    mainContent: {
      flex: 1,
      marginTop: '60px',
      paddingBottom: '60px',
    },
    bookshelfContainer: {
      width: '100%',
      height: 'calc(100vh - 120px)',
      minHeight: '500px',
    },
    footer: {
      backgroundColor: '#3e2723',
      color: '#a1887f',
      padding: '20px 24px',
      textAlign: 'center' as const,
      fontSize: '13px',
    },
    pageTitle: {
      textAlign: 'center' as const,
      padding: '30px 20px 10px',
      color: '#5d4037',
      fontSize: isMobile ? '20px' : '28px',
    },
    pageSubtitle: {
      textAlign: 'center' as const,
      color: '#8d6e63',
      fontSize: isMobile ? '13px' : '14px',
      marginBottom: '10px',
    },
  };

  return (
    <div style={styles.app}>
      <nav style={styles.navbar}>
        <div style={styles.logo}>
          📚 墨香书店
        </div>
        <div style={styles.navLinks}>
          <button
            style={{
              ...styles.navBtn,
              ...(currentPage === 'customer' ? styles.navBtnActive : {}),
            }}
            onClick={() => setCurrentPage('customer')}
          >
            逛书店
          </button>
          <button
            style={{
              ...styles.navBtn,
              ...(currentPage === 'admin' ? styles.navBtnActive : {}),
            }}
            onClick={() => setCurrentPage('admin')}
          >
            管理后台
          </button>
          <button
            style={styles.cartBtn}
            onClick={() => setIsCartOpen(true)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
            title="购物车"
          >
            🛒
            {cartCount > 0 && (
              <span
                style={{
                  ...styles.cartBadge,
                  transform: cartBounce ? 'scale(1.3)' : 'scale(1)',
                  transition: 'transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                }}
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      <main style={styles.mainContent}>
        {currentPage === 'customer' ? (
          <>
            {!isMobile && (
              <>
                <h1 style={styles.pageTitle}>欢迎来到墨香书店</h1>
                <p style={styles.pageSubtitle}>拖拽旋转视角，点击书籍查看详情</p>
              </>
            )}
            <div style={styles.bookshelfContainer}>
              <ThreeBookShelf
                books={books}
                onAddToCart={handleAddToCart}
                isMobile={isMobile}
              />
            </div>
          </>
        ) : (
          <>
            <AdminPanel socket={socket} books={books} />
          </>
        )}
      </main>

      <footer style={styles.footer}>
        © 2024 墨香书店 版权所有 | 虚拟书店体验
      </footer>

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        total={cartTotal}
        socket={socket}
      />
    </div>
  );
};

export default App;
