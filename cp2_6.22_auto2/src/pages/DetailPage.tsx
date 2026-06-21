import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { GiftDetail, LogisticsEntry, Exchange } from '@/types';
import { fetchGiftDetail, addLogistics } from '@/utils/storage';

const DetailPage: React.FC = React.memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<GiftDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [showLogisticsForm, setShowLogisticsForm] = useState(false);
  const [company, setCompany] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [statusText, setStatusText] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchGiftDetail(id);
      setDetail(data);
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleAddLogistics = useCallback(
    async (ev: React.FormEvent) => {
      ev.preventDefault();
      const errs: Record<string, string> = {};
      if (!company.trim()) errs.company = '请输入物流公司';
      if (!trackingNumber.trim()) errs.trackingNumber = '请输入运单号';
      if (!statusText.trim()) errs.statusText = '请输入状态文本';
      setFormErrors(errs);
      if (Object.keys(errs).length > 0) return;
      setSubmitting(true);
      try {
        await addLogistics({
          giftId: id!,
          company: company.trim(),
          trackingNumber: trackingNumber.trim(),
          statusText: statusText.trim(),
        });
        setCompany('');
        setTrackingNumber('');
        setStatusText('');
        setShowLogisticsForm(false);
        await loadDetail();
      } catch {
        setFormErrors({ submit: '添加物流记录失败' });
      } finally {
        setSubmitting(false);
      }
    },
    [id, company, trackingNumber, statusText, loadDetail]
  );

  if (loading) return <div className="page-loading">加载中...</div>;
  if (!detail) return <div className="page-loading">礼物不存在</div>;

  return (
    <div className="detail-page">
      <button className="detail-page__back" onClick={() => navigate(-1)}>
        ← 返回
      </button>

      <div className="detail-page__header">
        <img
          src={detail.photoUrl}
          alt={detail.name}
          className="detail-page__image"
        />
        <div className="detail-page__info">
          <h1 className="detail-page__name">{detail.name}</h1>
          <div className="detail-page__meta">
            <span>📍 {detail.city}</span>
            <span>📂 {detail.category}</span>
            <span>💰 ¥{detail.value}</span>
            <span>👤 {detail.owner}</span>
          </div>
          <div className="detail-page__meta">
            <span>🕐 登记时间：{detail.createdAtFormatted}</span>
            <span
              className={`detail-page__status detail-page__status--${detail.status}`}
            >
              {detail.status === 'available' ? '可交换' : '已交换'}
            </span>
          </div>
        </div>
      </div>

      {detail.status === 'exchanged' && (
        <div className="detail-page__logistics-section">
          <div className="detail-page__section-header">
            <h2>📦 物流跟踪</h2>
            <button
              className="detail-page__add-btn"
              onClick={() => setShowLogisticsForm(!showLogisticsForm)}
            >
              {showLogisticsForm ? '取消' : '+ 添加物流记录'}
            </button>
          </div>

          {showLogisticsForm && (
            <form className="logistics-form" onSubmit={handleAddLogistics}>
              <div className={`gift-form__field ${formErrors.company ? 'gift-form__field--error' : ''}`}>
                <label>物流公司</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="顺丰速运"
                />
                {formErrors.company && <span className="gift-form__error">{formErrors.company}</span>}
              </div>
              <div className={`gift-form__field ${formErrors.trackingNumber ? 'gift-form__field--error' : ''}`}>
                <label>运单号</label>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="SF1234567890"
                />
                {formErrors.trackingNumber && <span className="gift-form__error">{formErrors.trackingNumber}</span>}
              </div>
              <div className={`gift-form__field ${formErrors.statusText ? 'gift-form__field--error' : ''}`}>
                <label>最新状态</label>
                <input
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="已发出"
                />
                {formErrors.statusText && <span className="gift-form__error">{formErrors.statusText}</span>}
              </div>
              <button type="submit" className="gift-form__submit" disabled={submitting}>
                {submitting ? '提交中...' : '添加记录'}
              </button>
            </form>
          )}

          <Timeline entries={detail.logistics} type="logistics" />
        </div>
      )}

      <div className="detail-page__history-section">
        <h2>🔄 交换历史</h2>
        <Timeline entries={detail.exchangeHistory} type="exchange" currentGiftId={detail.id} />
      </div>
    </div>
  );
});

DetailPage.displayName = 'DetailPage';

interface TimelineProps {
  entries: LogisticsEntry[] | Exchange[];
  type: 'logistics' | 'exchange';
  currentGiftId?: string;
}

const Timeline: React.FC<TimelineProps> = React.memo(({ entries, type, currentGiftId }) => {
  if (entries.length === 0) {
    return <p className="timeline__empty">暂无记录</p>;
  }

  return (
    <div className="timeline">
      {entries.map((entry, idx) => {
        const isCurrent = idx === 0;
        const isCompleted = idx > 0;
        const time =
          type === 'logistics'
            ? (entry as LogisticsEntry).createdAtFormatted
            : (entry as Exchange).createdAtFormatted;

        let content: React.ReactNode;
        if (type === 'logistics') {
          const l = entry as LogisticsEntry;
          content = (
            <div className="timeline__content">
              <div className="timeline__status-text">{l.statusText}</div>
              <div className="timeline__detail">
                {l.company} · {l.trackingNumber}
              </div>
            </div>
          );
        } else {
          const e = entry as Exchange;
          const otherCity =
            e.giftAId === currentGiftId ? e.giftBCity : e.giftACity;
          const otherName =
            e.giftAId === currentGiftId ? e.giftBName : e.giftAName;
          content = (
            <div className="timeline__content">
              <div className="timeline__status-text">
                与「{otherName}」交换
              </div>
              <div className="timeline__detail">目的地：{otherCity}</div>
            </div>
          );
        }

        return (
          <div key={entry.id} className="timeline__item">
            <div className="timeline__node-wrap">
              <div
                className={`timeline__node ${
                  isCurrent
                    ? 'timeline__node--current'
                    : isCompleted
                    ? 'timeline__node--completed'
                    : ''
                }`}
              />
              {idx < entries.length - 1 && <div className="timeline__line" />}
            </div>
            <div className="timeline__body">
              <div className="timeline__time">{time}</div>
              {content}
            </div>
          </div>
        );
      })}
    </div>
  );
});

Timeline.displayName = 'Timeline';

export default DetailPage;
