import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import PlanForm from './modules/planGenerator/PlanForm';
import PlanBook from './modules/planGenerator/PlanBook';
import ShareView from './ShareView';
import type { PlanBookData } from './types';

const App: React.FC = () => {
  const [planData, setPlanData] = useState<PlanBookData | null>(null);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.logo}>商业计划书助手</h1>
          <span style={styles.tagline}>为创业者打造的专业计划书工具</span>
        </div>
      </header>

      <main style={styles.main}>
        <Routes>
          <Route
            path="/"
            element={
              planData ? (
                <div style={styles.content}>
                  <button onClick={() => setPlanData(null)} style={styles.backBtn}>
                    ← 重新创建
                  </button>
                  <PlanBook data={planData} />
                </div>
              ) : (
                <PlanForm onGenerated={setPlanData} />
              )
            }
          />
          <Route path="/share/:uuid" element={<ShareView />} />
        </Routes>
      </main>

      <footer style={styles.footer}>
        <p>© 2026 商业计划书助手 · 助力创业梦想</p>
      </footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#f4f6f9',
  },
  header: {
    background: '#1e3a5f',
    padding: '16px 0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  headerInner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'baseline',
    gap: 16,
  },
  logo: {
    fontSize: 22,
    fontWeight: 700,
    color: '#fff',
  },
  tagline: {
    fontSize: 13,
    color: '#94a3b8',
  },
  main: {
    flex: 1,
    maxWidth: 1200,
    width: '100%',
    margin: '0 auto',
    padding: '32px 24px',
    boxSizing: 'border-box' as const,
  },
  content: {
    width: '100%',
  },
  backBtn: {
    padding: '8px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: '#1e3a5f',
    background: '#fff',
    border: '1.5px solid #1e3a5f',
    borderRadius: 8,
    cursor: 'pointer',
    marginBottom: 24,
    transition: 'all 0.2s',
  },
  footer: {
    textAlign: 'center' as const,
    padding: '20px 0',
    fontSize: 13,
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
  },
};

export default App;
