import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import '../styles/InquiryPanel.css';

interface Inquiry {
  id: string;
  inquiryNumber: string;
  name: string;
  email: string;
  requirements: string;
  budgetRange: string;
  timeline: string;
  status: 'unread' | 'read' | 'quoted' | 'accepted' | 'rejected';
  createdAt: string;
  portfolioId?: string;
}

interface Quote {
  id: string;
  inquiryId: string;
  price: number;
  deliveryTime: string;
  description: string;
  createdAt: string;
}

interface TimelineEvent {
  label: string;
  date: string;
  type: 'inquiry' | 'quote' | 'accepted' | 'delivery' | 'future';
  color: string;
}

const InquiryPanel = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    price: '',
    deliveryTime: '',
    description: '',
  });
  const [newInquiryIds, setNewInquiryIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'quoted' | 'accepted'>('all');

  useEffect(() => {
    fetchInquiries();
    setupSocket();
  }, []);

  const setupSocket = () => {
    const socket: Socket = io('/', { path: '/socket.io' });

    socket.on('new-inquiry', (inquiry: Inquiry) => {
      setInquiries((prev) => [inquiry, ...prev]);
      setNewInquiryIds((prev) => new Set([...prev, inquiry.id]));

      setTimeout(() => {
        setNewInquiryIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(inquiry.id);
          return newSet;
        });
      }, 3000);
    });

    socket.on('inquiry-updated', (updatedInquiry: Inquiry) => {
      setInquiries((prev) =>
        prev.map((i) => (i.id === updatedInquiry.id ? updatedInquiry : i))
      );
      if (selectedInquiry?.id === updatedInquiry.id) {
        setSelectedInquiry(updatedInquiry);
      }
    });

    return () => {
      socket.disconnect();
    };
  };

  const fetchInquiries = async () => {
    try {
      const response = await fetch('/api/inquiries');
      const data = await response.json();
      setInquiries(data);
    } catch (error) {
      console.error('Failed to fetch inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInquiryDetail = async (id: string) => {
    try {
      const response = await fetch(`/api/inquiries/${id}`);
      const data = await response.json();
      setSelectedInquiry(data.inquiry);
      setQuotes(data.quotes);

      if (data.inquiry.status === 'unread') {
        await markAsRead(id);
      }
    } catch (error) {
      console.error('Failed to fetch inquiry detail:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/inquiries/${id}/read`, { method: 'PUT' });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleSelectInquiry = (inquiry: Inquiry) => {
    fetchInquiryDetail(inquiry.id);
    setShowQuoteForm(false);
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInquiry) return;

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inquiryId: selectedInquiry.id,
          price: Number(quoteForm.price),
          deliveryTime: quoteForm.deliveryTime,
          description: quoteForm.description,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuotes((prev) => [...prev, data.quote]);
        setShowQuoteForm(false);
        setQuoteForm({ price: '', deliveryTime: '', description: '' });
        fetchInquiryDetail(selectedInquiry.id);
      }
    } catch (error) {
      console.error('Failed to submit quote:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread':
        return 'var(--status-unread)';
      case 'read':
        return 'var(--status-read)';
      case 'quoted':
        return 'var(--status-quoted)';
      case 'accepted':
        return '#2980B9';
      case 'rejected':
        return '#95A5A6';
      default:
        return 'var(--text-light)';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'unread':
        return '未读';
      case 'read':
        return '已读';
      case 'quoted':
        return '已报价';
      case 'accepted':
        return '已接受';
      case 'rejected':
        return '已拒绝';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getTimeline = (): TimelineEvent[] => {
    if (!selectedInquiry) return [];

    const events: TimelineEvent[] = [
      {
        label: '询价发起',
        date: formatDate(selectedInquiry.createdAt),
        type: 'inquiry',
        color: 'var(--digital-color)',
      },
    ];

    if (selectedInquiry.status === 'quoted' || selectedInquiry.status === 'accepted' || selectedInquiry.status === 'rejected') {
      const latestQuote = quotes[quotes.length - 1];
      if (latestQuote) {
        events.push({
          label: '报价发送',
          date: formatDate(latestQuote.createdAt),
          type: 'quote',
          color: 'var(--status-quoted)',
        });
      }
    }

    if (selectedInquiry.status === 'accepted') {
      events.push({
        label: '客户接受报价',
        date: formatDate(new Date().toISOString()),
        type: 'accepted',
        color: '#2980B9',
      });

      const latestQuote = quotes[quotes.length - 1];
      if (latestQuote) {
        events.push({
          label: '预计交付',
          date: latestQuote.deliveryTime,
          type: 'delivery',
          color: 'var(--text-light)',
        });
      }
    }

    if (selectedInquiry.status === 'unread' || selectedInquiry.status === 'read') {
      events.push({
        label: '待报价',
        date: '待定',
        type: 'future',
        color: 'var(--text-light)',
      });
    }

    return events;
  };

  const filteredInquiries = inquiries.filter((inquiry) => {
    if (activeTab === 'all') return true;
    return inquiry.status === activeTab;
  });

  const unreadCount = inquiries.filter((i) => i.status === 'unread').length;

  if (loading) {
    return (
      <div className="inquiry-panel">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="inquiry-panel">
      <div className="panel-header">
        <div>
          <h1 className="panel-title">询价管理</h1>
          <p className="panel-subtitle">共 {inquiries.length} 条询价，{unreadCount} 条未读</p>
        </div>
      </div>

      <div className="panel-layout">
        <div className="inquiry-list">
          <div className="list-tabs">
            {[
              { key: 'all', label: '全部' },
              { key: 'unread', label: '未读' },
              { key: 'quoted', label: '已报价' },
              { key: 'accepted', label: '已接受' },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`list-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
              >
                {tab.label}
                {tab.key === 'unread' && unreadCount > 0 && (
                  <span className="tab-badge">{unreadCount}</span>
                )}
              </button>
            ))}
          </div>

          <div className="inquiry-cards">
            {filteredInquiries.length === 0 ? (
              <div className="empty-state">
                <p>暂无询价记录</p>
              </div>
            ) : (
              filteredInquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  className={`inquiry-card card ${selectedInquiry?.id === inquiry.id ? 'selected' : ''} ${newInquiryIds.has(inquiry.id) ? 'slide-in' : ''}`}
                  onClick={() => handleSelectInquiry(inquiry)}
                >
                  <div
                    className="status-bar"
                    style={{ backgroundColor: getStatusColor(inquiry.status) }}
                  />
                  <div className="inquiry-card-content">
                    <div className="inquiry-card-header">
                      <span className="inquiry-number">{inquiry.inquiryNumber}</span>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: `${getStatusColor(inquiry.status)}20`,
                          color: getStatusColor(inquiry.status),
                        }}
                      >
                        {getStatusText(inquiry.status)}
                      </span>
                    </div>
                    <h3 className="inquiry-name">{inquiry.name}</h3>
                    <p className="inquiry-requirements">{inquiry.requirements}</p>
                    <div className="inquiry-meta">
                      <span className="meta-item">📧 {inquiry.email}</span>
                      <span className="meta-item">⏱ {formatDate(inquiry.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="inquiry-detail">
          {selectedInquiry ? (
            <div className="detail-content card">
              <div className="detail-header">
                <div>
                  <h2 className="detail-title">{selectedInquiry.inquiryNumber}</h2>
                  <p className="detail-subtitle">{selectedInquiry.name} · {selectedInquiry.email}</p>
                </div>
                <span
                  className="status-badge large"
                  style={{
                    backgroundColor: `${getStatusColor(selectedInquiry.status)}20`,
                    color: getStatusColor(selectedInquiry.status),
                  }}
                >
                  {getStatusText(selectedInquiry.status)}
                </span>
              </div>

              <div className="detail-section">
                <h3 className="section-title">项目需求</h3>
                <p className="requirements-text">{selectedInquiry.requirements}</p>
              </div>

              <div className="detail-row">
                <div className="detail-item">
                  <span className="item-label">期望价格区间</span>
                  <span className="item-value">{selectedInquiry.budgetRange || '未填写'}</span>
                </div>
                <div className="detail-item">
                  <span className="item-label">预估时间线</span>
                  <span className="item-value">{selectedInquiry.timeline || '未填写'}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3 className="section-title">合作时间轴</h3>
                <div className="timeline">
                  {getTimeline().map((event, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-dot-wrapper">
                        <div
                          className={`timeline-dot ${event.type === 'future' || event.type === 'delivery' ? 'hollow' : 'solid'}`}
                          style={{
                            borderColor: event.color,
                            backgroundColor: event.type === 'future' || event.type === 'delivery' ? 'transparent' : event.color,
                          }}
                        />
                        {index < getTimeline().length - 1 && (
                          <div className="timeline-line" />
                        )}
                      </div>
                      <div className="timeline-content">
                        <h4 className="timeline-label">{event.label}</h4>
                        <span className="timeline-date">{event.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {quotes.length > 0 && (
                <div className="detail-section">
                  <h3 className="section-title">报价记录</h3>
                  {quotes.map((quote) => (
                    <div key={quote.id} className="quote-item card">
                      <div className="quote-header">
                        <span className="quote-price">¥{quote.price.toLocaleString()}</span>
                        <span className="quote-date">{formatDate(quote.createdAt)}</span>
                      </div>
                      <div className="quote-delivery">
                        <span className="item-label">交付时间：</span>
                        <span className="item-value">{quote.deliveryTime}</span>
                      </div>
                      {quote.description && (
                        <p className="quote-desc">{quote.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(selectedInquiry.status === 'unread' || selectedInquiry.status === 'read') && (
                <div className="detail-section">
                  {!showQuoteForm ? (
                    <button
                      className="btn btn-primary full-width"
                      onClick={() => setShowQuoteForm(true)}
                    >
                      回复报价
                    </button>
                  ) : (
                    <form className="quote-form" onSubmit={handleQuoteSubmit}>
                      <h3 className="section-title">发送报价</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="price">报价金额（元）*</label>
                          <input
                            type="number"
                            id="price"
                            value={quoteForm.price}
                            onChange={(e) => setQuoteForm((prev) => ({ ...prev, price: e.target.value }))}
                            required
                            placeholder="请输入报价金额"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="deliveryTime">预计交付时间 *</label>
                          <input
                            type="text"
                            id="deliveryTime"
                            value={quoteForm.deliveryTime}
                            onChange={(e) => setQuoteForm((prev) => ({ ...prev, deliveryTime: e.target.value }))}
                            required
                            placeholder="如：2024年2月15日"
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor="description">补充说明</label>
                        <textarea
                          id="description"
                          value={quoteForm.description}
                          onChange={(e) => setQuoteForm((prev) => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          placeholder="可以补充报价包含的内容、修订次数等信息"
                        />
                      </div>
                      <div className="form-actions">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setShowQuoteForm(false)}
                        >
                          取消
                        </button>
                        <button type="submit" className="btn btn-primary">
                          发送报价
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-detail card">
              <div className="empty-icon">📋</div>
              <p>选择左侧询价查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InquiryPanel;
