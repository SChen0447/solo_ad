import { useState } from 'react';
import type { ExchangeRequest } from '../types';
import './ExchangePanel.css';

interface ExchangePanelProps {
  requests: ExchangeRequest[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onClose: () => void;
}

const ExchangePanel = ({ requests, onAccept, onReject, onClose }: ExchangePanelProps) => {
  const [animatingAccept, setAnimatingAccept] = useState<string | null>(null);
  const [animatingReject, setAnimatingReject] = useState<string | null>(null);

  const handleAccept = (requestId: string) => {
    setAnimatingAccept(requestId);
    setTimeout(() => {
      onAccept(requestId);
      setAnimatingAccept(null);
    }, 600);
  };

  const handleReject = (requestId: string) => {
    setAnimatingReject(requestId);
    setTimeout(() => {
      onReject(requestId);
      setAnimatingReject(null);
    }, 500);
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const otherRequests = requests.filter(r => r.status !== 'pending');

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="exchange-panel-overlay" onClick={onClose}>
      <div className="exchange-panel animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <h2 className="panel-title">交换请求管理</h2>
          <button className="panel-close" onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="panel-content">
          {pendingRequests.length > 0 && (
            <div className="request-section">
              <h3 className="section-title">待处理请求</h3>
              <div className="request-list">
                {pendingRequests.map(request => (
                  <div
                    key={request.id}
                    className={`request-card ${
                      animatingAccept === request.id ? 'animate-pulse-green' : ''
                    } ${
                      animatingReject === request.id ? 'animate-shake-red' : ''
                    }`}
                  >
                    <div className="request-info">
                      <p className="request-text">
                        <strong>{request.fromUserName}</strong> 申请交换您的资源：
                      </p>
                      <p className="request-resource">「{request.resourceTitle}」</p>
                      <p className="request-time">{formatDate(request.createdAt)}</p>
                    </div>
                    <div className="request-actions">
                      <button
                        className="action-btn accept-btn"
                        onClick={() => handleAccept(request.id)}
                        disabled={animatingAccept === request.id || animatingReject === request.id}
                      >
                        接受
                      </button>
                      <button
                        className="action-btn reject-btn"
                        onClick={() => handleReject(request.id)}
                        disabled={animatingAccept === request.id || animatingReject === request.id}
                      >
                        拒绝
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {otherRequests.length > 0 && (
            <div className="request-section">
              <h3 className="section-title">已处理请求</h3>
              <div className="request-list">
                {otherRequests.map(request => (
                  <div key={request.id} className="request-card processed">
                    <div className="request-info">
                      <p className="request-text">
                        <strong>{request.fromUserName}</strong> 申请交换：
                        「{request.resourceTitle}」
                      </p>
                      <p className="request-time">
                        {formatDate(request.createdAt)}
                        <span className={`status-badge ${request.status}`}>
                          {request.status === 'accepted' ? '已接受' : '已拒绝'}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {requests.length === 0 && (
            <div className="empty-panel">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              <p>暂无交换请求</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExchangePanel;
