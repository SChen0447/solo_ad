import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { io, Socket } from 'socket.io-client';
import {
  Survey,
  SurveyStats,
  QuestionStat,
  Language,
  ChoiceStatItem,
  RatingStatData,
  TextStatData,
} from './types';
import { t, downloadCSV, escapeCSV } from './utils';
import { getSurvey, getStats, deleteSurvey, closeSurvey, listResponses } from './api';

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
  @keyframes skeleton {
    0% { background-position: -200px 0; }
    100% { background-position: 200px 0; }
  }
  .skeleton {
    background: linear-gradient(90deg, #16213e 25%, #1f2a4a 50%, #16213e 75%);
    background-size: 400px 100%;
    animation: skeleton 1.2s ease-in-out infinite;
    border-radius: 8px;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .fade-in { animation: fadeIn 0.4s ease-out; }
  @keyframes growUp {
    from { transform: scaleY(0); opacity: 0; }
    to { transform: scaleY(1); opacity: 1; }
  }
  .bar-grow { transform-origin: bottom; animation: growUp 0.3s ease-out; }
`;

const btnPrimary: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '8px',
  backgroundColor: '#e94560',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
};

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  backgroundColor: 'transparent',
  color: '#e0e0e0',
  fontSize: '13px',
  border: '1px solid #2d3748',
};

const CHART_COLORS = [
  '#e94560',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1',
];

const CHART_COLORS_TRANSPARENT = CHART_COLORS.map((c) => c + '30');

export default function SurveyDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Language>('zh');
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [newAnswerCount, setNewAnswerCount] = useState(0);
  const [showNewAnswer, setShowNewAnswer] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const ui = {
    back: { zh: '← 返回首页', en: '← Home' },
    dashboardTitle: { zh: '数据看板', en: 'Data Dashboard' },
    language: { zh: '语言', en: 'Language' },
    loading: { zh: '加载数据中...', en: 'Loading data...' },
    loadError: { zh: '加载数据失败', en: 'Failed to load data' },
    surveyClosed: { zh: '该问卷已关闭', en: 'This survey is closed' },
    surveyExpired: { zh: '该问卷已过期', en: 'This survey has expired' },
    surveyDeleted: { zh: '该问卷已被删除', en: 'This survey has been deleted' },
    surveyClosedMsg: { zh: '数据看板仍可查看，但不再接收新答案。', en: 'Dashboard still accessible but no new answers accepted.' },
    totalResponses: { zh: '答卷总数', en: 'Total Responses' },
    totalQuestions: { zh: '问题数量', en: 'Questions Count' },
    lastUpdated: { zh: '最后更新', en: 'Last Updated' },
    wsConnected: { zh: '实时连接中', en: 'Live Connected' },
    wsDisconnected: { zh: '实时已断开', en: 'Live Disconnected' },
    exportCSV: { zh: '导出 CSV', en: 'Export CSV' },
    closeSurvey: { zh: '关闭问卷', en: 'Close Survey' },
    deleteSurvey: { zh: '删除问卷', en: 'Delete Survey' },
    goAnswer: { zh: '前往作答', en: 'Go to Answer' },
    goDesigner: { zh: '返回设计', en: 'Go to Designer' },
    confirmDeleteTitle: { zh: '确认删除？', en: 'Confirm Delete?' },
    confirmDeleteDesc: {
      zh: '此操作将永久删除该问卷及其所有答卷数据，无法恢复。',
      en: 'This will permanently delete the survey and all responses.',
    },
    confirmCloseTitle: { zh: '确认关闭问卷？', en: 'Confirm Close?' },
    confirmCloseDesc: {
      zh: '关闭后将无法再提交新答卷，数据看板仍可查看。',
      en: 'No more responses allowed, dashboard still accessible.',
    },
    cancel: { zh: '取消', en: 'Cancel' },
    confirm: { zh: '确认', en: 'Confirm' },
    newAnswer: { zh: '收到新答卷！', en: 'New answer received!' },
    noData: { zh: '暂无数据', en: 'No data yet' },
    noDataDesc: { zh: '等待第一份答卷提交...', en: 'Waiting for the first response...' },
    noResponses: { zh: '暂无文本回答', en: 'No text responses yet' },
    avgRating: { zh: '平均分', en: 'Average' },
    responses: { zh: '份答卷', en: ' responses' },
    responseCount: { zh: '作答人次', en: 'Answered' },
    shareAnswer: { zh: '复制作答链接', en: 'Copy Answer Link' },
    copied: { zh: '已复制！', en: 'Copied!' },
    trendTitle: { zh: '提交趋势', en: 'Submission Trend' },
  };

  const connectWS = useCallback(() => {
    if (!id || socketRef.current) return;
    try {
      const socket = io({ transports: ['websocket', 'polling'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        setWsConnected(true);
        socket.emit('subscribe_survey', { survey_id: id });
      });

      socket.on('disconnect', () => {
        setWsConnected(false);
      });

      socket.on('survey_subscribed', (data: any) => {
        if (data?.stats) {
          setStats(data.stats);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      });

      socket.on('new_answer', (data: any) => {
        setNewAnswerCount((prev) => prev + 1);
        setShowNewAnswer(true);
        setTimeout(() => setShowNewAnswer(false), 3000);
      });

      socket.on('update_stats', (data: any) => {
        if (data?.survey_id === id && data?.stats) {
          setStats(data.stats);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      });

      socket.on('survey_closed', (data: any) => {
        if (data?.survey_id === id) {
          const reason = data.reason || 'closed';
          if (reason === 'deleted') setClosed(t(ui.surveyDeleted, lang));
          else if (reason === 'expired') setClosed(t(ui.surveyExpired, lang));
          else setClosed(t(ui.surveyClosed, lang));
          socket.disconnect();
        }
      });

      socket.on('error', () => {
        setWsConnected(false);
      });
    } catch (e) {
      console.error('WS error:', e);
      setWsConnected(false);
    }
  }, [id, lang]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      try {
        const [s, st] = await Promise.all([getSurvey(id), getStats(id)]);
        if (!mounted) return;
        setSurvey(s);
        setStats(st);
        setLastUpdated(new Date().toLocaleTimeString());
        if (s.status !== 'active') {
          const map: Record<string, string> = {
            closed: t(ui.surveyClosed, lang),
            expired: t(ui.surveyExpired, lang),
            deleted: t(ui.surveyDeleted, lang),
          };
          setClosed(map[s.status || ''] || t(ui.surveyClosed, lang));
        } else {
          connectWS();
        }
      } catch (e: any) {
        if (!mounted) return;
        const msg = e?.response?.data?.error || e.message || t(ui.loadError, lang);
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe_survey', { survey_id: id });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [id, connectWS, lang]);

  const handleExportCSV = async () => {
    if (!survey || !id) return;
    try {
      const responses = await listResponses(id);
      const questions = survey.questions;
      const headers = ['ID', lang === 'zh' ? '提交时间' : 'Submitted At', lang === 'zh' ? '填写人' : 'Respondent'];
      for (const q of questions) {
        headers.push(t(q.title, lang));
      }
      const rows = [headers.map(escapeCSV).join(',')];
      for (const r of responses) {
        const row = [
          escapeCSV(r.id || ''),
          escapeCSV(r.submitted_at || ''),
          escapeCSV(r.respondent || ''),
        ];
        for (const q of questions) {
          const ans = r.answers[q.id];
          if (Array.isArray(ans)) {
            const labels = ans
              .map((aid) => {
                const opt = q.options?.find((o) => o.id === aid);
                return opt ? t(opt.label, lang) : aid;
              })
              .join('; ');
            row.push(escapeCSV(labels));
          } else if (q.type === 'rating') {
            row.push(escapeCSV(String(ans ?? '')));
          } else {
            row.push(escapeCSV(String(ans ?? '')));
          }
        }
        rows.push(row.join(','));
      }
      const filename = `survey_${id}_${Date.now()}.csv`;
      downloadCSV(rows.join('\r\n'), filename);
    } catch (e: any) {
      alert(e.message || 'Export failed');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteSurvey(id);
      setClosed(t(ui.surveyDeleted, lang));
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleClose = async () => {
    if (!id) return;
    try {
      const updated = await closeSurvey(id);
      setSurvey(updated);
      setClosed(t(ui.surveyClosed, lang));
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    } catch (e: any) {
      alert(e.message || 'Close failed');
    } finally {
      setConfirmClose(false);
    }
  };

  const copyAnswerLink = async () => {
    if (!id) return;
    const link = `${window.location.origin}/answer/${id}`;
    try {
      await navigator.clipboard.writeText(link);
      alert(t(ui.copied, lang));
    } catch {
      prompt(lang === 'zh' ? '复制此链接：' : 'Copy this link:', link);
    }
  };

  const trendData = useMemo(() => {
    if (!stats?.submitted_at_list?.length) return [];
    const counts: Record<string, number> = {};
    for (const dt of stats.submitted_at_list) {
      const key = dt.slice(0, 16).replace('T', ' ');
      counts[key] = (counts[key] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
    let cum = 0;
    return sorted.map(([time, c]) => {
      cum += c;
      return { time, count: c, cumulative: cum };
    });
  }, [stats]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', padding: '40px' }}>
        <style>{sharedStyles}</style>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="skeleton" style={{ height: '70px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: '100px' }} />
            ))}
          </div>
          <div className="skeleton" style={{ height: '280px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: '340px' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!survey || !stats || error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <style>{sharedStyles}</style>
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            padding: '40px',
            backgroundColor: '#16213e',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>😢</div>
          <h2 style={{ fontSize: '22px', color: '#e0e0e0', marginBottom: '12px' }}>
            {error || t(ui.loadError, lang)}
          </h2>
          <p style={{ fontSize: '14px', color: '#a0a0a0', marginBottom: '24px' }}>
            {lang === 'zh' ? '请检查链接是否正确。' : 'Please check the URL.'}
          </p>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <button style={btnSecondary}>{t(ui.back, lang)}</button>
          </Link>
        </div>
      </div>
    );
  }

  const totalResponses = stats.total_responses;
  const hasData = totalResponses > 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e' }}>
      <style>{sharedStyles}</style>

      <header
        style={{
          padding: '16px 32px',
          backgroundColor: '#16213e',
          borderBottom: '1px solid #2d3748',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <button style={btnSecondary}>{t(ui.back, lang)}</button>
          </Link>
          <div>
            <h1 style={{ fontSize: '18px', color: '#e0e0e0', fontWeight: 700 }}>
              📊 {t(ui.dashboardTitle, lang)}
            </h1>
            <p style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '2px', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t(survey.title, lang)}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              backgroundColor: wsConnected ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
              color: wsConnected ? '#10b981' : '#6b7280',
              border: `1px solid ${wsConnected ? 'rgba(16,185,129,0.4)' : 'rgba(107,114,128,0.4)'}`,
            }}
          >
            {wsConnected ? '🟢' : '🔴'} {wsConnected ? t(ui.wsConnected, lang) : t(ui.wsDisconnected, lang)}
          </span>
          <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} style={btnSecondary}>
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
          <button onClick={copyAnswerLink} style={btnSecondary}>
            🔗 {t(ui.shareAnswer, lang)}
          </button>
          <button onClick={handleExportCSV} style={btnSecondary}>
            📥 {t(ui.exportCSV, lang)}
          </button>
          {!closed && (
            <>
              <button onClick={() => setConfirmClose(true)} style={{ ...btnSecondary, borderColor: '#f59e0b', color: '#f59e0b' }}>
                ⏸️ {t(ui.closeSurvey, lang)}
              </button>
              <button onClick={() => setConfirmDelete(true)} style={{ ...btnSecondary, borderColor: '#e94560', color: '#e94560' }}>
                🗑️ {t(ui.deleteSurvey, lang)}
              </button>
            </>
          )}
          <Link to={`/answer/${id}`} style={{ textDecoration: 'none' }}>
            <button style={btnPrimary}>✏️ {t(ui.goAnswer, lang)}</button>
          </Link>
        </div>
      </header>

      <AnimatePresence>
        {showNewAnswer && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            transition={{ type: 'spring', damping: 20 }}
            style={{
              position: 'fixed',
              top: '100px',
              left: '50%',
              padding: '12px 24px',
              backgroundColor: 'rgba(16,185,129,0.95)',
              color: '#fff',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              zIndex: 500,
              boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
            }}
          >
            ✨ {t(ui.newAnswer, lang)} (+{newAnswerCount})
          </motion.div>
        )}
      </AnimatePresence>

      {closed && (
        <div
          style={{
            padding: '14px 32px',
            backgroundColor: 'rgba(107,114,128,0.15)',
            borderBottom: '1px solid rgba(107,114,128,0.3)',
            color: '#9ca3af',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '18px' }}>⏹️</span>
          <strong style={{ color: '#cbd5e1' }}>{closed}</strong>
          <span>{t(ui.surveyClosedMsg, lang)}</span>
        </div>
      )}

      <main style={{ padding: '28px 32px 60px', maxWidth: '1400px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <StatCard
            icon="📝"
            label={t(ui.totalResponses, lang)}
            value={String(totalResponses)}
            color="#e94560"
            highlight={newAnswerCount > 0}
          />
          <StatCard icon="❓" label={t(ui.totalQuestions, lang)} value={String(survey.questions.length)} color="#3b82f6" />
          <StatCard icon="🕐" label={t(ui.lastUpdated, lang)} value={lastUpdated || '-'} color="#f59e0b" />
          <StatCard
            icon={wsConnected ? '🟢' : '🔴'}
            label={lang === 'zh' ? '实时状态' : 'Live Status'}
            value={wsConnected ? 'Live' : 'Offline'}
            color={wsConnected ? '#10b981' : '#6b7280'}
          />
        </div>

        {!hasData ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '80px 40px',
              backgroundColor: '#16213e',
              borderRadius: '16px',
              textAlign: 'center',
              border: '2px dashed #2d3748',
            }}
          >
            <div style={{ fontSize: '72px', marginBottom: '20px' }}>📊</div>
            <h3 style={{ fontSize: '22px', color: '#e0e0e0', marginBottom: '10px', fontWeight: 600 }}>
              {t(ui.noData, lang)}
            </h3>
            <p style={{ fontSize: '15px', color: '#a0a0a0' }}>{t(ui.noDataDesc, lang)}</p>
            <div style={{ marginTop: '24px', display: 'inline-flex', gap: '12px' }}>
              <Link to={`/answer/${id}`} style={{ textDecoration: 'none' }}>
                <button style={btnPrimary}>✏️ {lang === 'zh' ? '去作答' : 'Go Answer'}</button>
              </Link>
              <button onClick={copyAnswerLink} style={btnSecondary}>
                🔗 {lang === 'zh' ? '分享链接' : 'Share Link'}
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            {trendData.length > 1 && (
              <div
                style={{
                  backgroundColor: '#16213e',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  marginBottom: '24px',
                }}
                className="fade-in"
              >
                <h3 style={{ fontSize: '16px', color: '#e0e0e0', fontWeight: 600, marginBottom: '16px' }}>
                  📈 {t(ui.trendTitle, lang)} ({trendData.length} {lang === 'zh' ? '个时间点' : 'time points'})
                </h3>
                <div style={{ height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                      <XAxis dataKey="time" stroke="#6b7280" fontSize={11} tick={{ fill: '#6b7280' }} />
                      <YAxis stroke="#6b7280" fontSize={11} tick={{ fill: '#6b7280' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#16213e',
                          border: '1px solid #2d3748',
                          borderRadius: '8px',
                          color: '#e0e0e0',
                          fontSize: '13px',
                        }}
                        labelStyle={{ color: '#a0a0a0' }}
                      />
                      <Legend wrapperStyle={{ color: '#a0a0a0', fontSize: '12px' }} />
                      <Line
                        type="monotone"
                        dataKey="cumulative"
                        name={lang === 'zh' ? '累计' : 'Cumulative'}
                        stroke="#e94560"
                        strokeWidth={2.5}
                        dot={{ fill: '#e94560', r: 3 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name={lang === 'zh' ? '新增' : 'New'}
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
                gap: '20px',
              }}
            >
              {survey.questions.map((q, idx) => {
                const qstat = stats.question_stats[q.id];
                if (!qstat) return null;
                return (
                  <ChartCard
                    key={q.id}
                    index={idx}
                    question={q}
                    stat={qstat}
                    lang={lang}
                    ui={ui}
                  />
                );
              })}
            </div>
          </>
        )}
      </main>

      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDialog
            title={t(ui.confirmDeleteTitle, lang)}
            description={t(ui.confirmDeleteDesc, lang)}
            danger
            onCancel={() => setConfirmDelete(false)}
            onConfirm={handleDelete}
            confirmText={t(ui.confirm, lang)}
            cancelText={t(ui.cancel, lang)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmClose && (
          <ConfirmDialog
            title={t(ui.confirmCloseTitle, lang)}
            description={t(ui.confirmCloseDesc, lang)}
            warning
            onCancel={() => setConfirmClose(false)}
            onConfirm={handleClose}
            confirmText={t(ui.confirm, lang)}
            cancelText={t(ui.cancel, lang)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        backgroundColor: '#16213e',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        border: highlight ? `1px solid ${color}60` : '1px solid #2d3748',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {highlight && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{
            position: 'absolute',
            right: '-30px',
            top: '-30px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: color,
            opacity: 0.1,
          }}
        />
      )}
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '12px',
          backgroundColor: color + '20',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '26px',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '4px' }}>{label}</div>
        <div
          style={{
            fontSize: '26px',
            fontWeight: 700,
            color: '#e0e0e0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </div>
      </div>
    </motion.div>
  );
}

function ChartCard({
  index,
  question,
  stat,
  lang,
  ui,
}: {
  index: number;
  question: { id: string; type: string; title: any; maxRating?: number; options?: any[] };
  stat: QuestionStat;
  lang: Language;
  ui: any;
}) {
  const qtype = question.type;
  const height = qtype === 'text' ? 'auto' : '320px';
  const title = t(question.title, lang) || (lang === 'zh' ? '题目' : 'Question');

  const renderChart = () => {
    if (qtype === 'single_choice' || qtype === 'multiple_choice') {
      const data = stat.data as Record<string, ChoiceStatItem>;
      const entries = Object.entries(data);
      const chartData = entries.map(([k, v], i) => ({
        name: t(v.label, lang) || k,
        value: v.count,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      }));
      const total = entries.reduce((s, [, v]) => s + v.count, 0);
      const noneSelected = total === 0;

      if (noneSelected) {
        return <EmptyChartMessage lang={lang} />;
      }

      return (
        <div style={{ height: '260px', display: 'flex' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={90}
                  innerRadius={45}
                  fill="#8884d8"
                  dataKey="value"
                  className="bar-grow"
                  label={({ name, percent }) =>
                    `${name.slice(0, 8)}${name.length > 8 ? '..' : ''} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} stroke="#16213e" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => {
                    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                    return [`${value} ${lang === 'zh' ? '票' : 'votes'} (${pct}%)`, title];
                  }}
                  contentStyle={{
                    backgroundColor: '#16213e',
                    border: '1px solid #2d3748',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '13px',
                  }}
                  labelStyle={{ color: '#a0a0a0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{
              width: '150px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '12px',
              paddingLeft: '8px',
            }}
          >
            {chartData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: d.fill }} />
                <span style={{ color: '#a0a0a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.name.slice(0, 10)}: {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (qtype === 'rating') {
      const data = stat.data as RatingStatData;
      const average = data.average ?? stat.average ?? 0;
      const entries = Object.entries(data).filter(([k]) => k !== 'average');
      const chartData = entries.map(([k, v], i) => ({
        name: t(v.label, lang) || k,
        value: v.count,
        fill: '#f59e0b',
      }));

      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div />
            <div
              style={{
                padding: '10px 20px',
                backgroundColor: 'rgba(245,158,11,0.1)',
                borderRadius: '10px',
                border: '1px solid rgba(245,158,11,0.3)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', color: '#f59e0b', fontWeight: 700, lineHeight: 1 }}>
                {average.toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px', fontWeight: 600 }}>
                ⭐ {t(ui.avgRating, lang)}
              </div>
            </div>
            <div />
          </div>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tick={{ fill: '#6b7280' }} />
                <YAxis stroke="#6b7280" fontSize={11} tick={{ fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number) => [`${value} ${lang === 'zh' ? '票' : 'votes'}`, title]}
                  contentStyle={{
                    backgroundColor: '#16213e',
                    border: '1px solid #2d3748',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '13px',
                  }}
                  labelStyle={{ color: '#a0a0a0' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} className="bar-grow">
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    if (qtype === 'text') {
      const data = stat.data as TextStatData;
      const texts = data.texts || [];
      if (texts.length === 0) {
        return <EmptyChartMessage lang={lang} text={ui.noResponses} />;
      }
      const wordCounts: Record<string, number> = {};
      for (const t of texts) {
        const words = String(t.content).split(/[\s,，。.!?！？;；:："''()（）、]+/).filter(Boolean);
        for (const w of words) {
          if (w.length >= 2) wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
      }
      const topWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);
      const wordChartData = topWords.map(([word, count], i) => ({
        name: word.length > 10 ? word.slice(0, 10) + '..' : word,
        value: count,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      }));

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {topWords.length >= 3 && (
            <div style={{ height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wordChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" horizontal={false} />
                  <XAxis type="number" stroke="#6b7280" fontSize={11} tick={{ fill: '#6b7280' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={11} tick={{ fill: '#e0e0e0' }} width={80} />
                  <Tooltip
                    formatter={(value: number) => [`${value} ${lang === 'zh' ? '次' : 'times'}`, title]}
                    contentStyle={{
                      backgroundColor: '#16213e',
                      border: '1px solid #2d3748',
                      borderRadius: '8px',
                      color: '#e0e0e0',
                      fontSize: '13px',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} className="bar-grow">
                    {wordChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingRight: '4px',
            }}
          >
            {texts.slice(0, 50).map((t, i) => (
              <div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#0f172a',
                  borderRadius: '10px',
                  border: '1px solid #2d3748',
                  borderLeft: `3px solid ${CHART_COLORS[i % CHART_COLORS.length]}`,
                }}
                className="fade-in"
              >
                <div style={{ fontSize: '14px', color: '#e0e0e0', lineHeight: 1.6, marginBottom: '6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {String(t.content)}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{t.submitted_at?.replace('T', ' ') || ''}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      style={{
        backgroundColor: '#16213e',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        border: '1px solid #2d3748',
        minWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="fade-in"
    >
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '26px',
                height: '26px',
                padding: '0 8px',
                borderRadius: '6px',
                backgroundColor: CHART_COLORS[index % CHART_COLORS.length] + '20',
                color: CHART_COLORS[index % CHART_COLORS.length],
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              Q{index + 1}
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#0f172a',
                color: '#6b7280',
                fontSize: '11px',
              }}
            >
              {qtype === 'single_choice' && (lang === 'zh' ? '单选' : 'Single')}
              {qtype === 'multiple_choice' && (lang === 'zh' ? '多选' : 'Multiple')}
              {qtype === 'rating' && (lang === 'zh' ? '评分' : 'Rating')}
              {qtype === 'text' && (lang === 'zh' ? '文本' : 'Text')}
            </span>
          </div>
          <h4
            style={{
              fontSize: '15px',
              color: '#e0e0e0',
              fontWeight: 600,
              lineHeight: 1.4,
              wordBreak: 'break-word',
            }}
          >
            {title}
          </h4>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: CHART_COLORS[index % CHART_COLORS.length] }}>
            {stat.response_count}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>{t(ui.responseCount, lang)}</div>
        </div>
      </div>

      <div style={{ minHeight: qtype === 'text' ? '200px' : '240px', flex: 1 }}>{renderChart()}</div>
    </motion.div>
  );
}

function EmptyChartMessage({ lang, text }: { lang: Language; text?: any }) {
  return (
    <div
      style={{
        height: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ fontSize: '36px', opacity: 0.4 }}>📊</div>
      <p style={{ fontSize: '13px', color: '#6b7280' }}>
        {text || (lang === 'zh' ? '暂无作答数据' : 'No responses yet')}
      </p>
    </div>
  );
}

function ConfirmDialog({
  title,
  description,
  onCancel,
  onConfirm,
  confirmText,
  cancelText,
  danger,
  warning,
}: {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText: string;
  cancelText: string;
  danger?: boolean;
  warning?: boolean;
}) {
  const accent = danger ? '#e94560' : warning ? '#f59e0b' : '#e94560';
  const icon = danger ? '⚠️' : warning ? '🔔' : '❓';
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '440px',
          width: '100%',
          backgroundColor: '#16213e',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '56px',
              width: '88px',
              height: '88px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              backgroundColor: accent + '15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${accent}40`,
            }}
          >
            {icon}
          </div>
          <h3 style={{ fontSize: '22px', color: '#e0e0e0', marginBottom: '10px', fontWeight: 700 }}>{title}</h3>
          <p style={{ fontSize: '14px', color: '#a0a0a0', lineHeight: 1.6 }}>{description}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onCancel} style={{ ...btnSecondary, flex: 1, padding: '12px' }}>
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: accent,
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
