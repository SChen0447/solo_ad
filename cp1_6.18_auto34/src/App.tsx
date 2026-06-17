import React, { useEffect, useState } from 'react';
import { BarChart3, Plus, X } from 'lucide-react';
import { useFeedbackStore } from './stores/feedbackStore';
import { EmotionCards } from './components/EmotionCards';
import { ChartsPanel } from './components/ChartsPanel';
import { FeedbackTable } from './components/FeedbackTable';
import { ReportExport } from './components/ReportExport';
import type { NewFeedback } from './types';

const glassCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  padding: '24px',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s ease-out',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '14px',
  transition: 'all 0.2s ease-out',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'rgba(255, 255, 255, 0.7)',
  marginBottom: '6px',
  fontWeight: 500,
};

const channels = ['微信群', '邮件', '问卷', '电话', 'App内反馈', '客服聊天', '微博', '抖音', '小红书', '知乎'];

function App() {
  const fetchFeedback = useFeedbackStore((state) => state.fetchFeedback);
  const addFeedback = useFeedbackStore((state) => state.addFeedback);
  const loading = useFeedbackStore((state) => state.loading);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<NewFeedback>({
    customerName: '',
    channel: '微信群',
    timestamp: new Date().toISOString(),
    description: '',
  });

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.description.trim()) return;

    await addFeedback({
      ...formData,
      timestamp: new Date().toISOString(),
    });

    setFormData({
      customerName: '',
      channel: '微信群',
      timestamp: new Date().toISOString(),
      description: '',
    });
    setShowAddForm(false);
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00d4aa, #0099ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BarChart3 size={22} color="#fff" />
          </div>
          <div>
            <h1
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#fff',
                margin: 0,
              }}
            >
              客户反馈智能分析
            </h1>
            <p
              style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.5)',
                margin: '2px 0 0 0',
              }}
            >
              实时情感分析与主题洞察
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease-out',
            }}
            className="add-feedback-btn"
          >
            <Plus size={16} />
            添加反馈
          </button>
          <ReportExport />
        </div>
      </nav>

      <main className="main-content">
        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(255, 255, 255, 0.1)',
                borderTopColor: '#00d4aa',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            加载数据中...
          </div>
        )}

        {!loading && (
          <>
            <EmotionCards />
            <ChartsPanel />
            <FeedbackTable />
          </>
        )}
      </main>

      {showAddForm && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddForm(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1a1b23',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#fff',
                  margin: 0,
                }}
              >
                添加新反馈
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease-out',
                }}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>客户姓名</label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="请输入客户姓名"
                  style={inputStyle}
                  className="form-input"
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>来源渠道</label>
                <select
                  name="channel"
                  value={formData.channel}
                  onChange={handleInputChange}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  className="form-input"
                >
                  {channels.map((channel) => (
                    <option key={channel} value={channel} style={{ background: '#1a1b23' }}>
                      {channel}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>反馈描述</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="请输入反馈详细内容..."
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  className="form-input"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-out',
                  }}
                  className="form-cancel-btn"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #00d4aa, #0099ff)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease-out',
                    opacity: loading ? 0.7 : 1,
                  }}
                  className="form-submit-btn"
                >
                  {loading ? '提交中...' : '提交'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .app-container {
          min-height: 100vh;
          background-color: #1a1b23;
        }

        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 32px;
          background: rgba(26, 27, 35, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 100;
        }

        .main-content {
          padding: 100px 32px 32px;
          max-width: 1600px;
          margin: 0 auto;
        }

        .add-feedback-btn:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          border-color: rgba(255, 255, 255, 0.25) !important;
        }

        .form-input:focus {
          border-color: #00d4aa !important;
          box-shadow: 0 0 0 2px rgba(0, 212, 170, 0.2) !important;
        }

        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .form-cancel-btn:hover {
          background: rgba(255, 255, 255, 0.12) !important;
        }

        .form-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 15px rgba(0, 212, 170, 0.4) !important;
        }

        .modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          color: #fff !important;
        }

        .modal-overlay {
          animation: fadeIn 0.3s ease-out;
        }

        .modal-content {
          animation: scaleIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1280px) {
          .navbar {
            padding: 16px 20px;
          }
          .main-content {
            padding: 100px 20px 20px;
          }
        }

        @media (max-width: 768px) {
          .navbar {
            flex-direction: column;
            gap: 12px;
            padding: 16px;
          }
          .main-content {
            padding: 140px 16px 16px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
