import { useState } from 'react';
import { Calendar, DollarSign, ChevronDown, ChevronUp, Send } from 'lucide-react';
import type { Inquiry } from '../types';

interface AdminPanelProps {
  inquiries: Inquiry[];
  onReplySent: () => void;
  onStatusUpdated: () => void;
  onNewInquiry: () => void;
}

const statusLabels: { [key: string]: string } = {
  pending: '待回复',
  replied: '已回复',
  completed: '已成交',
};

const statusColors: { [key: string]: string } = {
  pending: 'var(--status-pending-tag)',
  replied: 'var(--status-replied-tag)',
  completed: 'var(--status-completed-tag)',
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminPanel({ inquiries, onReplySent, onStatusUpdated }: AdminPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const pendingInquiries = inquiries.filter(i => i.status === 'pending');
  const repliedInquiries = inquiries.filter(i => i.status === 'replied');
  const completedInquiries = inquiries.filter(i => i.status === 'completed');

  const handleReplySubmit = async (inquiryId: string) => {
    if (!replyContent[inquiryId]?.trim()) return;
    
    setSubmitting(inquiryId);
    try {
      await fetch(`/api/inquiry/${inquiryId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent[inquiryId].trim() }),
      });
      
      setReplyContent(prev => ({ ...prev, [inquiryId]: '' }));
      onReplySent();
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSubmitting(null);
    }
  };

  const handleStatusChange = async (inquiryId: string, newStatus: 'pending' | 'replied' | 'completed') => {
    try {
      await fetch(`/api/inquiry/${inquiryId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      onStatusUpdated();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderInquiryCard = (inquiry: Inquiry) => (
    <div
      key={inquiry.id}
      className={`inquiry-card ${inquiry.status}`}
    >
      <div onClick={() => toggleExpand(inquiry.id)}>
        <div className="inquiry-card-header">
          <span className={`status-tag ${inquiry.status}`}>
            {statusLabels[inquiry.status]}
          </span>
          {expandedId === inquiry.id ? (
            <ChevronUp size={20} style={{ color: 'var(--text-secondary)' }} />
          ) : (
            <ChevronDown size={20} style={{ color: 'var(--text-secondary)' }} />
          )}
        </div>
        
        <div className="inquiry-budget">
          <DollarSign size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
          ¥{inquiry.budget}
        </div>
        
        <p className="inquiry-description">{inquiry.description}</p>
        
        <div className="inquiry-meta">
          <span>
            <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            期望: {formatDate(inquiry.expectedDate)}
          </span>
          <span>{formatDate(inquiry.createdAt)}</span>
        </div>
      </div>

      {expandedId === inquiry.id && (
        <div className="inquiry-detail">
          <div className="message-list">
            {inquiry.messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.sender}`}>
                <div>{msg.content}</div>
                <div className="message-time">{formatDateTime(msg.createdAt)}</div>
              </div>
            ))}
          </div>

          <div className="reply-area">
            <textarea
              className="form-textarea"
              placeholder="输入回复内容..."
              value={replyContent[inquiry.id] || ''}
              onChange={(e) => setReplyContent(prev => ({ ...prev, [inquiry.id]: e.target.value }))}
              rows={3}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div className="status-actions">
                {(['pending', 'replied', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    className={`status-btn ${inquiry.status === status ? 'active' : ''}`}
                    onClick={() => handleStatusChange(inquiry.id, status)}
                    disabled={submitting === inquiry.id}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
              <button
                className="form-submit"
                style={{ padding: '10px 20px', margin: 0 }}
                onClick={() => handleReplySubmit(inquiry.id)}
                disabled={submitting === inquiry.id || !replyContent[inquiry.id]?.trim()}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {submitting === inquiry.id ? '发送中...' : (
                    <>
                      <Send size={16} />
                      发送回复
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSection = (title: string, inquiryList: Inquiry[], countColor: string) => (
    inquiryList.length > 0 && (
      <div className="inquiry-section">
        <h3 className="inquiry-section-title">
          {title}
          <span className="count" style={{ background: countColor }}>
            {inquiryList.length}
          </span>
        </h3>
        <div className="inquiry-grid">
          {inquiryList.map(renderInquiryCard)}
        </div>
      </div>
    )
  );

  return (
    <div className="container">
      <div className="admin-container">
        <h1 className="admin-title">询价管理后台</h1>

        {inquiries.length === 0 ? (
          <div className="empty-state">
            暂无询价信息
          </div>
        ) : (
          <>
            {renderSection('待回复', pendingInquiries, statusColors.pending)}
            {renderSection('已回复', repliedInquiries, statusColors.replied)}
            {renderSection('已成交', completedInquiries, statusColors.completed)}
          </>
        )}
      </div>
    </div>
  );
}
