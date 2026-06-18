import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProtocolDetail, signProtocol } from '../utils/api';
import SignaturePad from '../components/SignaturePad';
import { renderMarkdown, formatDate, validateEmail } from '../utils/markdown';
import type { Protocol } from '../types';

export default function SignPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [signerEmail, setSignerEmail] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedParty, setSelectedParty] = useState<{ email: string; signed: boolean } | null>(null);

  useEffect(() => {
    if (!id) return;
    getProtocolDetail(id)
      .then((data) => setProtocol(data))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSignClick = (email: string) => {
    const party = protocol?.parties.find((p) => p.email === email);
    if (!party) return;
    if (party.signedAt) {
      alert('该签署方已完成签名');
      return;
    }
    setSelectedParty({ email, signed: false });
    setSignerEmail(email);
    setSignatureData(null);
    setEmailError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => {
      setSelectedParty(null);
      setSignerEmail('');
      setSignatureData(null);
    }, 200);
  };

  const handleConfirmSign = async () => {
    if (!validateEmail(signerEmail)) {
      setEmailError('请输入有效的邮箱地址');
      return;
    }
    if (!signatureData) {
      alert('请先绘制签名');
      return;
    }
    if (!protocol || !id) return;

    const validParty = protocol.parties.find((p) => p.email === signerEmail.trim());
    if (!validParty) {
      setEmailError('该邮箱不是本协议的签署方');
      return;
    }
    if (validParty.signedAt) {
      alert('该签署方已完成签名');
      return;
    }

    try {
      setSubmitting(true);
      const updated = await signProtocol(id, {
        email: signerEmail.trim(),
        signatureData,
        signedAt: new Date().toISOString(),
      });
      setProtocol(updated);
      alert('签署成功！');
      closeModal();
      if (updated.status === 'completed') {
        setTimeout(() => navigate(`/detail/${id}`), 500);
      }
    } catch {
      // 错误已处理
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">加载协议内容...</div>;
  if (!protocol) return <div className="loading">协议不存在或已被删除</div>;

  const pendingParties = protocol.parties.filter((p) => !p.signedAt);

  return (
    <div className="sign-page">
      <h1 className="page-title" style={{ marginBottom: 8 }}>
        在线签署协议
      </h1>
      <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
        协议编号：{protocol.id.slice(0, 8)}... · 创建于 {formatDate(protocol.createdAt)}
      </div>

      <div
        style={{
          padding: 16,
          background: '#f8fafc',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>
          {protocol.title}
        </div>
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(protocol.content) }} />
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
        签署方状态（
        <span style={{ color: '#22c55e' }}>
          {protocol.parties.filter((p) => p.signedAt).length}
        </span>
        /{protocol.parties.length} 已签署）
      </h3>

      <div style={{ marginBottom: 24 }}>
        {protocol.parties.map((party, idx) => (
          <div
            key={party.email}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 12,
              background: party.signedAt ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${party.signedAt ? '#bbf7d0' : '#fde68a'}`,
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: party.signedAt ? '#22c55e' : '#f59e0b',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {idx + 1}
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{party.email}</div>
                {party.signedAt && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    签署于 {formatDate(party.signedAt)}
                  </div>
                )}
              </div>
            </div>
            {party.signedAt ? (
              party.signatureData ? (
                <img
                  src={party.signatureData}
                  alt="签名"
                  style={{
                    maxWidth: 100,
                    maxHeight: 40,
                    background: '#fff',
                    padding: 4,
                    borderRadius: 4,
                    border: '1px solid #e5e7eb',
                  }}
                />
              ) : (
                <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>✓ 已签</span>
              )
            ) : (
              <button
                className="sign-link-btn"
                onClick={() => handleSignClick(party.email)}
              >
                立即签署
              </button>
            )}
          </div>
        ))}
      </div>

      {protocol.status === 'completed' ? (
        <div
          style={{
            padding: 16,
            background: '#dbeafe',
            color: '#1e40af',
            borderRadius: 8,
            textAlign: 'center',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          🎉 所有签署方均已完成签署，协议状态：已完成
        </div>
      ) : pendingParties.length === 1 ? (
        <div
          style={{
            padding: 12,
            background: '#fef3c7',
            color: '#92400e',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          还有 1 位签署方（{pendingParties[0].email}）待签，请通知其完成签署。
        </div>
      ) : null}

      <div className="page-actions">
        <Link to="/">
          <button className="secondary-btn">← 返回协议列表</button>
        </Link>
        <Link to={`/detail/${protocol.id}`}>
          <button className="primary-btn">查看完整详情</button>
        </Link>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">数字签名</div>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="sign-email-prompt">
              <label className="form-label">签署方邮箱</label>
              <input
                type="email"
                className={`form-input ${emailError ? 'input-error' : ''}`}
                value={signerEmail}
                onChange={(e) => {
                  setSignerEmail(e.target.value);
                  setEmailError('');
                }}
                placeholder="请输入您的邮箱"
              />
              {emailError && <div className="error-text">{emailError}</div>}
            </div>

            <SignaturePad onSignatureChange={setSignatureData} />

            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={closeModal}
                disabled={submitting}
              >
                取消
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleConfirmSign}
                disabled={submitting || !signatureData}
              >
                {submitting ? '提交中...' : '确认签署'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
