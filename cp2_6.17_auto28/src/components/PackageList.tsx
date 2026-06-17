import React from 'react';
import type { Package } from '../types';
import { getStorageDuration } from '../utils/formatTime';

interface PackageListProps {
  packages: Package[];
  onPackageClick: (pkg: Package) => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'pending':
      return { text: '待取', dotColor: '#fff' };
    case 'picked':
      return { text: '已取', dotColor: '#fff' };
    case 'overdue':
      return { text: '超时', dotColor: '#fff' };
    default:
      return { text: status, dotColor: '#fff' };
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
          packages.map((pkg) => {
            const statusConfig = getStatusConfig(pkg.status);
            return (
              <div
                key={pkg.id}
                className={`package-card ${pkg.status}`}
                onClick={() => onPackageClick(pkg)}
              >
                <span className={`status-tag ${pkg.status}`}>
                  <span
                    className="status-dot"
                    style={{ backgroundColor: statusConfig.dotColor }}
                  />
                  {statusConfig.text}
                </span>
                <div className="package-info">
                  <div className="package-recipient">{pkg.recipientName}</div>
                  <div className="package-id">{pkg.id.slice(0, 8)}...</div>
                </div>
                <div className="package-footer">{getStorageDuration(pkg.createdAt)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PackageList;
