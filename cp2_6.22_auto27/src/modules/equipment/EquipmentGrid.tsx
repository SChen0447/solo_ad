/**
 * EquipmentGrid - 设备库存展示模块
 *
 * 职责：展示舞台设备清单，管理设备借用与归还状态
 *
 * 调用链路 & 数据流向：
 *   页面加载：
 *     App.tsx 初始化
 *       → 调用 apiClient.equipment.getAll() (apiClient.ts)
 *         → 后端返回设备列表 (server/index.ts /api/equipment)
 *           → App 组件保存到 equipment state
 *             → 通过 props 传入本组件 → 渲染网格
 *
 *   借用设备：
 *     用户点击"借用"按钮
 *       → 调用 apiClient.equipment.borrow(id) (apiClient.ts)
 *         → 后端减少可用数量并返回最新列表
 *           → 本组件调用 onEquipmentChange 更新父组件状态
 *             → React 重新渲染设备网格
 *
 *   归还设备：
 *     用户点击"归还"按钮
 *       → 调用 apiClient.equipment.returnItem(id) (apiClient.ts)
 *         → 后端增加可用数量并返回最新列表
 *           → 本组件调用 onEquipmentChange 更新父组件状态
 *             → React 重新渲染设备网格
 *
 * 被调用方：App.tsx (通过 props 传入 equipment 和 onEquipmentChange)
 * 调用方依赖：apiClient.equipment.{getAll, borrow, returnItem}
 */

import React, { useState, useCallback, useEffect } from 'react';
import { apiClient, Equipment } from '@/api/apiClient';

interface EquipmentGridProps {
  equipment: Equipment[];
  onEquipmentChange: (equipment: Equipment[]) => void;
}

const EquipmentGrid: React.FC<EquipmentGridProps> = ({ equipment, onEquipmentChange }) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleBorrow = useCallback(async (id: string) => {
    if (loadingId) return;
    setLoadingId(id);
    setError(null);
    try {
      const updated = await apiClient.equipment.borrow(id);
      onEquipmentChange(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : '借用失败');
    } finally {
      setLoadingId(null);
    }
  }, [loadingId, onEquipmentChange]);

  const handleReturn = useCallback(async (id: string) => {
    if (loadingId) return;
    setLoadingId(id);
    setError(null);
    try {
      const updated = await apiClient.equipment.returnItem(id);
      onEquipmentChange(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : '归还失败');
    } finally {
      setLoadingId(null);
    }
  }, [loadingId, onEquipmentChange]);

  return (
    <div className="equipment-grid-container">
      <div className="equipment-header">
        <h2 style={{ color: '#C084FC', fontSize: '24px', fontWeight: 700, margin: 0 }}>
          🎸 设备库存
        </h2>
      </div>

      {error && (
        <div className="error-toast">
          ⚠️ {error}
        </div>
      )}

      <div className="equipment-grid">
        {equipment.map((item) => {
          const isAvailable = item.available > 0;
          const isAllBorrowed = item.available === 0;
          const isLoading = loadingId === item.id;
          return (
            <div
              key={item.id}
              className={`equipment-card ${isAllBorrowed ? 'unavailable' : ''} ${isLoading ? 'loading' : ''}`}
            >
              <div className="equipment-icon">
                {item.name.includes('吉他') ? '🎸' :
                 item.name.includes('贝斯') ? '🎸' :
                 item.name.includes('鼓') ? '🥁' :
                 item.name.includes('键盘') ? '🎹' :
                 item.name.includes('麦克风') ? '🎤' :
                 item.name.includes('音箱') ? '🔊' :
                 item.name.includes('调音') ? '🎛️' :
                 item.name.includes('耳机') ? '🎧' : '🎵'}
              </div>
              <div className="equipment-name">{item.name}</div>
              <div className="equipment-counts">
                <span className="count-total">总计: {item.total}</span>
                <span className={`count-available ${isAvailable ? 'has-stock' : 'no-stock'}`}>
                  可用: {item.available}
                </span>
              </div>
              <div className="equipment-availability-bar">
                <div
                  className="availability-fill"
                  style={{ width: `${(item.available / item.total) * 100}%` }}
                />
              </div>
              <div className="equipment-action">
                {isAvailable ? (
                  <button
                    className="btn-borrow ripple"
                    onClick={() => handleBorrow(item.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? '...' : '借用'}
                  </button>
                ) : (
                  <button className="btn-borrow-disabled" disabled>
                    已借完
                  </button>
                )}
                {item.available < item.total && (
                  <button
                    className="btn-return ripple"
                    onClick={() => handleReturn(item.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? '...' : '归还'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .equipment-grid-container {
          width: 100%;
        }
        .equipment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .error-toast {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #EF4444;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
          animation: slideDown 0.3s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .equipment-grid {
          display: grid;
          grid-template-columns: repeat(4, 240px);
          gap: 20px;
          justify-content: center;
        }
        @media (max-width: 1100px) {
          .equipment-grid {
            grid-template-columns: repeat(3, 240px);
          }
        }
        @media (max-width: 768px) {
          .equipment-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }
        .equipment-card {
          width: 240px;
          height: 180px;
          background: rgba(30, 27, 75, 0.5);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.3s;
          box-shadow: 0 2px #E5E7EB22;
        }
        @media (max-width: 768px) {
          .equipment-card {
            width: 100%;
          }
        }
        .equipment-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .equipment-card.loading {
          pointer-events: none;
          opacity: 0.7;
        }
        .equipment-card.unavailable {
          opacity: 0.5;
        }
        .equipment-card.unavailable:hover {
          transform: none;
          box-shadow: 0 2px #E5E7EB22;
        }
        .equipment-icon {
          font-size: 28px;
          margin-bottom: 4px;
        }
        .equipment-name {
          color: #E5E7EB;
          font-size: 16px;
          font-weight: 600;
        }
        .equipment-counts {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
        .count-total {
          color: #9CA3AF;
        }
        .count-available.has-stock {
          color: #10B981;
        }
        .count-available.no-stock {
          color: #EF4444;
        }
        .equipment-availability-bar {
          height: 4px;
          background: rgba(99, 102, 241, 0.15);
          border-radius: 2px;
          overflow: hidden;
        }
        .availability-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366F1, #C084FC);
          border-radius: 2px;
          transition: width 0.3s;
        }
        .equipment-action {
          display: flex;
          gap: 8px;
        }
        .btn-borrow {
          flex: 1;
          padding: 6px 0;
          border-radius: 6px;
          border: none;
          background: #10B981;
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }
        .btn-borrow:hover {
          background: #059669;
        }
        .btn-borrow:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-borrow-disabled {
          flex: 1;
          padding: 6px 0;
          border-radius: 6px;
          border: none;
          background: #EF4444;
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: not-allowed;
          opacity: 0.7;
        }
        .btn-return {
          flex: 1;
          padding: 6px 0;
          border-radius: 6px;
          border: 1px solid rgba(99, 102, 241, 0.3);
          background: transparent;
          color: #6366F1;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }
        .btn-return:hover {
          background: rgba(99, 102, 241, 0.1);
        }
        .btn-return:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default EquipmentGrid;
