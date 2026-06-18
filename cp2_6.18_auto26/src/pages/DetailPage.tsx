import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProtocolDetail } from '../utils/api';
import { renderMarkdown, formatDate } from '../utils/markdown';
import type { Protocol, ProtocolStatus } from '../types';
// @ts-ignore - html2pdf.js 无官方类型
import html2pdf from 'html2pdf.js';

const statusLabel: Record<ProtocolStatus, string> = {
  pending: '待签',
  signed: '部分已签',
  completed: '已完成',
};

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    getProtocolDetail(id)
      .then((data) => setProtocol(data))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExportPDF = async () => {
    if (!protocol || !exportRef.current) return;
    try {
      setExporting(true);
      const opt = {
        margin: 15,
        filename: `${protocol.title.replace(/[\\/:*?"<>|]/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      await html2pdf().set(opt).from(exportRef.current).save();
      alert('PDF 导出成功！');
    } catch (err) {
      console.error(err);
      alert('PDF 导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const copySignLink = (email: string) => {
    if (!id) return;
    const link = `${window.location.origin}/sign/${id}`;
    navigator.clipboard
      .writeText(link)
      .then(() => alert(`签署链接已复制！\n\n请将此链接发送给：${email}\n\n${link}`))
      .catch(() => prompt('请复制以下签署链接并发送：', link));
  };

  if (loading) return <div className="loading">加载协议详情...</div>;
  if (!protocol) return <div className="loading">协议不存在或已被删除</div>;

  const signedCount = protocol.parties.filter((p) => p.signedAt).length;

  return (
    <div className="detail-page">
      <div ref={exportRef}>
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: '#1e3a5f',
                flex: 1,
              }}
            >
              {protocol.title}
            </h1>
            <span className={`status-tag status-${protocol.status}`}>
              {statusLabel[protocol.status]}
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            协议编号：{protocol.id} · 创建于 {formatDate(protocol.createdAt)} · 签署进度 {signedCount}/{protocol.parties.length}
          </div>
        </div>

        <div className="detail-layout" style={{ marginTop: 24 }}>
          <div className="detail-content">
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(protocol.content) }} />

            <div
              style={{
                marginTop: 40,
                borderTop: '1px dashed #d1d5db',
                paddingTop: 24,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#374151' }}>
                签署方签名确认：
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {protocol.parties.map((party, idx) => (
                  <div
                    key={party.email}
                    style={{
                      padding: 14,
                      border: `1px solid ${party.signedAt ? '#bbf7d0' : '#fde68a'}`,
                      borderRadius: 8,
                      background: party.signedAt ? '#f0fdf4' : '#fffbeb',
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                      签署方 {idx + 1}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, wordBreak: 'break-all' }}>
                      {party.email}
                    </div>
                    {party.signedAt ? (
                      <>
                        {party.signatureData && (
                          <div
                            style={{
                              background: '#fff',
                              border: '1px solid #e5e7eb',
                              borderRadius: 4,
                              padding: 6,
                              marginBottom: 4,
                              display: 'flex',
                              justifyContent: 'center',
                            }}
                          >
                            <img
                              src={party.signatureData}
                              alt="签名"
                              style={{ maxHeight: 50, maxWidth: '100%' }}
                            />
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          {formatDate(party.signedAt)}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                        待签署
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="sidebar-panel">
            <h3>签署方追踪</h3>

            {protocol.parties.map((party) => {
              const isSigned = !!party.signedAt;
              return (
                <div className="party-item" key={party.email}>
                  <div className="party-item-top">
                    <div className="party-email">{party.email}</div>
                    <span
                      className={`party-signed-badge ${isSigned ? 'badge-signed' : 'badge-pending'}`}
                    >
                      {isSigned ? '已签' : '待签'}
                    </span>
                  </div>
                  {isSigned ? (
                    <>
                      {party.signatureData && (
                        <div className="signature-thumb">
                          <img src={party.signatureData} alt="签名缩略图" />
                        </div>
                      )}
                      <div className="signed-time">签署时间：{formatDate(party.signedAt)}</div>
                    </>
                  ) : (
                    <>
                      <button
                        className="sign-link-btn"
                        style={{ marginRight: 6 }}
                        onClick={() => navigate(`/sign/${protocol.id}`)}
                      >
                        前往签署
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{
                          marginTop: 8,
                          padding: '6px 12px',
                          fontSize: 12,
                        }}
                        onClick={() => copySignLink(party.email)}
                      >
                        复制链接
                      </button>
                    </>
                  )}
                </div>
              );
            })}

            <div
              style={{
                marginTop: 'auto',
                padding: 14,
                background: '#f1f5f9',
                borderRadius: 8,
                fontSize: 12,
                color: '#475569',
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6, color: '#1e293b' }}>
                进度概览
              </div>
              <div>签署进度：{signedCount} / {protocol.parties.length}</div>
              <div>完成度：{Math.round((signedCount / protocol.parties.length) * 100)}%</div>
              <div
                style={{
                  height: 6,
                  background: '#e2e8f0',
                  borderRadius: 999,
                  marginTop: 8,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(signedCount / protocol.parties.length) * 100}%`,
                    background: protocol.status === 'completed' ? '#22c55e' : '#3b82f6',
                    borderRadius: 999,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-actions">
        <Link to="/">
          <button className="secondary-btn">← 返回协议列表</button>
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to={`/sign/${protocol.id}`}>
            <button className="secondary-btn">进入签署页</button>
          </Link>
          <button
            className="primary-btn"
            onClick={handleExportPDF}
            disabled={exporting}
          >
            {exporting ? '生成中...' : '📄 导出为 PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
