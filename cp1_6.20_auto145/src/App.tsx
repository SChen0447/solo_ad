import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SurveyDesigner from './surveyDesigner';
import SurveyAnswer from './surveyAnswer';
import SurveyDashboard from './surveyDashboard';
import { Language } from './types';
import { t } from './utils';
import { listSurveys } from './api';
import type { Survey } from './types';

const sharedStyles = `
  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    outline: none;
    transition: filter 0.15s ease, transform 0.15s ease;
  }
  button:hover { filter: brightness(1.1); }
  button:active { transform: scale(0.95); }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: none !important;
    transform: none !important;
  }
  input, textarea, select {
    font-family: inherit;
    outline: none;
  }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #0f0f1e; }
  ::-webkit-scrollbar-thumb { background: #e94560; border-radius: 4px; }
`;

const btnPrimary = {
  padding: '10px 20px',
  borderRadius: '8px',
  backgroundColor: '#e94560',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
};

const btnSecondary = {
  padding: '8px 16px',
  borderRadius: '8px',
  backgroundColor: 'transparent',
  color: '#e0e0e0',
  fontSize: '13px',
  border: '1px solid #2d3748',
};

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [lang, setLang] = useState<Language>('zh');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSurveys = async () => {
    try {
      const list = await listSurveys();
      setSurveys(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, [location.pathname]);

  const ui = {
    title: { zh: '协作问卷平台', en: 'Survey Collaboration Platform' },
    subtitle: { zh: '快速创建问卷，实时收集数据', en: 'Create surveys quickly, collect data in real-time' },
    createBtn: { zh: '+ 设计新问卷', en: '+ Design New Survey' },
    listTitle: { zh: '已有问卷', en: 'Existing Surveys' },
    loading: { zh: '加载中...', en: 'Loading...' },
    empty: { zh: '暂无问卷，点击上方按钮开始创建', en: 'No surveys yet. Click the button above to create one.' },
    responses: { zh: '份答卷', en: ' responses' },
    answerBtn: { zh: '作答', en: 'Answer' },
    dashboardBtn: { zh: '看板', en: 'Dashboard' },
    statusActive: { zh: '进行中', en: 'Active' },
    statusClosed: { zh: '已关闭', en: 'Closed' },
    statusExpired: { zh: '已过期', en: 'Expired' },
  };

  const getStatusBadge = (status?: string) => {
    const map: Record<string, { label: string; color: string }> = {
      active: { label: t(ui.statusActive, lang), color: '#10b981' },
      closed: { label: t(ui.statusClosed, lang), color: '#6b7280' },
      expired: { label: t(ui.statusExpired, lang), color: '#f59e0b' },
    };
    const info = map[status || 'active'] || map.active;
    return (
      <span
        style={{
          padding: '2px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          backgroundColor: info.color + '20',
          color: info.color,
          border: `1px solid ${info.color}40`,
        }}
      >
        {info.label}
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e' }}>
      <style>{sharedStyles}</style>

      <header
        style={{
          padding: '20px 40px',
          backgroundColor: '#16213e',
          borderBottom: '1px solid #2d3748',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          <span style={{ fontSize: '28px' }}>📋</span>
          <div>
            <h1 style={{ fontSize: '20px', color: '#e0e0e0', fontWeight: 700 }}>
              {t(ui.title, lang)}
            </h1>
            <p style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '2px' }}>
              {t(ui.subtitle, lang)}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            style={btnSecondary}
          >
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
          <button onClick={() => navigate('/designer')} style={btnPrimary}>
            {t(ui.createBtn, lang)}
          </button>
        </div>
      </header>

      <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '22px', color: '#e0e0e0' }}>{t(ui.listTitle, lang)}</h2>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#a0a0a0' }}>
            {t(ui.loading, lang)}
          </div>
        ) : surveys.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 40px',
              backgroundColor: '#16213e',
              borderRadius: '16px',
              color: '#a0a0a0',
              border: '2px dashed #2d3748',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <p style={{ fontSize: '16px' }}>{t(ui.empty, lang)}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            <AnimatePresence>
              {surveys.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  style={{
                    backgroundColor: '#16213e',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    border: '1px solid #2d3748',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          fontSize: '16px',
                          color: '#e0e0e0',
                          fontWeight: 600,
                          marginBottom: '6px',
                          wordBreak: 'break-word',
                        }}
                      >
                        {t(s.title, lang)}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#a0a0a0' }}>
                        {s.questions?.length || 0} 题 · {s.response_count || 0}{t(ui.responses, lang)}
                      </p>
                    </div>
                    {getStatusBadge(s.status)}
                  </div>

                  {s.description && (t(s.description, lang) || '').trim() !== '' && (
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#a0a0a0',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {t(s.description, lang)}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                    <Link to={`/answer/${s.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                      <button
                        style={{
                          ...btnSecondary,
                          width: '100%',
                          padding: '10px',
                          borderColor: '#e94560',
                          color: '#e94560',
                        }}
                      >
                        {t(ui.answerBtn, lang)}
                      </button>
                    </Link>
                    <Link to={`/dashboard/${s.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                      <button style={{ ...btnPrimary, width: '100%', padding: '10px' }}>
                        {t(ui.dashboardBtn, lang)}
                      </button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/designer" element={<SurveyDesigner />} />
      <Route path="/designer/:id" element={<SurveyDesigner />} />
      <Route path="/answer/:id" element={<SurveyAnswer />} />
      <Route path="/dashboard/:id" element={<SurveyDashboard />} />
    </Routes>
  );
}
