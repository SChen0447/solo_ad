import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchItemById, requestExchange, CURRENT_USER, type Item } from '../api';
import ConfirmModal from '../components/ConfirmModal';

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [exchangeSuccess, setExchangeSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchItemById(id)
      .then(setItem)
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExchange = async () => {
    if (!item || exchanging) return;
    setExchanging(true);
    try {
      await requestExchange(item.id, {
        requesterId: CURRENT_USER.id,
        requesterName: CURRENT_USER.name,
        message: '我想交换这个物品',
      });
      setExchangeSuccess(true);
      setShowModal(false);
      setTimeout(() => setExchangeSuccess(false), 3000);
      const updated = await fetchItemById(item.id);
      setItem(updated);
    } catch (err) {
      console.error('Exchange request failed:', err);
    } finally {
      setExchanging(false);
    }
  };

  if (loading) return <div className="loading-spinner" />;
  if (!item) return <div className="empty-state">物品不存在</div>;

  return (
    <div className="detail-page detail-slide-in">
      <button className="btn-back" onClick={() => navigate(-1)}>
        ← 返回
      </button>

      <div className="detail-img-section">
        <img src={item.imageUrl} alt={item.title} />
      </div>

      <div className="detail-info">
        <h1 className="detail-title">{item.title}</h1>
        <span className="detail-condition">{item.condition}</span>
        <p className="detail-desc">{item.description}</p>
        <div className="detail-owner">发布者：{item.ownerName}</div>

        {item.ownerId !== CURRENT_USER.id && (
          <button
            className="btn-exchange"
            onClick={() => setShowModal(true)}
          >
            申请交换
          </button>
        )}

        {exchangeSuccess && (
          <div style={{ marginTop: 16, color: '#27ae60', fontWeight: 600, fontSize: 14 }}>
            ✓ 交换请求已发送！
          </div>
        )}

        {item.exchangeRequests.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#555', marginBottom: 8 }}>
              交换请求 ({item.exchangeRequests.length})
            </h3>
            {item.exchangeRequests.map(req => (
              <div key={req.id} style={{ fontSize: 13, color: '#666', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>{req.requesterName}</strong> 想要交换
                {req.message && <span style={{ color: '#999' }}> — {req.message}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={showModal}
        title="确认交换请求"
        description={`确定向 <strong>${item.ownerName}</strong> 申请交换「${item.title}」吗？<br />交换请求发送后，对方将会收到通知。`}
        confirmText="确认交换"
        loading={exchanging}
        onConfirm={handleExchange}
        onCancel={() => setShowModal(false)}
      />
    </div>
  );
}
