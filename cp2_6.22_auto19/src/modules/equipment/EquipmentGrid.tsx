import React, { useState, useEffect } from 'react';
import { Equipment, equipmentApi } from '@/api/apiClient';
import './EquipmentGrid.css';

const EquipmentGrid: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    setLoading(true);
    try {
      const data = await equipmentApi.getEquipmentList();
      setEquipmentList(data);
    } catch (error) {
      console.error('加载设备列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async (id: string) => {
    setActionLoading(id);
    try {
      const updated = await equipmentApi.borrowEquipment(id);
      setEquipmentList(equipmentList.map((e) => (e.id === id ? updated : e)));
    } catch (error) {
      console.error('借用设备失败:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturn = async (id: string) => {
    setActionLoading(id);
    try {
      const updated = await equipmentApi.returnEquipment(id);
      setEquipmentList(equipmentList.map((e) => (e.id === id ? updated : e)));
    } catch (error) {
      console.error('归还设备失败:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="equipment-grid-container">
      <div className="equipment-header">
        <h2>设备库存</h2>
        <div className="equipment-summary">
          共 {equipmentList.length} 种设备
        </div>
      </div>

      <div className="equipment-grid">
        {equipmentList.map((equipment) => {
          const isAvailable = equipment.available > 0;
          const isAllReturned = equipment.available === equipment.total;
          return (
            <div
              key={equipment.id}
              className={`equipment-card ${!isAvailable ? 'unavailable' : ''}`}
            >
              <div className="equipment-icon">
                {getEquipmentIcon(equipment.name)}
              </div>
              <div className="equipment-name">{equipment.name}</div>
              <div className="equipment-stats">
                <div className="stat-item">
                  <span className="stat-label">总数</span>
                  <span className="stat-value">{equipment.total}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">可用</span>
                  <span className={`stat-value ${isAvailable ? 'available' : 'unavailable'}`}>
                    {equipment.available}
                  </span>
                </div>
              </div>
              <div className="equipment-actions">
                <button
                  className="borrow-btn"
                  onClick={() => handleBorrow(equipment.id)}
                  disabled={!isAvailable || actionLoading === equipment.id}
                >
                  {actionLoading === equipment.id ? '...' : isAvailable ? '借用' : '已借完'}
                </button>
                <button
                  className="return-btn"
                  onClick={() => handleReturn(equipment.id)}
                  disabled={isAllReturned || actionLoading === equipment.id}
                >
                  {actionLoading === equipment.id ? '...' : '归还'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function getEquipmentIcon(name: string): string {
  const iconMap: Record<string, string> = {
    '电吉他': '🎸',
    '贝斯': '🎸',
    '架子鼓': '🥁',
    '键盘': '🎹',
    '麦克风': '🎤',
    '音箱': '🔊',
    '效果器': '🎛️',
    '调音台': '🎚️',
  };
  return iconMap[name] || '🎵';
}

export default EquipmentGrid;
