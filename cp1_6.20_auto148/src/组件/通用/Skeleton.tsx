import React from 'react'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  style?: React.CSSProperties
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style = {},
}) => {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  )
}

export const TicketListSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            width: '100%',
            height: 80,
            padding: 16,
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <Skeleton width={60} height={20} borderRadius={4} />
          <Skeleton width={120} height={20} borderRadius={4} />
          <Skeleton width={80} height={24} borderRadius={12} />
          <Skeleton width={100} height={16} borderRadius={4} />
        </div>
      ))}
    </div>
  )
}

export const TicketDetailSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton width={200} height={32} borderRadius={4} />
      <div style={{ display: 'flex', gap: 12 }}>
        <Skeleton width={80} height={24} borderRadius={12} />
        <Skeleton width={80} height={24} borderRadius={12} />
      </div>
      <Skeleton width="100%" height={100} borderRadius={8} />
      <Skeleton width="60%" height={20} borderRadius={4} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton width={100} height={28} borderRadius={14} />
        <Skeleton width={100} height={28} borderRadius={14} />
        <Skeleton width={100} height={28} borderRadius={14} />
      </div>
    </div>
  )
}
