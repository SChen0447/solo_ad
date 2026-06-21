import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import PortfolioCard, { type PortfolioItem } from '../components/PortfolioCard';
import '../styles/PortfolioPage.css';

interface InquiryFormData {
  name: string;
  email: string;
  requirements: string;
  budgetRange: string;
  timeline: string;
}

const PortfolioPage = () => {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [formData, setFormData] = useState<InquiryFormData>({
    name: '',
    email: '',
    requirements: '',
    budgetRange: '',
    timeline: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [inquiryNumber, setInquiryNumber] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    fetchPortfolio();
    setupSocket();
  }, []);

  const setupSocket = () => {
    const socket: Socket = io('/', { path: '/socket.io' });

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('new-inquiry', (inquiry: any) => {
      setNotification(`新询价：${inquiry.name} - ${inquiry.inquiryNumber}`);
      setTimeout(() => setNotification(null), 5000);
    });

    return () => {
      socket.disconnect();
    };
  };

  const fetchPortfolio = async () => {
    try {
      const response = await fetch('/api/portfolio');
      const data = await response.json();
      setPortfolio(data);
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInquiryClick = (item: PortfolioItem) => {
    setSelectedItem(item);
    setShowInquiryModal(true);
    setSubmitSuccess(false);
    setFormData({
      name: '',
      email: '',
      requirements: '',
      budgetRange: '',
      timeline: '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value } as InquiryFormData));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          portfolioId: selectedItem?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setInquiryNumber(data.inquiryNumber);
        setSubmitSuccess(true);
      }
    } catch (error) {
      console.error('Failed to submit inquiry:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowInquiryModal(false);
    setSelectedItem(null);
    setSubmitSuccess(false);
  };

  const filteredPortfolio = activeFilter === 'all'
    ? portfolio
    : portfolio.filter((item) => item.category === activeFilter);

  const filters = [
    { key: 'all', label: '全部作品' },
    { key: 'digital', label: '数字绘画' },
    { key: 'traditional', label: '传统手绘' },
    { key: 'mixed', label: '混合媒介' },
  ];

  if (loading) {
    return (
      <div className="portfolio-page">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="portfolio-page">
      {notification && (
        <div className="notification-bar fade-in">
        <span className="notification-icon">🔔</span>
        <span className="notification-text">{notification}</span>
      </div>
      )}

      <div className="page-header">
        <h1 className="page-title">作品集</h1>
        <p className="page-subtitle">探索创意的视觉旅程，每一幅作品都是一个故事</p>
      </div>

      <div className="filter-tabs">
        {filters.map((filter) => (
          <button
            key={filter.key}
            className={`filter-tab ${activeFilter === filter.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.key)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="masonry-container">
        {filteredPortfolio.map((item) => (
          <PortfolioCard
            key={item.id}
            item={item}
            onInquiry={handleInquiryClick}
          />
        ))}
      </div>

      {showInquiryModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content card fade-in" onClick={(e) => e.stopPropagation()}>
            {!submitSuccess ? (
              <>
                <div className="modal-header">
                  <h2 className="modal-title">发起询价</h2>
                  <button className="modal-close" onClick={closeModal}>
                    ×
                  </button>
                </div>

                {selectedItem && (
                  <div className="selected-work">
                  <img src={selectedItem.coverImage} alt={selectedItem.title} />
                  <div className="selected-work-info">
                    <p className="selected-work-title">{selectedItem.title}</p>
                    <p className="selected-work-desc">{selectedItem.description}</p>
                  </div>
                </div>
                )}

                <form className="inquiry-form" onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="name">姓名 *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="请输入您的姓名"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">邮箱 *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="请输入您的邮箱"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="requirements">项目需求 *</label>
                    <textarea
                      id="requirements"
                      name="requirements"
                      value={formData.requirements}
                      onChange={handleInputChange}
                      required
                      maxLength={500}
                      rows={5}
                      placeholder="请描述您的项目需求（500字以内）"
                    />
                    <span className="char-count">
                      {formData.requirements.length}/500
                    </span>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="budgetRange">期望价格区间</label>
                      <select
                        id="budgetRange"
                        name="budgetRange"
                        value={formData.budgetRange}
                        onChange={handleInputChange}
                      >
                        <option value="">请选择</option>
                        <option value="500-1000">¥500 - ¥1,000</option>
                        <option value="1000-3000">¥1,000 - ¥3,000</option>
                        <option value="3000-5000">¥3,000 - ¥5,000</option>
                        <option value="5000-10000">¥5,000 - ¥10,000</option>
                        <option value="10000+">¥10,000 以上</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="timeline">预估时间线</label>
                      <select
                        id="timeline"
                        name="timeline"
                        value={formData.timeline}
                        onChange={handleInputChange}
                      >
                        <option value="">请选择</option>
                        <option value="1周内">1周内</option>
                        <option value="2周内">2周内</option>
                        <option value="1个月内">1个月内</option>
                        <option value="1-2个月">1-2个月</option>
                        <option value="2个月以上">2个月以上</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary submit-btn"
                    disabled={submitting}
                  >
                    {submitting ? '提交中...' : '提交询价'}
                  </button>
                </form>
              </>
            ) : (
              <div className="success-content">
                <div className="success-icon">✓</div>
                <h2 className="success-title">询价提交成功！</h2>
                <p className="success-desc">
                  您的询价编号是：<strong>{inquiryNumber}</strong>
                </p>
                <p className="success-desc">
                  我们会尽快与您联系，请留意邮件通知。</p>
                <button className="btn btn-primary" onClick={closeModal}>
                  关闭
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioPage;
