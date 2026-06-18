import React, { useState } from 'react';
import { PurchaseRequest, RequestStatus } from '../../backend/types';

const statusLabels: Record<RequestStatus, string> = {
  pending: '待审批',
  approved: '已批准',
  rejected: '已驳回',
  delivered: '已送达',
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface RequestCardProps {
  request: PurchaseRequest;
}

const RequestCard: React.FC<RequestCardProps> = ({ request }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="request-card" onClick={() => setExpanded(!expanded)}>
      <div className="card-header">
        <h3 className="card-title">{request.title}</h3>
        <span className={`status-badge status-${request.status}`}>
          {statusLabels[request.status]}
        </span>
      </div>
      <p className="card-applicant">申请人：{request.applicant}</p>
      <p className="card-total">总金额：¥{request.total.toFixed(2)}</p>

      <div className={`card-details ${expanded ? 'open' : ''}`}>
        <div className="card-details-content">
          <div className="details-meta">
            <p>当前状态：{statusLabels[request.status]}</p>
            <p>创建时间：{formatDate(request.createdAt)}</p>
          </div>
          <div className="details-items">
            <table>
              <thead>
                <tr>
                  <th>物品</th>
                  <th>数量</th>
                  <th>单价</th>
                  <th>小计</th>
                </tr>
              </thead>
              <tbody>
                {request.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>¥{item.unitPrice.toFixed(2)}</td>
                    <td>¥{(item.quantity * item.unitPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestCard;
