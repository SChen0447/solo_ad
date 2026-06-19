import React from 'react';
import '../styles/skeleton.css';

const SkeletonCard: React.FC = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-tags">
        <div className="skeleton-tag"></div>
        <div className="skeleton-tag"></div>
      </div>
      <div className="skeleton-avatar"></div>
      <div className="skeleton-name"></div>
      <div className="skeleton-bio-line"></div>
      <div className="skeleton-bio-line short"></div>
      <div className="skeleton-footer"></div>
    </div>
  );
};

export default SkeletonCard;
