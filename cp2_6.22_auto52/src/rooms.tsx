import React, { useState, useEffect, useCallback } from 'react';
import type { Room, Branch, Guest, Bill } from './types';
import { roomsApi, ordersApi } from './api';

interface RoomsProps {
  branch: Branch;
  onBranchChange: (branch: Branch) => void;
  onEnterOrder: (roomId: string) => void;
  onLogout: () => void;
  username: string;
}

const statusColors: Record<string, string> = {
  vacant: '#D1FAE5',
  occupied: '#FEF08A',
  cleaning: '#E0E7FF',
  maintenance: '#FECACA',
};

const statusLabels: Record<string, string> = {
  vacant: '空闲',
  occupied: '在住',
  cleaning: '打扫',
  maintenance: '维修',
};

const branchNames: Record<Branch, string> = {
  seaview: '海景店',
  mountainview: '山景店',
};

const Rooms: React.FC<RoomsProps> = ({
  branch,
  onBranchChange,
  onEnterOrder,
  onLogout,
  username,
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [bill, setBill] = useState<Bill | null>(null);
  const [processing, setProcessing] = useState(false);

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestIdCard, setGuestIdCard] = useState('');
  const [days, setDays] = useState(1);
  const [deposit, setDeposit] = useState(200);
  const [touched, setTouched] = useState({ name: false, phone: false, idCard: false });

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await roomsApi.getRooms(branch);
      setRooms(data);
    } catch (err) {
      console.error('加载房间失败:', err);
    } finally {
      setLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    setFadeState('out');
    const timer = setTimeout(() => {
      loadRooms();
      setFadeState('in');
    }, 300);
    return () => clearTimeout(timer);
  }, [loadRooms]);

  const handleBranchChange = (newBranch: Branch) => {
    if (newBranch !== branch) {
      onBranchChange(newBranch);
    }
  };

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    if (room.status === 'vacant') {
      resetForm();
      setShowCheckInModal(true);
    } else if (room.status === 'occupied') {
      setShowCheckOutModal(true);
    }
  };

  const resetForm = () => {
    setGuestName('');
    setGuestPhone('');
    setGuestIdCard('');
    setDays(1);
    setDeposit(200);
    setTouched({ name: false, phone: false, idCard: false });
  };

  const validateIdCard = (id: string): boolean => {
    return /^\d{17}[\dXx]$/.test(id);
  };

  const handleCheckIn = async () => {
    if (!selectedRoom) return;
    setTouched({ name: true, phone: true, idCard: true });

    const guest: Guest = {
      name: guestName.trim(),
      phone: guestPhone.trim(),
      idCard: guestIdCard.trim(),
    };

    if (!guest.name || !guest.phone || !validateIdCard(guest.idCard)) {
      return;
    }

    setProcessing(true);
    try {
      const result = await roomsApi.checkIn(selectedRoom.id, guest, days, deposit);
      setRooms((prev) => prev.map((r) => (r.id === result.room.id ? result.room : r)));
      setShowCheckInModal(false);
      if (result.room.orderId) {
        onEnterOrder(result.room.id);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '入住失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleShowBill = async () => {
    if (!selectedRoom?.orderId) return;
    try {
      const billData = await ordersApi.calculateBill(selectedRoom.orderId);
      setBill(billData);
      setShowCheckOutModal(false);
      setShowBillModal(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '获取账单失败');
    }
  };

  const handleSettle = async (paymentMethod: 'cash' | 'wechat' | 'alipay') => {
    if (!selectedRoom) return;
    setProcessing(true);
    try {
      const result = await roomsApi.checkOut(selectedRoom.id, paymentMethod);
      setRooms((prev) => prev.map((r) => (r.id === result.room.id ? result.room : r)));
      setShowBillModal(false);
      setSelectedRoom(null);
      setBill(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '结算失败');
    } finally {
      setProcessing(false);
    }
  };

  const closeModals = () => {
    setShowCheckInModal(false);
    setShowCheckOutModal(false);
    setShowBillModal(false);
    setSelectedRoom(null);
    setBill(null);
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString('zh-CN');
  const formatTime = (ts: number) => new Date(ts).toLocaleDateString('zh-CN');

  const isValidName = guestName.trim().length > 0;
  const isValidPhone = guestPhone.trim().length > 0;
  const isValidIdCard = validateIdCard(guestIdCard);
  const isFormValid = isValidName && isValidPhone && isValidIdCard;

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="branch-buttons">
            <button
              className={`branch-btn ${branch === 'seaview' ? 'active' : ''}`}
              onClick={() => handleBranchChange('seaview')}
            >
              🌊 海景店
            </button>
            <button
              className={`branch-btn ${branch === 'mountainview' ? 'active' : ''}`}
              onClick={() => handleBranchChange('mountainview')}
            >
              ⛰️ 山景店
            </button>
          </div>
          <div className="navbar-center">
            <span className="logo-icon">🏨</span>
            <span className="branch-name">{branchNames[branch]}</span>
          </div>
          <div className="navbar-right">
            <span className="username">欢迎，{username}</span>
            <button className="logout-btn" onClick={onLogout}>
              退出
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="status-legend">
          {Object.entries(statusLabels).map(([key, label]) => (
            <div key={key} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: statusColors[key] }} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <div
            className={`rooms-grid ${fadeState === 'out' ? 'fade-out' : 'fade-in'}`}
          >
            {rooms.map((room) => (
              <div
                key={room.id}
                className="room-card"
                style={{ backgroundColor: statusColors[room.status] }}
                onClick={() => handleRoomClick(room)}
              >
                <div className="room-number">{room.roomNumber}</div>
                {room.status === 'occupied' && room.guest && (
                  <div className="room-guest-abbr">{room.guest.name.charAt(0)}</div>
                )}
                <div
                  className="room-status-bar"
                  style={{ backgroundColor: statusColors[room.status] }}
                />
                <div className="room-tooltip">
                  <div className="tooltip-status">{statusLabels[room.status]}</div>
                  {room.status === 'occupied' && room.guest && (
                    <>
                      <div>客人：{room.guest.name}</div>
                      <div>预计退房：{room.checkOutTime ? formatTime(room.checkOutTime) : '-'}</div>
                      {room.orderId && (
                        <button
                          className="tooltip-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEnterOrder(room.id);
                          }}
                        >
                          💰 记账
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCheckInModal && selectedRoom && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>入住登记 - {selectedRoom.roomNumber}</h2>
            <div className="form-group">
              <label>客人姓名 *</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onBlur={() => setTouched({ ...touched, name: true })}
                  className={touched.name && !isValidName ? 'input-error' : ''}
                  placeholder="请输入客人姓名"
                />
                {touched.name && (
                  <span className={`input-icon ${isValidName ? 'valid' : 'invalid'}`}>
                    {isValidName ? '✓' : '!'}
                  </span>
                )}
              </div>
            </div>
            <div className="form-group">
              <label>联系电话 *</label>
              <div className="input-wrapper">
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  onBlur={() => setTouched({ ...touched, phone: true })}
                  className={touched.phone && !isValidPhone ? 'input-error' : ''}
                  placeholder="请输入联系电话"
                />
                {touched.phone && (
                  <span className={`input-icon ${isValidPhone ? 'valid' : 'invalid'}`}>
                    {isValidPhone ? '✓' : '!'}
                  </span>
                )}
              </div>
            </div>
            <div className="form-group">
              <label>身份证号 *</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  value={guestIdCard}
                  onChange={(e) => setGuestIdCard(e.target.value.toUpperCase())}
                  onBlur={() => setTouched({ ...touched, idCard: true })}
                  className={touched.idCard && !isValidIdCard ? 'input-error' : ''}
                  placeholder="请输入18位身份证号"
                  maxLength={18}
                />
                {touched.idCard && (
                  <span className={`input-icon ${isValidIdCard ? 'valid' : 'invalid'}`}>
                    {isValidIdCard ? '✓' : '!'}
                  </span>
                )}
              </div>
              {touched.idCard && !isValidIdCard && guestIdCard && (
                <div className="error-text">身份证号格式不正确</div>
              )}
            </div>
            <div className="form-group">
              <label>入住天数</label>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>
                    {d} 天
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>押金（元）</label>
              <input
                type="number"
                value={deposit}
                onChange={(e) => setDeposit(Number(e.target.value))}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModals}>
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleCheckIn}
                disabled={processing || !isFormValid}
              >
                {processing ? '处理中...' : '确认入住'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCheckOutModal && selectedRoom && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>退房确认 - {selectedRoom.roomNumber}</h2>
            <div className="checkout-info">
              <div className="info-row">
                <span>客人姓名：</span>
                <span>{selectedRoom.guest?.name}</span>
              </div>
              <div className="info-row">
                <span>入住时间：</span>
                <span>{selectedRoom.checkInTime ? formatDate(selectedRoom.checkInTime) : '-'}</span>
              </div>
              <div className="info-row">
                <span>入住天数：</span>
                <span>{selectedRoom.days} 天</span>
              </div>
              <div className="info-row total-row">
                <span>预计房费：</span>
                <span className="amount">¥{200 * (selectedRoom.days || 0)}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModals}>
                取消
              </button>
              <button className="btn-primary" onClick={handleShowBill}>
                去结算
              </button>
            </div>
          </div>
        </div>
      )}

      {showBillModal && bill && (
        <div className="modal-overlay" onClick={closeModals}>
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

export default Rooms;
