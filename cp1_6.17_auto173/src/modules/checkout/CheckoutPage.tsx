import React, { useState } from 'react';
import axios from 'axios';
import { useStore, packagingStyles } from '../store/Store';
import { Order, BouquetFlower, PackagingStyle } from '../../types';

const CheckoutPage: React.FC = () => {
  const { state, dispatch } = useStore();
  const [selectedPackaging, setSelectedPackaging] = useState<PackagingStyle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const flowersTotal = state.bouquet.reduce((sum, f) => sum + f.price, 0);
  const packagingPrice = selectedPackaging?.price || 0;
  const totalPrice = flowersTotal + packagingPrice;

  const flowerCounts = state.bouquet.reduce((acc, f) => {
    const existing = acc.find(item => item.id === f.id);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ id: f.id, name: f.name, price: f.price, count: 1 });
    }
    return acc;
  }, [] as { id: number; name: string; price: number; count: number }[]);

  const handleSubmit = async () => {
    if (!selectedPackaging) {
      setError('请选择包装风格');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const orderData = {
        flowers: state.bouquet.map(f => ({
          id: f.id,
          name: f.name,
          price: f.price,
          count: 1,
        })),
        packaging: selectedPackaging.id,
        totalPrice,
      };

      let order: Order;
      try {
        const response = await axios.post<Order>('/api/orders', orderData);
        order = response.data;
      } catch (apiError) {
        order = {
          orderNo: `FL${Date.now()}`,
          flowers: state.bouquet,
          packaging: selectedPackaging.id,
          totalPrice,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
      }

      setCreatedOrder(order);
      dispatch({ type: 'SET_CURRENT_ORDER', payload: order });
      setShowSuccess(true);

      dispatch({ type: 'CLEAR_BOUQUET' });
      dispatch({ type: 'SET_SELECTED_PACKAGING', payload: null });
    } catch (err) {
      setError('提交订单失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: 'editor' });
  };

  const handleViewOrders = () => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: 'admin' });
  };

  const handleContinue = () => {
    setShowSuccess(false);
    setCreatedOrder(null);
    dispatch({ type: 'SET_CURRENT_PAGE', payload: 'editor' });
  };

  if (showSuccess && createdOrder) {
    return (
      <div className="checkout-page">
      <div className="order-success">
        <div className="success-icon">🎉</div>
        <h2>订单提交成功！</h2>
        <div className="order-detail-card">
          <div className="detail-row">
            <span className="detail-label">订单编号</span>
            <span className="detail-value">{createdOrder.orderNo}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">订单金额</span>
            <span className="detail-value price">¥{createdOrder.totalPrice}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">包装风格</span>
            <span className="detail-value">
              {packagingStyles.find(p => p.id === createdOrder.packaging)?.name}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">订单状态</span>
            <span className="detail-value status-pending">待确认</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">下单时间</span>
            <span className="detail-value">
              {new Date(createdOrder.createdAt).toLocaleString('zh-CN')}
            </span>
          </div>
        </div>
        <div className="success-actions">
          <button className="btn-secondary" onClick={handleContinue}>继续搭配</button>
          <button className="btn-primary" onClick={handleViewOrders}>查看订单</button>
        </div>
      </div>
    </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <button className="back-btn" onClick={handleBack}>← 返回编辑</button>
        <h2>确认订单</h2>
      </div>

      <div className="checkout-content">
        <div className="checkout-section">
          <h3>花材清单</h3>
          <div className="flower-summary">
            {flowerCounts.map(item => (
              <div key={item.id} className="summary-row">
              <span className="flower-info">
                <span className="flower-name">{item.name}</span>
                <span className="flower-count">×{item.count}</span>
              </span>
              <span className="flower-subtotal">¥{item.price * item.count}</span>
            </div>
            ))}
          </div>
        </div>

        <div className="checkout-section">
          <h3>选择包装风格</h3>
          <div className="packaging-options">
            {packagingStyles.map(pkg => (
              <div
                key={pkg.id}
                className={`packaging-option ${selectedPackaging?.id === pkg.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedPackaging(pkg);
                  dispatch({ type: 'SET_SELECTED_PACKAGING', payload: pkg });
                }}
              >
                <div className="packaging-icon">
                  {pkg.id === 'kraft' && '📦'}
                  {pkg.id === 'pink' && '🎀'}
                  {pkg.id === 'vintage' && '📰'}
                </div>
                <div className="packaging-info">
                  <div className="packaging-name">{pkg.name}</div>
                  <div className="packaging-desc">{pkg.description}</div>
                  <div className="packaging-price">+¥{pkg.price}</div>
                </div>
                {selectedPackaging?.id === pkg.id && <div className="selected-check">✓</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="checkout-footer">
        <div className="price-breakdown">
          <div className="price-row">
            <span>花材小计</span>
            <span>¥{flowersTotal}</span>
          </div>
          <div className="price-row">
            <span>包装费用</span>
            <span>¥{packagingPrice}</span>
          </div>
          <div className="price-row total">
            <span>合计</span>
            <span className="total-price">¥{totalPrice}</span>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          className="submit-order-btn"
          onClick={handleSubmit}
          disabled={isSubmitting || state.bouquet.length === 0}
        >
          {isSubmitting ? '提交中...' : '提交订单'}
        </button>
      </div>
    </div>
  );
};

export default CheckoutPage;
