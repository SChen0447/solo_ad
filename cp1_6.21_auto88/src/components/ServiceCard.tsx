import React from 'react';
import type { Service } from '../types';
import { getServiceColor, getServiceBgColor } from '../utils/storage';
import '../styles/ServiceCard.css';

interface ServiceCardProps {
  service: Service;
  pendingCount?: number;
  onClick?: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  pendingCount = 0,
  onClick,
}) => {
  const categoryNames: Record<string, string> = {
    wash: '洗护类',
    cut: '修剪类',
    spa: 'SPA护理类',
  };

  return (
    <div
      className="service-card card"
      style={{
        backgroundColor: getServiceBgColor(service.category),
        borderLeft: `4px solid ${getServiceColor(service.category)}`,
      }}
      onClick={onClick}
    >
      <div className="service-card-badge" style={{ backgroundColor: getServiceColor(service.category) }}>
        {pendingCount}
      </div>
      <div className="service-card-category" style={{ color: getServiceColor(service.category) }}>
        {categoryNames[service.category] || '其他'}
      </div>
      <h3 className="service-card-name">{service.name}</h3>
      <p className="service-card-description">{service.description}</p>
      <div className="service-card-footer">
        <span className="service-card-price">¥{service.price}</span>
        <span className="service-card-duration">{service.duration}分钟</span>
      </div>
    </div>
  );
};

export default ServiceCard;
