import type { PurchaseRequest } from '../../backend/types';

interface StatusBadgeProps {
  status: PurchaseRequest['status'];
}

const statusConfig = {
  pending: { label: '待审批', bg: '#f59e0b' },
  approved: { label: '已批准', bg: '#22c55e' },
  rejected: { label: '已驳回', bg: '#ef4444' },
  delivered: { label: '已送达', bg: '#3b82f6' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: config.bg,
        color: '#ffffff',
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 500,
        transition: 'background-color 0.3s ease-out',
      }}
    >
      {config.label}
    </span>
  );
}
