import React, { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
    />
  );
};

export const WorkCardSkeleton: React.FC = () => {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <Skeleton height={160} />
      <div style={{ padding: '16px' }}>
        <Skeleton height={20} style={{ marginBottom: '8px' }} />
        <Skeleton width="60%" height={24} style={{ marginBottom: '8px' }} />
        <Skeleton width="80%" height={16} />
      </div>
    </div>
  );
};

export const WorkListSkeleton: React.FC = () => {
  return (
    <div className="works-grid">
      {[...Array(9)].map((_, i) => (
        <WorkCardSkeleton key={i} />
      ))}
    </div>
  );
};
