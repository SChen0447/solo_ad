import React, { useState, useEffect } from 'react';
import type { Customer } from '../App';

interface Drink {
  id: number;
  name: string;
  price: number;
  category: string;
  image_color: string;
}

interface MenuProps {
  customerId: string;
  onPointsUpdate: (customer: Customer) => void;
}

function Menu({ customerId, onPointsUpdate }: MenuProps) {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('全部');

  useEffect(() => {
    fetchDrinks();
  }, []);

  const fetchDrinks = async () => {
    try {
      const response = await fetch('/api/drinks');
      if (response.ok) {
        const data = await response.json();
        setDrinks(data);
      }
    } catch (error) {
      console.error('获取饮品列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['全部', ...Array.from(new Set(drinks.map((d) => d.category)))];

  const filteredDrinks =
    activeCategory === '全部'
      ? drinks
      : drinks.filter((d) => d.category === activeCategory);

  const handleOrderClick = (drink: Drink) => {
    setSelectedDrink(drink);
    setQuantity(1);
    setShowModal(true);
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= 5) {
      setQuantity(newQuantity);
    }
  };

  const handleSubmitOrder = async () => {
    if (!selectedDrink || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          drinkId: selectedDrink.id,
          quantity,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowModal(false);
        setShowSuccess(true);
        if (data.customer) {
          onPointsUpdate(data.customer);
        }
        setTimeout(() => setShowSuccess(false), 1500);
      } else {
        alert(data.error || '点单失败');
      }
    } catch (error) {
      alert('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    if (!submitting) {
      setShowModal(false);
    }
  };

  if (loading) {
    return (
      <div className="menu-loading">
        <div className="loading-spinner"></div>
        <p>加载菜单中...</p>
        <style>{`
          .menu-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            gap: 16px;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #F5DEB3;
            border-top-color: #8B4513;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="menu-page">
      <div className="menu-header">
        <h2>饮品菜单</h2>
        <p>精选优质咖啡豆，用心调制每一杯</p>
      </div>

      <div className="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="drink-grid">
        {filteredDrinks.map((drink) => (
          <div key={drink.id} className="drink-card">
            <div
              className="drink-image"
              style={{ background: drink.image_color }}
            >
              <span className="drink-emoji">☕</span>
            </div>
            <div className="drink-info">
              <div className="drink-name">{drink.name}</div>
              <div className="drink-category">{drink.category}</div>
              <div className="drink-footer">
                <span className="drink-price">¥{drink.price.toFixed(2)}</span>
                <button
                  className="order-btn"
                  onClick={() => handleOrderClick(drink)}
                >
                  点单
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && selectedDrink && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>确认点单</h3>
              <button className="close-btn" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div
              className="modal-drink-image"
              style={{ background: selectedDrink.image_color }}
            >
              <span className="modal-drink-emoji">☕</span>
            </div>

            <div className="modal-drink-name">{selectedDrink.name}</div>
            <div className="modal-drink-price">
              单价：¥{selectedDrink.price.toFixed(2)}
            </div>

            <div className="quantity-selector">
              <span className="quantity-label">数量</span>
              <div className="quantity-controls">
                <button
                  className="quantity-btn"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <span className="quantity-value">{quantity}</span>
                <button
                  className="quantity-btn"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= 5}
                >
                  +
                </button>
              </div>
            </div>

            <div className="total-price">
              <span>合计</span>
              <span className="total-amount">
                ¥{(selectedDrink.price * quantity).toFixed(2)}
              </span>
            </div>

            <button
              className={`submit-btn ${submitting ? 'submitting' : ''}`}
              onClick={handleSubmitOrder}
              disabled={submitting}
            >
              {submitting ? '提交中...' : '确认点单'}
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="success-toast">
          <div className="success-checkmark">
            <svg viewBox="0 0 52 52">
              <circle
                className="checkmark-circle"
                cx="26"
                cy="26"
                r="25"
                fill="none"
              />
              <path
                className="checkmark-check"
                fill="none"
                d="M14.1 27.2l7.1 7.2 16.7-16.8"
              />
            </svg>
          </div>
          <span>点单成功！</span>
        </div>
      )}

      <style>{`
        .menu-page {
          animation: fadeInUp 0.3s ease;
          padding-bottom: 20px;
        }

        .menu-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .menu-header h2 {
          color: #8B4513;
          font-size: 24px;
          margin-bottom: 6px;
        }

        .menu-header p {
          color: #A0522D;
          font-size: 13px;
          opacity: 0.8;
        }

        .category-tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 8px;
          margin-bottom: 20px;
          -webkit-overflow-scrolling: touch;
        }

        .category-tab {
          flex-shrink: 0;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.6);
          color: #8B4513;
          border-radius: 20px;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .category-tab.active {
          background: #8B4513;
          color: #FFF8E7;
        }

        .drink-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        .drink-card {
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(139, 69, 19, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .drink-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 8px 24px rgba(139, 69, 19, 0.2);
        }

        .drink-image {
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .drink-emoji {
          font-size: 48px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }

        .drink-info {
          padding: 16px;
        }

        .drink-name {
          font-size: 16px;
          font-weight: 600;
          color: #5D3A1A;
          margin-bottom: 4px;
        }

        .drink-category {
          font-size: 12px;
          color: #A0522D;
          opacity: 0.7;
          margin-bottom: 12px;
        }

        .drink-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .drink-price {
          font-size: 18px;
          font-weight: 700;
          color: #8B4513;
        }

        .order-btn {
          padding: 8px 20px;
          background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
          color: #FFF8E7;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .order-btn:hover {
          transform: scale(1.05);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
          padding: 20px;
        }

        .modal-content {
          background: #FFF8E7;
          border-radius: 20px;
          padding: 24px;
          width: 100%;
          max-width: 360px;
          animation: slideUp 0.3s ease;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h3 {
          color: #8B4513;
          font-size: 20px;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          background: rgba(139, 69, 19, 0.1);
          border-radius: 50%;
          color: #8B4513;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-drink-image {
          height: 140px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .modal-drink-emoji {
          font-size: 64px;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
        }

        .modal-drink-name {
          font-size: 20px;
          font-weight: 600;
          color: #5D3A1A;
          text-align: center;
          margin-bottom: 8px;
        }

        .modal-drink-price {
          text-align: center;
          color: #A0522D;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .quantity-selector {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 12px;
        }

        .quantity-label {
          font-size: 15px;
          color: #5D3A1A;
          font-weight: 500;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .quantity-btn {
          width: 36px;
          height: 36px;
          background: #8B4513;
          color: #FFF8E7;
          border-radius: 50%;
          font-size: 20px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .quantity-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .quantity-value {
          font-size: 20px;
          font-weight: 700;
          color: #8B4513;
          min-width: 30px;
          text-align: center;
        }

        .total-price {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: rgba(139, 69, 19, 0.1);
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .total-price span:first-child {
          font-size: 15px;
          color: #5D3A1A;
        }

        .total-amount {
          font-size: 24px;
          font-weight: 700;
          color: #8B4513;
        }

        .submit-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
          color: #FFF8E7;
          font-size: 16px;
          font-weight: 600;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .success-toast {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(46, 139, 87, 0.95);
          color: #fff;
          padding: 24px 32px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          z-index: 1001;
          animation: fadeInUp 0.3s ease;
        }

        .success-checkmark {
          width: 56px;
          height: 56px;
        }

        .success-checkmark svg {
          width: 100%;
          height: 100%;
        }

        .checkmark-circle {
          stroke: #fff;
          stroke-width: 3;
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          animation: stroke 0.5s ease-out forwards;
        }

        .checkmark-check {
          stroke: #fff;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: stroke 0.3s ease-out 0.3s forwards;
        }

        @keyframes stroke {
          to {
            stroke-dashoffset: 0;
          }
        }

        .success-toast span {
          font-size: 16px;
          font-weight: 500;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (min-width: 600px) {
          .drink-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .drink-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

export default Menu;
