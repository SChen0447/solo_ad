import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Gift, AddLogisticsDto } from '../types';
import { categoryLabels, statusLabels } from '../types';
import { api } from '../utils/api';
import './DetailPage.css';

const DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gift, setGift] = useState<Gift | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogisticsForm, setShowLogisticsForm] = useState(false);
  const [logisticsForm, setLogisticsForm] = useState<AddLogisticsDto>({
    company: '',
    trackingNumber: '',
    statusText: '',
  });
  const [logisticsError, setLogisticsError] = useState('');

  const fetchGift = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getGift(id);
      setGift(data);
    } catch (err) {
      console.error('Failed to fetch gift:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGift();
  }, [fetchGift]);

  const handleLogisticsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!logisticsForm.company || !logisticsForm.trackingNumber || !logisticsForm.statusText) {
      setLogisticsError('请填写所有物流信息字段');
      return;
    }

    try {
      await api.addLogistics(id, logisticsForm);
      setLogisticsForm({ company: '', trackingNumber: '', statusText: '' });
      setShowLogisticsForm(false);
      setLogisticsError('');
      fetchGift();
    } catch (err) {
      if (err instanceof Error) {
        setLogisticsError(err.message);
      }
    }
  };

  const handleLogisticsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLogisticsForm((prev) => ({ ...prev, [name]: value }));
    if (logisticsError) {
      setLogisticsError('');
    }
  };

  if (loading) {
    return (
      <div className="detail-page">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (!gift) {
    return (
      <div className="detail-page">
        <div className="not-found">礼物不存在</div>
      </div>
    );
  }

  const exchangeHistory = [...gift.exchangeHistory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const logisticsRecords = [...gift.logistics].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="detail-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← 返回
      </button>

      <div className="detail-content">
        <div className="gift-detail-card">
          <div className="gift-detail-image">
            <img src={gift.photoUrl} alt={gift.name} />
          </div>
          <div className="gift-detail-info">
            <h1 className="gift-detail-name">{gift.name}</h1>
            <div className="gift-detail-tags">
              <span className={`status-tag status-${gift.status}`}>
                {statusLabels[gift.status]}
              </span>
              <span className="category-tag">{categoryLabels[gift.category]}</span>
            </div>
            <div className="gift-detail-meta">
              <div className="meta-item">
                <span className="meta-label">价值</span>
                <span className="meta-value">¥{gift.value}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">所在城市</span>
                <span className="meta-value">📍 {gift.city}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">原主人</span>
                <span className="meta-value">{gift.owner}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">登记时间</span>
                <span className="meta-value">{gift.createdAt}</span>
              </div>
            </div>
          </div>
        </div>

        {(gift.status === 'exchanged' || gift.status === 'in_transit') && (
          <div className="logistics-section">
            <div className="section-header">
              <h2>物流跟踪</h2>
              <button
                className="add-logistics-btn"
                onClick={() => setShowLogisticsForm(!showLogisticsForm)}
              >
                {showLogisticsForm ? '取消' : '+ 添加物流'}
              </button>
            </div>

            {showLogisticsForm && (
              <form className="logistics-form" onSubmit={handleLogisticsSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>物流公司</label>
                    <input
                      type="text"
                      name="company"
                      value={logisticsForm.company}
                      onChange={handleLogisticsInputChange}
                      placeholder="如：顺丰快递"
                    />
                  </div>
                  <div className="form-group">
                    <label>运单号</label>
                    <input
                      type="text"
                      name="trackingNumber"
                      value={logisticsForm.trackingNumber}
                      onChange={handleLogisticsInputChange}
                      placeholder="运单号"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>最新状态</label>
                  <input
                    type="text"
                    name="statusText"
                    value={logisticsForm.statusText}
                    onChange={handleLogisticsInputChange}
                    placeholder="如：已到达北京转运中心"
                  />
                </div>
                {logisticsError && <span className="error-text">{logisticsError}</span>}
                <button type="submit" className="submit-btn">
                  更新物流
                </button>
              </form>
            )}

            {logisticsRecords.length > 0 ? (
              <div className="timeline">
                {logisticsRecords.map((record, index) => (
                  <div key={record.id} className="timeline-item">
                    <div className="timeline-node-wrapper">
                      <div
                        className={`timeline-node ${index === 0 ? 'current' : 'completed'}`}
                      />
                      {index < logisticsRecords.length - 1 && (
                        <div className="timeline-line" />
                      )}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-time">{record.timestamp}</div>
                      <div className="timeline-status">{record.statusText}</div>
                      <div className="timeline-info">
                        {record.company} · {record.trackingNumber}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">暂无物流记录</div>
            )}
          </div>
        )}

        <div className="exchange-history-section">
          <h2>交换历史</h2>
          {exchangeHistory.length > 0 ? (
            <div className="timeline">
              {exchangeHistory.map((record, index) => (
                <div key={record.id} className="timeline-item">
                  <div className="timeline-node-wrapper">
                    <div
                      className={`timeline-node ${index === 0 ? 'current' : 'completed'}`}
                    />
                    {index < exchangeHistory.length - 1 && (
                      <div className="timeline-line" />
                    )}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-time">{record.createdAt}</div>
                    <div className="timeline-status">
                      与 {record.partnerOwner} 交换
                    </div>
                    <div className="timeline-info">
                      城市：{record.partnerCity} · 状态：
                      {record.status === 'confirmed' ? '已确认' : '待确认'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">暂无交换记录</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailPage;
