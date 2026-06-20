import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { eventApi, materialApi, showToast } from '../api/apiClient';
import type { Event, Material, Volunteer } from '../types';

let socket: Socket | null = null;

const getSocket = (): Socket => {
  if (!socket) {
    socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

const AnimatedCounter: React.FC<{ value: number; max: number }> = ({ value, max }) => {
  const spring = useSpring(0, {
    stiffness: 120,
    damping: 20,
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <motion.span className="counter-number">
      {Math.round(spring.get())}/{max} 人
    </motion.span>
  );
};

const SignupModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, phone: string) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      showToast('请填写完整信息', 'error');
      return;
    }
    onSubmit(name, phone);
    setName('');
    setPhone('');
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">志愿者报名</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">姓名</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入您的姓名"
            />
          </div>
          <div className="form-group">
            <label className="form-label">手机号</label>
            <input
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入您的手机号"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              确认报名
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const ClaimModal: React.FC<{
  material: Material | null;
  onClose: () => void;
  onSubmit: (quantity: number, claimant: string) => void;
}> = ({ material, onClose, onSubmit }) => {
  const [quantity, setQuantity] = useState(1);
  const [claimant, setClaimant] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimant || quantity <= 0) {
      showToast('请填写完整信息', 'error');
      return;
    }
    if (material && quantity > material.quantity - material.claimed) {
      showToast('申领数量超过库存', 'error');
      return;
    }
    onSubmit(quantity, claimant);
    setQuantity(1);
    setClaimant('');
  };

  if (!material) return null;

  const remaining = material.quantity - material.claimed;

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">申领物资 - {material.name}</h2>
        <p style={{ marginBottom: '16px', color: '#636e72', fontSize: '14px' }}>
          剩余库存: {remaining} {material.unit}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">申领人姓名</label>
            <input
              type="text"
              className="form-input"
              value={claimant}
              onChange={(e) => setClaimant(e.target.value)}
              placeholder="请输入您的姓名"
            />
          </div>
          <div className="form-group">
            <label className="form-label">申领数量 ({material.unit})</label>
            <input
              type="number"
              className="form-input"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              min="1"
              max={remaining}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              确认申领
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [claimMaterial, setClaimMaterial] = useState<Material | null>(null);

  const loadEvent = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await eventApi.getEvent(id);
      setEvent(data);
    } catch (error) {
      console.error('加载活动详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();

    const sock = getSocket();
    sock.on('material-updated', () => {
      loadEvent();
    });
    sock.on('volunteer-updated', () => {
      loadEvent();
    });

    return () => {
      sock.off('material-updated');
      sock.off('volunteer-updated');
    };
  }, [id]);

  const handleSignup = async (name: string, phone: string) => {
    if (!id) return;
    if (event && event.currentVolunteers >= event.targetVolunteers) {
      showToast('报名人数已满', 'error');
      return;
    }
    try {
      const updatedEvent = await eventApi.signup(id, { name, phone });
      setEvent(updatedEvent);
      showToast('报名成功！', 'success');
      setShowSignupModal(false);
    } catch (error) {
      console.error('报名失败:', error);
    }
  };

  const handleClaim = async (quantity: number, claimant: string) => {
    if (!claimMaterial) return;
    try {
      await materialApi.claimMaterial(claimMaterial.id, { quantity, claimant });
      showToast('申领成功！', 'success');
      setClaimMaterial(null);
      loadEvent();
    } catch (error) {
      console.error('申领失败:', error);
    }
  };

  if (loading) {
    return <div className="page-container"><div className="loading">加载中...</div></div>;
  }

  if (!event) {
    return <div className="page-container"><div className="loading">活动不存在</div></div>;
  }

  const progressPercent = event.targetVolunteers > 0
    ? Math.min((event.currentVolunteers / event.targetVolunteers) * 100, 100)
    : 0;
  const isFull = event.currentVolunteers >= event.targetVolunteers;

  return (
    <div className="page-container">
      <button className="btn btn-secondary back-btn" onClick={() => navigate(-1)}>
        ← 返回
      </button>

      <div className="detail-header">
        <div>
          <h1 className="detail-title">{event.name}</h1>
          <div className="detail-meta">
            <span>📅 {event.date}</span>
            <span>📍 {event.location}</span>
            {event.isExpired && <span className="badge badge-expired">已结束</span>}
          </div>
        </div>
        <button
          className="btn btn-primary"
          disabled={event.isExpired || isFull}
          onClick={() => setShowSignupModal(true)}
        >
          {event.isExpired ? '活动已结束' : isFull ? '名额已满' : '立即报名'}
        </button>
      </div>

      <div className="detail-section">
        <h2 className="section-title">活动描述</h2>
        <p className="detail-desc">{event.description}</p>
      </div>

      <div className="detail-section">
        <h2 className="section-title">报名进度</h2>
        <div className="signup-progress">
          <div className="progress-header">
            <AnimatedCounter value={event.currentVolunteers} max={event.targetVolunteers} />
            <span className="progress-percent">{Math.round(progressPercent)}%</span>
          </div>
          <div className="progress-bar large">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h2 className="section-title">志愿者名单 ({event.volunteers.length})</h2>
        {event.volunteers.length > 0 ? (
          <div className="volunteer-list">
            {event.volunteers.map((volunteer, index) => (
              <motion.div
                key={volunteer.id}
                className="volunteer-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <span className="volunteer-avatar">
                  {volunteer.name.charAt(0)}
                </span>
                <div className="volunteer-info">
                  <span className="volunteer-name">{volunteer.name}</span>
                  <span className="volunteer-phone">{volunteer.phone}</span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="empty-text">暂无志愿者报名</p>
        )}
      </div>

      <div className="detail-section">
        <h2 className="section-title">物资清单</h2>
        {event.materials.length > 0 ? (
          <div className="materials-grid">
            {event.materials.map((material) => {
              const remaining = material.quantity - material.claimed;
              const isClaimedOut = remaining <= 0;
              return (
                <motion.div
                  key={material.id}
                  className={`material-card ${isClaimedOut ? 'claimed-out' : ''}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  {isClaimedOut && (
                    <span className="sold-out-tag">已领完</span>
                  )}
                  <div className="material-info">
                    <h4 className="material-name">{material.name}</h4>
                    <p className="material-stock">
                      库存: {remaining} / {material.quantity} {material.unit}
                    </p>
                  </div>
                  <motion.button
                    className="claim-btn"
                    disabled={isClaimedOut || event.isExpired}
                    onClick={() => setClaimMaterial(material)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    animate={{ rotate: 0 }}
                  >
                    +
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="empty-text">暂无物资清单</p>
        )}
      </div>

      <div className="detail-section">
        <h2 className="section-title">活动进度</h2>
        <div className="timeline">
          {event.milestones.map((milestone, index) => (
            <div key={milestone.id} className="timeline-item">
              <div className="timeline-dot-wrapper">
                <span
                  className="timeline-dot"
                  style={{
                    backgroundColor: milestone.completed ? '#00b894' : '#dfe6e9',
                  }}
                />
                {index < event.milestones.length - 1 && (
                  <span
                    className="timeline-line"
                    style={{
                      backgroundColor: milestone.completed ? '#00b894' : '#dfe6e9',
                    }}
                  />
                )}
              </div>
              <div className="timeline-content">
                <span className={`timeline-name ${milestone.completed ? 'completed' : ''}`}>
                  {milestone.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showSignupModal && (
          <SignupModal
            isOpen={showSignupModal}
            onClose={() => setShowSignupModal(false)}
            onSubmit={handleSignup}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {claimMaterial && (
          <ClaimModal
            material={claimMaterial}
            onClose={() => setClaimMaterial(null)}
            onSubmit={handleClaim}
          />
        )}
      </AnimatePresence>

      <style>{`
        .back-btn {
          margin-bottom: 20px;
        }

        .detail-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 32px;
          padding: 32px;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
        }

        .detail-title {
          font-size: 28px;
          font-weight: 600;
          color: #2d3436;
          margin-bottom: 12px;
        }

        .detail-meta {
          display: flex;
          gap: 20px;
          color: #636e72;
          font-size: 14px;
        }

        .detail-section {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          padding: 24px;
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #2d3436;
          margin-bottom: 16px;
        }

        .detail-desc {
          color: #636e72;
          line-height: 1.8;
        }

        .signup-progress {
          padding: 8px 0;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .counter-number {
          font-size: 20px;
          font-weight: 600;
          color: #667eea;
        }

        .progress-percent {
          font-size: 16px;
          font-weight: 600;
          color: #636e72;
        }

        .progress-bar.large {
          height: 12px;
        }

        .volunteer-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .volunteer-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #f8f9fa;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .volunteer-item:hover {
          background: #eef0f3;
        }

        .volunteer-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
        }

        .volunteer-info {
          display: flex;
          flex-direction: column;
        }

        .volunteer-name {
          font-weight: 500;
          color: #2d3436;
        }

        .volunteer-phone {
          font-size: 13px;
          color: #636e72;
        }

        .empty-text {
          color: #b2bec3;
          text-align: center;
          padding: 20px;
        }

        .materials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }

        .material-card {
          position: relative;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.3s ease;
        }

        .material-card.claimed-out {
          opacity: 0.6;
          filter: grayscale(0.5);
        }

        .sold-out-tag {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 4px 8px;
          background: #ff4757;
          color: #fff;
          font-size: 11px;
          font-weight: 500;
          border-radius: 4px;
        }

        .material-info {
          flex: 1;
        }

        .material-name {
          font-size: 15px;
          font-weight: 500;
          color: #2d3436;
          margin-bottom: 4px;
        }

        .material-stock {
          font-size: 13px;
          color: #636e72;
        }

        .claim-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #a29bfe;
          color: #fff;
          border: none;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .claim-btn:hover:not(:disabled) {
          background: #6c5ce7;
          transform: rotate(360deg) scale(0.95);
        }

        .claim-btn:active:not(:disabled) {
          transform: rotate(360deg) scale(0.9);
        }

        .claim-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .timeline {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .timeline-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .timeline-dot-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 20px;
        }

        .timeline-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .timeline-line {
          width: 2px;
          height: 40px;
          margin: 4px 0;
          transition: all 0.3s ease;
        }

        .timeline-content {
          padding-bottom: 32px;
          padding-top: 0;
        }

        .timeline-name {
          font-size: 15px;
          color: #636e72;
          transition: all 0.3s ease;
        }

        .timeline-name.completed {
          color: #00b894;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default EventDetail;
