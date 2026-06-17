import React from 'react';
import type { Package } from '../types';

interface PackageListProps {
  packages: Package[];
  onPackageClick: (pkg: Package) => void;
}

const getHoursAgo = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours >= 24) {
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}天前存放`;
  }
  if (diffHours > 0) {
    return `${diffHours}小时前存放`;
  }
  if (diffMins > 0) {
    return `${diffMins}分钟前存放`;
  }
  return '刚刚存放';
};

const getStatusText = (status: string): string => {
  switch (status) {
    case 'pending':
      return '待取';
    case 'picked':
      return '已取';
    case 'overdue':
      return '超时';
    default:
      return status;
  }
};

const PackageList: React.FC<PackageListProps> = ({ packages, onPackageClick }) => {
  return (
    <div>
      <h2 className="package-list-title">包裹列表</h2>
      <div className="package-grid">
        {packages.length === 0 ? (
          <div className="empty-state">暂无包裹</div>
        ) : (
          packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`package-card ${pkg.status}`}
              onClick={() => onPackageClick(pkg)}
            >
              <span className={`status-tag ${pkg.status}`}>
                {getStatusText(pkg.status)}
              </span>
              <div className="package-info">
                <div className="package-recipient">{pkg.recipientName}</div>
                <div className="package-id">{pkg.id.slice(0, 8)}...</div>
              </div>
              <div className="package-footer">{getHoursAgo(pkg.createdAt)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PackageList;
