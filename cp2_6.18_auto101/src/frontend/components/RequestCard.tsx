import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { PurchaseRequest } from '../../backend/types';
import { StatusBadge } from './StatusBadge';

interface RequestCardProps {
  request: PurchaseRequest;
  onStatusChange?: () => void;
}

export function RequestCard({ request }: RequestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      style={{
        width: '100%',
        maxWidth: '340px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '14px',
        padding: '20px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all 0.3s ease-out',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.10)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1f2937',
            margin: 0,
            flex: 1,
            marginRight: '12px',
          }}
        >
          {request.title}
        </h3>
        <StatusBadge status={request.status} />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          申请人：{request.applicant}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '12px',
          borderTop: '1px solid #f3f4f6',
        }}
      >
        <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>
          总金额：¥{request.total.toLocaleString()}
        </span>
        <span style={{ color: '#9ca3af' }}>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </div>

      <div
        style={{
          maxHeight: isExpanded ? '200px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.4s ease-out',
          marginTop: isExpanded ? '16px' : '0',
        }}
      >
        <div
          style={{
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
            创建时间：{formatDate(request.createdAt)}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
            当前状态：
            <span style={{ fontWeight: 500, color: '#374151' }}>
              {request.status === 'pending' && '待审批'}
              {request.status === 'approved' && '已批准'}
              {request.status === 'rejected' && '已驳回'}
              {request.status === 'delivered' && '已送达'}
            </span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
            物品清单：
          </div>
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#6b7280' }}>
                <th style={{ textAlign: 'left', paddingBottom: '4px', fontWeight: 'normal' }}>物品名</th>
                <th style={{ textAlign: 'center', paddingBottom: '4px', fontWeight: 'normal' }}>数量</th>
                <th style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 'normal' }}>单价</th>
                <th style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 'normal' }}>小计</th>
              </tr>
            </thead>
            <tbody>
              {request.items.map((item, index) => (
                <tr key={index}>
                  <td style={{ padding: '4px 0', color: '#374151' }}>{item.name}</td>
                  <td style={{ padding: '4px 0', textAlign: 'center', color: '#374151' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '4px 0', textAlign: 'right', color: '#374151' }}>
                    ¥{item.unitPrice}
                  </td>
                  <td style={{ padding: '4px 0', textAlign: 'right', color: '#374151' }}>
                    ¥{(item.quantity * item.unitPrice).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
