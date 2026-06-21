import React from 'react';
import { Order, OrderStatus as OrderStatusType } from '../types';
import '../styles/OrderStatus.css';

interface OrderStatusProps {
  order: Order;
}

const statusConfig: Record<OrderStatusType, { label: string; color: string; step: number }> = {
  pending: { label: '待确认', color: '#ed8936', step: 0 },
  making: { label: '制作中', color: '#3182ce', step: 1 },
  shipped: { label: '已发货', color: '#38a169', step: 2 },
  completed: { label: '已完成', color: '#a0aec0', step: 3 },
  cancelled: { label: '已取消', color: '#e53e3e', step: -1 },
};

const OrderStatus: React.FC<OrderStatusProps> = ({ order }) => {
  const currentConfig = statusConfig[order.status];
  const displayStatuses: OrderStatusType[] = ['pending', 'making', 'shipped', 'completed'];
  const currentStep = currentConfig.step;

  if (order.status === 'cancelled') {
    return (
      <div className="order-status">
        <div className="status-bar cancelled">
          <span className="status-label cancelled" style={{ color: '#e53e3e' }}>
            {currentConfig.label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="order-status">
      <div className="status-bar">
        {displayStatuses.map((status, index) => {
          const config = statusConfig[status];
          const isActive = index <= currentStep;
          const isCurrent = index === currentStep;

          return (
            <React.Fragment key={status}>
              <div
                className={`status-segment ${isActive ? 'active' : ''} ${
                  isCurrent ? 'current' : ''
                }`}
                style={{
                  backgroundColor: isActive ? config.color : '#e2e8f0',
                }}
              >
                {isCurrent && <span className="pulse-dot" style={{ backgroundColor: config.color }} />}
                <span
                  className="status-label"
                  style={{ color: isCurrent ? config.color : '#718096' }}
                >
                  {config.label}
                </span>
              </div>
              {index < displayStatuses.length - 1 && (
                <div
                  className="status-arrow"
                  style={{
                    color: index < currentStep ? statusConfig[displayStatuses[index]].color : '#cbd5e0',
                  }}
                >
                  →
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default OrderStatus;
