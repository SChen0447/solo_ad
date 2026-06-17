import React, { useState } from 'react';
import type { Package } from '../types';
import { api } from '../services/api';
import { getRelativeTime, formatExactTime } from '../utils/formatTime';

interface PackageDetailProps {
  pkg: Package;
  onNotifySuccess: (updatedPkg: Package) => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'pending':
      return { text: '待取件', color: '#2196f3', bgColor: 'rgba(33, 150, 243, 0.1)' };
    case 'picked':
      return { text: '已取件', color: '#4caf50', bgColor: 'rgba(76, 175, 80, 0.1)' };
    case 'overdue':
      return { text: '已超时', color: '#f44336', bgColor: 'rgba(244, 67, 54, 0.1)' };
    default:
      return { text: status, color: '#666', bgColor: '#f0f0f0' };
  }
};

const PackageDetail: React.FC<PackageDetailProps> = ({ pkg, onNotifySuccess }) => {
  const [notifying, setNotifying] = useState(false);
  const statusConfig = getStatusConfig(pkg.status);

  const handleNotify = async () => {
    if (notifying) return;
    setNotifying(true);
    try {
      const response = await api.notifyOwner(pkg.id);
      if (response.success) {
        const updatedPkg: Package = {
          ...pkg,
          lastNotifiedAt: response.lastNotifiedAt
        };
        onNotifySuccess(updatedPkg);
      }
    } catch (err) {
      console.error('Notify failed:', err);
      alert(err instanceof Error ? err.message : '通知发送失败');
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="detail-container">
      <div className="detail-header">
        <h2 className="detail-title">包裹详情</h2>
        <div
          className="detail-status-badge"
          style={{
            color: statusConfig.color,
            backgroundColor: statusConfig.bgColor
          }}
        >
          {statusConfig.text}
        </div>
      </div>

      <div className="detail-card">
        <div className="detail-section">
          <h3 className="detail-section-title">收件人信息</h3>
          <div className="detail-info-grid">
            <div className="detail-info-item">
              <span className="detail-label">姓名</span>
              <span className="detail-value">{pkg.recipientName}</span>
            </div>
            <div className="detail-info-item">
              <span className="detail-label">联系电话</span>
              <span className="detail-value">{pkg.phone}</span>
            </div>
          </div>
        </div>

        <div className="detail-divider" />

        <div className="detail-section">
          <h3 className="detail-section-title">包裹信息</h3>
          <div className="detail-info-grid">
            <div className="detail-info-item">
              <span className="detail-label">快递公司</span>
              <span className="detail-value">{pkg.courierCompany}</span>
            </div>
            <div className="detail-info-item">
              <span className="detail-label">包裹编号</span>
              <span className="detail-value monospace">{pkg.id}</span>
            </div>
            <div className="detail-info-item">
              <span className="detail-label">取件码</span>
              <span className="detail-value pickup-code-display">{pkg.pickupCode}</span>
            </div>
            {pkg.remark && (
              <div className="detail-info-item detail-info-full">
                <span className="detail-label">备注</span>
                <span className="detail-value">{pkg.remark}</span>
              </div>
            )}
          </div>
        </div>

        <div className="detail-divider" />

        <div className="detail-section">
          <h3 className="detail-section-title">时间信息</h3>
          <div className="detail-info-grid">
            <div className="detail-info-item">
              <span className="detail-label">存入时间</span>
              <span className="detail-value">{formatExactTime(pkg.createdAt)}</span>
              <span className="detail-sub">（{getRelativeTime(pkg.createdAt)}）</span>
            </div>
            {pkg.pickedAt && (
              <div className="detail-info-item">
                <span className="detail-label">取件时间</span>
                <span className="detail-value">{formatExactTime(pkg.pickedAt)}</span>
                <span className="detail-sub">（{getRelativeTime(pkg.pickedAt)}）</span>
              </div>
            )}
          </div>
        </div>

        <div className="detail-divider" />

        <div className="detail-section">
          <h3 className="detail-section-title">通知管理</h3>
          <div className="notify-section">
            <button
              className="btn btn-primary notify-btn"
              onClick={handleNotify}
              disabled={notifying}
            >
              {notifying ? '发送中...' : '📨 通知业主取件'}
            </button>
            <div className="last-notify-info">
              最近通知时间：
              {pkg.lastNotifiedAt ? (
                <span>
                  <strong>{formatExactTime(pkg.lastNotifiedAt)}</strong>
                  <span className="detail-sub">（{getRelativeTime(pkg.lastNotifiedAt)}）</span>
                </span>
              ) : (
                <span style={{ color: '#999' }}>暂无通知记录</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageDetail;
