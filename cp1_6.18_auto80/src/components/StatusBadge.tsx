import type { FC } from 'react';
import type { ContractStatus } from '../types';
import styles from './StatusBadge.module.css';

interface Props {
  status: ContractStatus;
}

const STATUS_MAP: Record<ContractStatus, { label: string; className: string }> = {
  pending: { label: '待签署', className: styles.pending },
  signed: { label: '已签署', className: styles.signed },
  expired: { label: '已过期', className: styles.expired },
  updated: { label: '已更新', className: styles.updated },
};

export const StatusBadge: FC<Props> = ({ status }) => {
  const { label, className } = STATUS_MAP[status];
  return <span className={`${styles.badge} ${className}`}>{label}</span>;
};

export default StatusBadge;
