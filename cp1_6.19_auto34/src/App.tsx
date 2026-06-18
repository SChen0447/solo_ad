import { Routes, Route, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AdminPage from './modules/admin/AdminPage';
import { Popup } from './modules/popup/Popup';
import { popupManager } from './modules/popup/PopupManager';

function HomePage() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    const startTime = performance.now();

    requestIdleCallback(() => {
      if (!mounted) return;
      popupManager.init().then(() => {
        if (mounted) {
          setInitialized(true);
          const elapsed = performance.now() - startTime;
          console.log(`[PopupManager] initialized in ${elapsed.toFixed(2)}ms`);
        }
      });
    });

    return () => {
      mounted = false;
      popupManager.destroy();
    };
  }, []);

  const products = [
    { id: 1, name: '无线蓝牙耳机', price: 299, img: '🎧' },
    { id: 2, name: '智能手表', price: 899, img: '⌚' },
    { id: 3, name: '便携充电宝', price: 129, img: '🔋' },
    { id: 4, name: '机械键盘', price: 459, img: '⌨️' },
    { id: 5, name: '高清摄像头', price: 359, img: '📷' },
    { id: 6, name: '人体工学鼠标', price: 189, img: '🖱️' }
  ];

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="header-inner">
          <h1 className="brand">精品数码商城</h1>
          <nav className="header-nav">
            <Link to="/" className="nav-link">首页</Link>
            <Link to="/admin" className="nav-link">管理后台</Link>
          </nav>
        </div>
      </header>

      <main className="home-main">
        <section className="hero-banner">
          <h2>夏日特惠 · 全场低至5折</h2>
          <p>精选数码好物，限时优惠中</p>
        </section>

        <section className="products-section">
          <h3 className="section-title">热门商品</h3>
          <div className="product-grid">
            {products.map((p) => (
              <div key={p.id} className="product-card">
                <div className="product-img">{p.img}</div>
                <div className="product-name">{p.name}</div>
                <div className="product-price">¥{p.price}</div>
                <button className="product-btn">立即购买</button>
              </div>
            ))}
          </div>
        </section>

        <section className="scroll-section">
          <p>向下滚动以触发滚动弹窗...</p>
          <div className="spacer" />
        </section>
      </main>

      <footer className="home-footer">
        <p>© 2024 精品数码商城 · 弹窗管理系统演示</p>
      </footer>

      <Popup />

      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #333;
          background: #f5f6fa;
        }

        .home-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .home-header {
          background: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, #6c63ff, #a594ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-nav {
          display: flex;
          gap: 24px;
        }

        .nav-link {
          color: #555;
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s ease;
        }

        .nav-link:hover {
          color: #6c63ff;
        }

        .home-main {
          flex: 1;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          padding: 24px;
        }

        .hero-banner {
          background: linear-gradient(135deg, #6c63ff, #a594ff);
          color: #fff;
          padding: 48px 32px;
          border-radius: 16px;
          margin-bottom: 32px;
          text-align: center;
        }

        .hero-banner h2 {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .hero-banner p {
          font-size: 16px;
          opacity: 0.9;
        }

        .section-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #1a1a1a;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .product-card {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .product-img {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .product-name {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 8px;
          color: #333;
        }

        .product-price {
          font-size: 20px;
          font-weight: 700;
          color: #e74c3c;
          margin-bottom: 16px;
        }

        .product-btn {
          width: 100%;
          padding: 10px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #6c63ff, #a594ff);
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          transition: filter 0.2s ease, transform 0.1s ease;
        }

        .product-btn:hover {
          filter: brightness(1.1);
        }

        .product-btn:active {
          transform: scale(0.96);
        }

        .scroll-section {
          margin-top: 60px;
          text-align: center;
          color: #999;
        }

        .spacer {
          height: 800px;
        }

        .home-footer {
          background: #fff;
          padding: 24px;
          text-align: center;
          color: #999;
          font-size: 13px;
          border-top: 1px solid #f0f0f0;
        }

        @media (max-width: 480px) {
          .header-inner {
            padding: 12px 16px;
          }

          .brand {
            font-size: 18px;
          }

          .header-nav {
            gap: 16px;
          }

          .home-main {
            padding: 16px;
          }

          .hero-banner {
            padding: 32px 20px;
          }

          .hero-banner h2 {
            font-size: 24px;
          }

          .product-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .product-card {
            padding: 16px;
          }

          .product-img {
            font-size: 48px;
          }

          .product-name {
            font-size: 14px;
          }

          .product-price {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}

export default App;
