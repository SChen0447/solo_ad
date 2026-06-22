import React, { useState, useEffect, useCallback } from 'react';
import type { Order, MenuItem, Bill, Branch } from './types';
import { ordersApi, roomsApi } from './api';

interface OrdersProps {
  roomId: string;
  branch: Branch;
  onBack: () => void;
  username: string;
}

const branchNames: Record<Branch, string> = {
  seaview: '海景店',
  mountainview: '山景店',
};

const Orders: React.FC<OrdersProps> = ({ roomId, branch, onBack, username: _username }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [bill, setBill] = useState<Bill | null>(null);
  const [processing, setProcessing] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [orderData, menuData] = await Promise.all([
        ordersApi.getOrderByRoom(roomId),
        ordersApi.getMenuItems(),
      ]);
      setOrder(orderData);
      setMenuItems(menuData);
      setRoomNumber(orderData.roomId.split('-')[1] || '');
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddConsumption = async (menuItemId: string) => {
    if (!order) return;
    setProcessing(true);
    try {
      const result = await ordersApi.addConsumption(order.id, menuItemId, 1);
      setOrder(result.order);
    } catch (err) {
      alert(err instanceof Error ? err.message : '添加失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleShowBill = async () => {
    if (!order) return;
    try {
      const billData = await ordersApi.calculateBill(order.id);
      setBill(billData);
      setShowBillModal(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '获取账单失败');
    }
  };

  const handleSettle = async (paymentMethod: 'cash' | 'wechat' | 'alipay') => {
    setProcessing(true);
    try {
      await roomsApi.checkOut(roomId, paymentMethod);
      setShowBillModal(false);
      setBill(null);
      onBack();
    } catch (err) {
      alert(err instanceof Error ? err.message : '结算失败');
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalConsumption =
    order?.consumptions.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!order) {
    return (
      <div className="app-container">
        <nav className="navbar">
          <div className="navbar-content">
            <button className="back-btn" onClick={onBack}>
              ← 返回
            </button>
            <div className="navbar-center">
              <span className="logo-icon">🏨</span>
              <span className="branch-name">{branchNames[branch]}</span>
            </div>
            <div style={{ width: 80 }} />
          </div>
        </nav>
        <div className="empty-state">未找到订单</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-content">
          <button className="back-btn" onClick={onBack}>
            ← 返回
          </button>
          <div className="navbar-center">
            <span className="logo-icon">🏨</span>
            <span className="branch-name">
              {branchNames[branch]} - {roomNumber}房 记账
            </span>
          </div>
          <div style={{ width: 80 }} />
        </div>
      </nav>

      <main className="order-content">
        <div className="order-header">
          <div className="guest-info">
            <h3>客人信息</h3>
            <p>
              <strong>姓名：</strong>
              {order.guest.name}
            </p>
            <p>
              <strong>电话：</strong>
              {order.guest.phone}
            </p>
            <p>
              <strong>入住时间：</strong>
              {formatTime(order.checkInTime)}
            </p>
            <p>
              <strong>入住天数：</strong>
              {order.days} 天
            </p>
          </div>
          <div className="total-card">
            <div className="total-label">当前总消费</div>
            <div className="total-amount">¥{totalConsumption.toFixed(2)}</div>
            <div className="total-sub">
              房费 ¥{order.roomRate * order.days} + 消费 ¥{totalConsumption}
            </div>
          </div>
        </div>

        <div className="menu-section">
          <div className="section-header">
            <h3>菜单列表</h3>
            <button className="btn-primary" onClick={() => setShowMenuModal(true)}>
              + 加商品
            </button>
          </div>
          <div className="menu-list">
            {menuItems.map((item) => (
              <div key={item.id} className="menu-item">
                <div className="menu-item-info">
                  <span className="menu-item-name">{item.name}</span>
                  <span className="menu-item-price">¥{item.price}</span>
                </div>
                <button
                  className="add-btn"
                  onClick={() => handleAddConsumption(item.id)}
                  disabled={processing}
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="consumption-section">
          <h3>消费记录</h3>
          {order.consumptions.length === 0 ? (
            <div className="empty-consumption">暂无消费记录</div>
          ) : (
            <div className="consumption-list">
              {order.consumptions.map((item) => (
                <div key={item.id} className="consumption-item">
                  <div className="consumption-left">
                    <span className="consumption-name">{item.name}</span>
                    <span className="consumption-time">
                      {formatTime(item.timestamp)} · {item.operator}
                    </span>
                  </div>
                  <div className="consumption-right">
                    <span className="consumption-qty">× {item.quantity}</span>
                    <span className="consumption-price">
                      ¥{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="order-footer">
          <button className="btn-secondary" onClick={onBack}>
            返回看板
          </button>
          <button className="btn-primary btn-large" onClick={handleShowBill}>
            💰 结算
          </button>
        </div>
      </main>

      {showMenuModal && (
        <div className="modal-overlay" onClick={() => setShowMenuModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>添加商品</h2>
            <div className="menu-select-list">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  className="menu-select-item"
                  onClick={() => {
                    handleAddConsumption(item.id);
                    setShowMenuModal(false);
                  }}
                  disabled={processing}
                >
                  <span>{item.name}</span>
                  <span>¥{item.price}</span>
                </button>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowMenuModal(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showBillModal && bill && (
        <div className="modal-overlay" onClick={() => setShowBillModal(false)}>
          <div className="modal bill-modal" onClick={(e) => e.stopPropagation()}>
            <h2>结账单</h2>
            <div className="bill-info">
              <div className="info-row">
                <span>房间号：</span>
                <span>{bill.roomNumber}</span>
              </div>
              <div className="info-row">
                <span>客人：</span>
                <span>{bill.guest.name}</span>
              </div>
              <div className="info-row">
                <span>入住天数：</span>
                <span>{bill.days} 天</span>
              </div>
            </div>
            <div className="bill-section">
              <h3>房费</h3>
              <div className="info-row">
                <span>¥200 × {bill.days}天</span>
                <span>¥{bill.roomCharge}</span>
              </div>
            </div>
            {bill.consumptions.length > 0 && (
              <div className="bill-section">
                <h3>消费明细</h3>
                {bill.consumptions.map((item) => (
                  <div key={item.id} className="info-row">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span>¥{item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="info-row subtotal">
                  <span>消费小计</span>
                  <span>¥{bill.consumptionTotal}</span>
                </div>
              </div>
            )}
            <div className="bill-section total-section">
              <div className="info-row total-row">
                <span>押金</span>
                <span>¥{bill.deposit}</span>
              </div>
              <div className="info-row total-row">
                <span>总计</span>
                <span className="amount">¥{bill.totalAmount}</span>
              </div>
              {bill.refund > 0 && (
                <div className="info-row refund-row">
                  <span>应退</span>
                  <span className="refund">¥{bill.refund}</span>
                </div>
              )}
              {bill.receivable > 0 && (
                <div className="info-row receivable-row">
                  <span>应收</span>
                  <span className="receivable">¥{bill.receivable}</span>
                </div>
              )}
            </div>
            <div className="payment-methods">
              <button
                className="payment-btn cash"
                onClick={() => handleSettle('cash')}
                disabled={processing}
              >
                💵 现金
              </button>
              <button
                className="payment-btn wechat"
                onClick={() => handleSettle('wechat')}
                disabled={processing}
              >
                💬 微信
              </button>
              <button
                className="payment-btn alipay"
                onClick={() => handleSettle('alipay')}
                disabled={processing}
              >
                💰 支付宝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
