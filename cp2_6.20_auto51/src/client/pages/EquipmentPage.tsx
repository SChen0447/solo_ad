import React, { useState, useEffect, useCallback } from 'react';

interface Equipment {
  id: string;
  name: string;
  brand: string;
  quantity: number;
  purchaseYear: number;
  notes: string;
  imageUrl: string;
  type: string;
  usageFrequency: number;
}

const EQUIPMENT_TYPES = ['全部', '吉他', '贝斯', '鼓', '键盘', '音响', '其他'];

const EquipmentPage: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filterType, setFilterType] = useState('全部');
  const [sortBy, setSortBy] = useState<'brand' | 'year'>('brand');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    quantity: 1,
    purchaseYear: new Date().getFullYear(),
    notes: '',
    imageUrl: '',
    type: '吉他'
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await fetch('/api/equipment');
      const data = await res.json();
      setEquipment(data);
      setFadeKey(prev => prev + 1);
    } catch (err) {
      console.error('Failed to fetch equipment:', err);
    }
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const filteredEquipment = equipment.filter(item => {
    if (filterType === '全部') return true;
    return item.type === filterType;
  });

  const sortedEquipment = [...filteredEquipment].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'brand') {
      comparison = a.brand.localeCompare(b.brand);
    } else {
      comparison = a.purchaseYear - b.purchaseYear;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleFilterChange = (type: string) => {
    setFilterType(type);
    setFadeKey(prev => prev + 1);
  };

  const handleSortChange = (sort: 'brand' | 'year') => {
    if (sortBy === sort) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(sort);
      setSortOrder('asc');
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      brand: '',
      quantity: 1,
      purchaseYear: new Date().getFullYear(),
      notes: '',
      imageUrl: '',
      type: '吉他'
    });
    setShowModal(true);
  };

  const openEditModal = (item: Equipment) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      brand: item.brand,
      quantity: item.quantity,
      purchaseYear: item.purchaseYear,
      notes: item.notes,
      imageUrl: item.imageUrl,
      type: item.type
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        const res = await fetch(`/api/equipment/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        await res.json();
      } else {
        const res = await fetch('/api/equipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        await res.json();
      }
      setShowModal(false);
      fetchEquipment();
    } catch (err) {
      console.error('Failed to save equipment:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这件设备吗？')) return;
    try {
      await fetch(`/api/equipment/${id}`, { method: 'DELETE' });
      fetchEquipment();
    } catch (err) {
      console.error('Failed to delete equipment:', err);
    }
  };

  const getProgressColor = (progress: number) => {
    const green = Math.round((progress / 100) * 200 + 55);
    const gray = 128;
    const r = Math.round(gray + (progress / 100) * (55 - gray));
    const g = Math.round(gray + (progress / 100) * (green - gray));
    const b = Math.round(gray + (progress / 100) * (55 - gray));
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="equipment-page">
      <div className="page-header">
        <h2 className="page-title">设备清单</h2>
        <button className="btn btn-primary add-btn" onClick={openAddModal}>
          + 添加设备
        </button>
      </div>

      <div className="filter-bar">
        <div className="filter-types">
          {EQUIPMENT_TYPES.map(type => (
            <button
              key={type}
              className={`filter-btn ${filterType === type ? 'active' : ''}`}
              onClick={() => handleFilterChange(type)}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="sort-options">
          <span className="sort-label">排序：</span>
          <button
            className={`sort-btn ${sortBy === 'brand' ? 'active' : ''}`}
            onClick={() => handleSortChange('brand')}
          >
            品牌 {sortBy === 'brand' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className={`sort-btn ${sortBy === 'year' ? 'active' : ''}`}
            onClick={() => handleSortChange('year')}
          >
            年份 {sortBy === 'year' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      <div className="equipment-grid" key={fadeKey}>
        {sortedEquipment.map((item, index) => (
          <div
            key={item.id}
            className="equipment-card fade-in"
            style={{ animationDelay: `${index * 0.05}s` }}
            onDoubleClick={() => openEditModal(item)}
          >
            <div className="card-image">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} />
              ) : (
                <div className="placeholder-icon">
                  {item.type === '吉他' && '🎸'}
                  {item.type === '贝斯' && '🎻'}
                  {item.type === '鼓' && '🥁'}
                  {item.type === '键盘' && '🎹'}
                  {item.type === '音响' && '🔊'}
                  {item.type === '其他' && '🎵'}
                </div>
              )}
            </div>
            <div className="card-content">
              <h3 className="equipment-name">{item.name}</h3>
              <p className="equipment-brand">{item.brand}</p>
              <div className="equipment-meta">
                <span>数量: {item.quantity}</span>
                <span>{item.purchaseYear}年</span>
              </div>
              {item.notes && <p className="equipment-notes">{item.notes}</p>}
            </div>
            <div className="card-footer">
              <div className="usage-label">使用频次</div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${item.usageFrequency}%`,
                    backgroundColor: getProgressColor(item.usageFrequency)
                  }}
                />
              </div>
              <span className="usage-percent">{item.usageFrequency}%</span>
            </div>
            <div className="card-actions">
              <button className="action-btn edit-btn" onClick={() => openEditModal(item)}>
                编辑
              </button>
              <button className="action-btn delete-btn" onClick={() => handleDelete(item.id)}>
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {sortedEquipment.length === 0 && (
        <div className="empty-state">
          <p>暂无设备数据</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{editingItem ? '编辑设备' : '添加设备'}</h3>
            <form onSubmit={handleSubmit} className="equipment-form">
              <div className="form-row">
                <div className="form-group">
                  <label>设备名</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>品牌</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={e => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>类型</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    {EQUIPMENT_TYPES.filter(t => t !== '全部').map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>数量</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={e => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>购买年份</label>
                <input
                  type="number"
                  value={formData.purchaseYear}
                  onChange={e => setFormData(prev => ({ ...prev, purchaseYear: Number(e.target.value) }))}
                  min="1990"
                  max="2030"
                  required
                />
              </div>
              <div className="form-group">
                <label>图片URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={e => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="可选"
                />
              </div>
              <div className="form-group">
                <label>备注</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="可选"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .equipment-page {
          background-color: #16213e;
          border-radius: 12px;
          padding: 24px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #e0e0e0;
        }

        .add-btn {
          padding: 10px 20px;
        }

        .btn {
          padding: 10px 24px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: filter 0.2s ease;
        }

        .btn:hover {
          filter: brightness(1.2);
        }

        .btn-primary {
          background-color: #4ECDC4;
          color: #fff;
        }

        .btn-secondary {
          background-color: #e0e0e0;
          color: #333;
        }

        .filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .filter-types {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          background-color: #0f3460;
          color: #e0e0e0;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-btn:hover {
          filter: brightness(1.2);
        }

        .filter-btn.active {
          background-color: #4ECDC4;
          color: #fff;
        }

        .sort-options {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sort-label {
          font-size: 13px;
          color: #888;
        }

        .sort-btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #0f3460;
          background: transparent;
          color: #e0e0e0;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sort-btn.active {
          border-color: #4ECDC4;
          color: #4ECDC4;
        }

        .equipment-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }

        .equipment-card {
          width: 220px;
          background-color: #fff;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: all 0.2s ease;
          position: relative;
          opacity: 0;
          animation: fadeInUp 0.4s ease forwards;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .equipment-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }

        .card-image {
          height: 120px;
          background-color: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-icon {
          font-size: 48px;
        }

        .card-content {
          padding: 12px;
        }

        .equipment-name {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .equipment-brand {
          font-size: 13px;
          color: #666;
          margin-bottom: 8px;
        }

        .equipment-meta {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #888;
        }

        .equipment-notes {
          font-size: 12px;
          color: #666;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #f0f0f0;
        }

        .card-footer {
          padding: 12px;
          border-top: 1px solid #f0f0f0;
          background-color: #fafafa;
        }

        .usage-label {
          font-size: 11px;
          color: #888;
          margin-bottom: 6px;
        }

        .progress-bar {
          height: 6px;
          background-color: #e0e0e0;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 4px;
        }

        .progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .usage-percent {
          font-size: 11px;
          color: #666;
          float: right;
        }

        .card-actions {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .equipment-card:hover .card-actions {
          opacity: 1;
        }

        .action-btn {
          padding: 4px 10px;
          border-radius: 4px;
          border: none;
          font-size: 11px;
          cursor: pointer;
          transition: filter 0.2s ease;
        }

        .action-btn:hover {
          filter: brightness(1.1);
        }

        .edit-btn {
          background-color: #45B7D1;
          color: #fff;
        }

        .delete-btn {
          background-color: #FF6B6B;
          color: #fff;
        }

        .empty-state {
          text-align: center;
          padding: 60px;
          color: #888;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        .modal-content {
          background-color: #fff;
          border-radius: 12px;
          padding: 28px;
          width: 90%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .scale-in {
          animation: scaleIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .modal-title {
          font-size: 20px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 20px;
        }

        .equipment-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          background-color: #fff;
          color: #333;
          transition: border-color 0.2s ease;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #4ECDC4;
        }

        .form-group textarea {
          resize: vertical;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 8px;
        }

        @media (max-width: 768px) {
          .equipment-page {
            padding: 16px;
          }

          .page-title {
            font-size: 20px;
          }

          .equipment-grid {
            gap: 12px;
          }

          .equipment-card {
            width: 100%;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .filter-bar {
            flex-direction: column;
            align-items: flex-start;
          }

          .card-actions {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default EquipmentPage;
