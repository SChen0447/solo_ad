import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { materialApi, eventApi, showToast } from '../api/apiClient';
import type { Material, MaterialClaim, Event } from '../types';

let socket: Socket | null = null;

const getSocket = (): Socket => {
  if (!socket) {
    socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

const MaterialCard: React.FC<{
  material: Material;
  onClaim: (material: Material) => void;
  onEdit: (material: Material) => void;
  onDelete: (id: string) => void;
}> = ({ material, onClaim, onEdit, onDelete }) => {
  const remaining = material.quantity - material.claimed;
  const isClaimedOut = remaining <= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`material-card-board ${isClaimedOut ? 'claimed-out' : ''}`}
    >
      {isClaimedOut && <span className="sold-out-tag">已领完</span>}
      
      <motion.button
        className="claim-btn-board"
        disabled={isClaimedOut}
        onClick={() => onClaim(material)}
        whileHover={isClaimedOut ? {} : { scale: 1.1, rotate: 360 }}
        whileTap={isClaimedOut ? {} : { scale: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        +
      </motion.button>

      <div className="material-content">
        <h4 className="material-name-board">{material.name}</h4>
        <p className="material-quantity">
          库存: {remaining} / {material.quantity}
        </p>
        <p className="material-unit">单位: {material.unit}</p>
      </div>

      <div className="material-actions">
        <button className="action-btn edit" onClick={() => onEdit(material)}>
          编辑
        </button>
        <button className="action-btn delete" onClick={() => onDelete(material.id)}>
          删除
        </button>
      </div>
    </motion.div>
  );
};

const MaterialModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  material?: Material | null;
  events: Event[];
}> = ({ isOpen, onClose, onSubmit, material, events }) => {
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: '',
    eventId: '',
  });

  useEffect(() => {
    if (material) {
      setFormData({
        name: material.name,
        quantity: material.quantity.toString(),
        unit: material.unit,
        eventId: material.eventId,
      });
    } else {
      setFormData({
        name: '',
        quantity: '',
        unit: '',
        eventId: events[0]?.id || '',
      });
    }
  }, [material, events]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.quantity || !formData.unit) {
      showToast('请填写完整信息', 'error');
      return;
    }
    onSubmit({
      ...formData,
      quantity: parseInt(formData.quantity),
    });
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
        <h2 className="modal-title">{material ? '编辑物资' : '新增物资'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">物资名称</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入物资名称"
            />
          </div>
          <div className="form-group">
            <label className="form-label">数量</label>
            <input
              type="number"
              className="form-input"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="请输入数量"
              min="0"
            />
          </div>
          <div className="form-group">
            <label className="form-label">单位</label>
            <input
              type="text"
              className="form-input"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="如：个、件、箱"
            />
          </div>
          <div className="form-group">
            <label className="form-label">所属活动</label>
            <select
              className="form-input"
              value={formData.eventId}
              onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {material ? '保存' : '添加'}
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

  useEffect(() => {
    if (material) {
      setQuantity(1);
    }
  }, [material]);

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

const MaterialBoard: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [claims, setClaims] = useState<MaterialClaim[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [claimMaterial, setClaimMaterial] = useState<Material | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'claims'>('inventory');

  const loadData = async () => {
    try {
      setLoading(true);
      const [materialsData, claimsData, eventsData] = await Promise.all([
        materialApi.getMaterials(),
        materialApi.getClaims(),
        eventApi.getEvents(),
      ]);
      setMaterials(materialsData);
      setClaims(claimsData);
      setEvents(eventsData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const sock = getSocket();
    sock.on('material-updated', () => {
      loadData();
    });

    return () => {
      sock.off('material-updated');
    };
  }, []);

  const handleAddMaterial = async (data: any) => {
    try {
      await materialApi.createMaterial(data);
      showToast('物资添加成功', 'success');
      setShowAddModal(false);
      loadData();
    } catch (error) {
      console.error('添加物资失败:', error);
    }
  };

  const handleEditMaterial = async (data: any) => {
    if (!editingMaterial) return;
    try {
      await materialApi.updateMaterial(editingMaterial.id, data);
      showToast('物资更新成功', 'success');
      setEditingMaterial(null);
      loadData();
    } catch (error) {
      console.error('更新物资失败:', error);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('确定要删除该物资吗？')) return;
    try {
      await materialApi.deleteMaterial(id);
      showToast('物资删除成功', 'success');
      loadData();
    } catch (error) {
      console.error('删除物资失败:', error);
    }
  };

  const handleClaim = async (quantity: number, claimant: string) => {
    if (!claimMaterial) return;
    try {
      await materialApi.claimMaterial(claimMaterial.id, { quantity, claimant });
      showToast('申领成功！', 'success');
      setClaimMaterial(null);
      loadData();
    } catch (error) {
      console.error('申领失败:', error);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">物资管理</h1>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + 新增物资
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          库存管理
        </button>
        <button
          className={`tab ${activeTab === 'claims' ? 'active' : ''}`}
          onClick={() => setActiveTab('claims')}
        >
          申领记录
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : activeTab === 'inventory' ? (
        <div className="materials-board-grid">
          <AnimatePresence>
            {materials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                onClaim={setClaimMaterial}
                onEdit={setEditingMaterial}
                onDelete={handleDeleteMaterial}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="claims-list">
          {claims.length > 0 ? (
            claims.map((claim, index) => (
              <motion.div
                key={claim.id}
                className="claim-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="claim-info">
                  <span className="claim-material">{claim.materialName}</span>
                  <span className="claim-quantity">
                    申领数量: {claim.quantity}
                  </span>
                </div>
                <div className="claim-meta">
                  <span>申领人: {claim.claimant}</span>
                  <span className="claim-time">{claim.claimedAt}</span>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="empty-state">
              <p>暂无申领记录</p>
            </div>
          )}
        </div>
      )}

      {!loading && materials.length === 0 && activeTab === 'inventory' && (
        <div className="empty-state">
          <p>暂无物资，点击上方按钮添加物资吧！</p>
        </div>
      )}

      <AnimatePresence>
        {showAddModal && (
          <MaterialModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSubmit={handleAddMaterial}
            events={events}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingMaterial && (
          <MaterialModal
            isOpen={!!editingMaterial}
            onClose={() => setEditingMaterial(null)}
            onSubmit={handleEditMaterial}
            material={editingMaterial}
            events={events}
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
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          background: #fff;
          padding: 8px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
          width: fit-content;
        }

        .tab {
          padding: 10px 24px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #636e72;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .tab.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
        }

        .tab:hover:not(.active) {
          background: #f0f1f5;
        }

        .materials-board-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        @media (min-width: 768px) {
          .materials-board-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .materials-board-grid {
            grid-template-columns: repeat(6, 1fr);
          }
        }

        .material-card-board {
          position: relative;
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .material-card-board.claimed-out {
          opacity: 0.6;
          filter: grayscale(0.5);
        }

        .material-card-board:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.12);
        }

        .claim-btn-board {
          position: absolute;
          top: 16px;
          right: 16px;
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
          z-index: 2;
        }

        .claim-btn-board:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .material-content {
          padding-top: 24px;
        }

        .material-name-board {
          font-size: 15px;
          font-weight: 600;
          color: #2d3436;
          margin-bottom: 8px;
        }

        .material-quantity {
          font-size: 13px;
          color: #636e72;
          margin-bottom: 4px;
        }

        .material-unit {
          font-size: 12px;
          color: #b2bec3;
        }

        .material-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
        }

        .action-btn {
          flex: 1;
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .action-btn.edit {
          background: #e8f5e9;
          color: #00b894;
        }

        .action-btn.edit:hover {
          background: #c8e6c9;
        }

        .action-btn.delete {
          background: #ffebee;
          color: #ff4757;
        }

        .action-btn.delete:hover {
          background: #ffcdd2;
        }

        .sold-out-tag {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 4px 8px;
          background: #ff4757;
          color: #fff;
          font-size: 11px;
          font-weight: 500;
          border-radius: 4px;
          z-index: 1;
        }

        .claims-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .claim-item {
          background: #fff;
          border-radius: 12px;
          padding: 16px 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s ease;
        }

        .claim-item:hover {
          transform: translateX(4px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
        }

        .claim-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .claim-material {
          font-size: 15px;
          font-weight: 600;
          color: #2d3436;
        }

        .claim-quantity {
          font-size: 13px;
          color: #667eea;
        }

        .claim-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: right;
        }

        .claim-meta span {
          font-size: 13px;
          color: #636e72;
        }

        .claim-time {
          font-size: 12px !important;
          color: #b2bec3 !important;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #636e72;
        }
      `}</style>
    </div>
  );
};

export default MaterialBoard;
