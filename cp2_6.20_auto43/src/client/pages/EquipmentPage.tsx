import React, { useState, useEffect } from 'react';
import { Equipment } from '../types';

interface EquipmentPageProps {
  isMobile: boolean;
}

const EQUIPMENT_TYPES = ['全部', '吉他', '贝斯', '鼓', '键盘', '音响'];
const SORT_OPTIONS = [
  { value: 'brand-asc', label: '品牌 (A-Z)' },
  { value: 'brand-desc', label: '品牌 (Z-A)' },
  { value: 'year-asc', label: '年份 (新→旧)' },
  { value: 'year-desc', label: '年份 (旧→新)' }
];

const EquipmentPage: React.FC<EquipmentPageProps> = ({ isMobile }) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [filterType, setFilterType] = useState('全部');
  const [sortBy, setSortBy] = useState('brand-asc');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    quantity: 1,
    purchaseYear: new Date().getFullYear(),
    notes: '',
    imageUrl: '',
    type: '吉他',
    usageFrequency: 50
  });
  const [animateKey, setAnimateKey] = useState(0);

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    filterAndSortEquipment();
  }, [equipment, filterType, sortBy]);

  const fetchEquipment = async () => {
    try {
      const response = await fetch('/api/equipment');
      const data = await response.json();
      setEquipment(data);
    } catch (error) {
      console.error('Failed to fetch equipment:', error);
    }
  };

  const filterAndSortEquipment = () => {
    let result = [...equipment];

    if (filterType !== '全部') {
      result = result.filter(item => item.type === filterType);
    }

    switch (sortBy) {
      case 'brand-asc':
        result.sort((a, b) => a.brand.localeCompare(b.brand));
        break;
      case 'brand-desc':
        result.sort((a, b) => b.brand.localeCompare(a.brand));
        break;
      case 'year-asc':
        result.sort((a, b) => b.purchaseYear - a.purchaseYear);
        break;
      case 'year-desc':
        result.sort((a, b) => a.purchaseYear - b.purchaseYear);
        break;
    }

    setFilteredEquipment(result);
    setAnimateKey(prev => prev + 1);
  };

  const getUsageColor = (usage: number) => {
    const green = Math.floor((usage / 100) * 180);
    const gray = Math.floor(((100 - usage) / 100) * 128);
    return `rgb(${gray}, ${green + 50}, ${gray})`;
  };

  const handleOpenModal = (item?: Equipment) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        brand: item.brand,
        quantity: item.quantity,
        purchaseYear: item.purchaseYear,
        notes: item.notes,
        imageUrl: item.imageUrl,
        type: item.type,
        usageFrequency: item.usageFrequency
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        brand: '',
        quantity: 1,
        purchaseYear: new Date().getFullYear(),
        notes: '',
        imageUrl: '',
        type: '吉他',
        usageFrequency: 50
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await fetch(`/api/equipment/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        await fetch('/api/equipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      fetchEquipment();
      setShowModal(false);
    } catch (error) {
      console.error('Failed to save equipment:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个设备吗？')) {
      try {
        await fetch(`/api/equipment/${id}`, {
          method: 'DELETE'
        });
        fetchEquipment();
      } catch (error) {
        console.error('Failed to delete equipment:', error);
      }
    }
  };

  const cardWidth = isMobile ? '100%' : '220px';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>🎸 设备清单</h2>
        <button
          onClick={() => handleOpenModal()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#533483',
            color: 'white',
            fontWeight: '500'
          }}
        >
          + 添加设备
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '8px 12px' }}
        >
          {EQUIPMENT_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ padding: '8px 12px' }}
        >
          {SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div
        key={animateKey}
        className="fade-in"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        {filteredEquipment.map(item => (
          <div
            key={item.id}
            style={{
              width: cardWidth,
              backgroundColor: 'white',
              borderRadius: '10px',
              border: '2px solid #e0e0e0',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              padding: '16px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'pointer',
              color: '#1a1a2e',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#45B7D1',
                  color: 'white',
                  fontSize: '12px'
                }}
              >
                编辑
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#FF6B6B',
                  color: 'white',
                  fontSize: '12px'
                }}
              >
                删除
              </button>
            </div>

            {item.imageUrl && (
              <div style={{ width: '100%', height: '120px', marginBottom: '12px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            <div style={{ marginBottom: '8px' }}>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                backgroundColor: '#533483',
                color: 'white',
                borderRadius: '4px',
                fontSize: '12px',
                marginBottom: '8px'
              }}>
                {item.type}
              </span>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px', color: '#1a1a2e' }}>
              {item.name}
            </h3>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
              {item.brand} · {item.purchaseYear}年 · x{item.quantity}
            </div>
            {item.notes && (
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px', minHeight: '16px' }}>
                {item.notes}
              </div>
            )}

            <div style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>使用频次</span>
                <span>{item.usageFrequency}%</span>
              </div>
              <div style={{
                height: '6px',
                backgroundColor: '#e0e0e0',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${item.usageFrequency}%`,
                  height: '100%',
                  background: `linear-gradient(to right, #a0a0a0, ${getUsageColor(item.usageFrequency)})`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <>
          <div
            onClick={() => setShowModal(false)}
            className="fade-in"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 2000
            }}
          />
          <div
            className="scale-in"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              color: '#1a1a2e',
              padding: '30px',
              borderRadius: '12px',
              width: isMobile ? '90%' : '500px',
              maxHeight: '90vh',
              overflowY: 'auto',
              zIndex: 2001,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#1a1a2e' }}>
              {editingItem ? '编辑设备' : '添加设备'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>设备名 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd' }}
                    placeholder="例如：电吉他"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>品牌 *</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    required
                    style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd' }}
                    placeholder="例如：Fender"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>类型 *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                    style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd' }}
                  >
                    {EQUIPMENT_TYPES.filter(t => t !== '全部').map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>数量</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    min="1"
                    style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>购买年份</label>
                  <input
                    type="number"
                    value={formData.purchaseYear}
                    onChange={(e) => setFormData({ ...formData, purchaseYear: parseInt(e.target.value) || new Date().getFullYear() })}
                    min="1990"
                    max={new Date().getFullYear()}
                    style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>使用频次 (%)</label>
                  <input
                    type="range"
                    value={formData.usageFrequency}
                    onChange={(e) => setFormData({ ...formData, usageFrequency: parseInt(e.target.value) })}
                    min="0"
                    max="100"
                    style={{ width: '100%', marginTop: '8px' }}
                  />
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#666' }}>{formData.usageFrequency}%</div>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>图片URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd' }}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd', resize: 'vertical' }}
                  placeholder="设备备注..."
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#e0e0e0',
                    color: '#333',
                    fontWeight: '500'
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#533483',
                    color: 'white',
                    fontWeight: '500'
                  }}
                >
                  {editingItem ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default EquipmentPage;
