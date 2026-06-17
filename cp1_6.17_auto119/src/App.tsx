import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MoodRecord, MoodType, ViewType } from './types';
import { MOOD_CONFIGS, getMoodConfig, ENERGY_EMOJIS } from './types';
import { getRecords, saveRecord, deleteRecord as doDeleteRecord } from './utils/storage';
import MoodWheel from './components/MoodWheel';
import EnergySlider from './components/EnergySlider';
import HistoryList from './components/HistoryList';
import TrendView from './components/TrendView';

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('diary');
  const [records, setRecords] = useState<MoodRecord[]>([]);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [energy, setEnergy] = useState<number>(5);
  const [toast, setToast] = useState<{ id: number; text: string; emoji: string; color: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRecords(getRecords());
  }, []);

  const showToast = useCallback((text: string, emoji: string, color: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const id = Date.now();
    setToast({ id, text, emoji, color });
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => (t && t.id === id ? null : t));
    }, 2200);
  }, []);

  const handleMoodSelect = useCallback((mood: MoodType) => {
    setSelectedMood(mood);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedMood) {
      showToast('请先选择一种情绪哦', '🤔', '#B898DE');
      return;
    }
    const rec = saveRecord(selectedMood, energy);
    setRecords((prev) => [rec, ...prev].slice(0, 100));
    const cfg = getMoodConfig(selectedMood);
    showToast(`已记录 ${cfg.name} · 能量 ${energy}分`, cfg.emoji, cfg.solidColor);
    setSelectedMood(null);
    setEnergy(5);
  }, [selectedMood, energy, showToast]);

  const handleDelete = useCallback(
    (id: string) => {
      const target = records.find((r) => r.id === id);
      const updated = doDeleteRecord(id);
      setRecords(updated);
      if (target) {
        showToast('已删除该记录', '🗑️', '#9EA4AE');
      }
    },
    [records, showToast]
  );

  const handleSwitchView = useCallback((v: ViewType) => {
    if (v === view) return;
    setView(v);
  }, [view]);

  const todayCount = records.filter((r) => r.dateKey === new Date().toISOString().slice(0, 10)).length;
  const totalCount = records.length;

  return (
    <div style={styles.app}>
      <div style={styles.bgGradient} />
      <div style={styles.bgOrbs} aria-hidden>
        <div style={{ ...styles.orb, ...styles.orb1 }} />
        <div style={{ ...styles.orb, ...styles.orb2 }} />
        <div style={{ ...styles.orb, ...styles.orb3 }} />
      </div>

      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.brand}>
            <span style={styles.brandEmoji}>🌈</span>
            <div style={styles.brandText}>
              <span style={styles.brandTitle}>心灵微光</span>
              <span style={styles.brandSub}>Mood · Energy · Insight</span>
            </div>
          </div>

          <div style={styles.navTabs}>
            {([
              { key: 'diary', label: '日记', icon: '📝' },
              { key: 'trend', label: '趋势', icon: '📊' },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => handleSwitchView(t.key)}
                style={{
                  ...styles.navTab,
                  background:
                    view === t.key
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))'
                      : 'rgba(255,255,255,0.12)',
                  color: view === t.key ? '#3D2F52' : 'rgba(255,255,255,0.92)',
                  boxShadow:
                    view === t.key
                      ? '0 6px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.9)'
                      : 'inset 0 0 0 1px rgba(255,255,255,0.18)',
                  transform: view === t.key ? 'translateY(-1px)' : 'translateY(0)',
                }}
              >
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                <span style={styles.navTabText}>{t.label}</span>
              </button>
            ))}
          </div>

          <div style={styles.navStats}>
            <div style={styles.navStatItem}>
              <span style={styles.navStatIcon}>📌</span>
              <div>
                <span style={styles.navStatValue}>{todayCount}</span>
                <span style={styles.navStatLabel}>今日</span>
              </div>
            </div>
            <div style={styles.navStatDivider} />
            <div style={styles.navStatItem}>
              <span style={styles.navStatIcon}>📚</span>
              <div>
                <span style={styles.navStatValue}>{totalCount}</span>
                <span style={styles.navStatLabel}>总计</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main style={styles.main}>
        <div
          style={{
            ...styles.viewWrap,
            opacity: view === 'diary' ? 1 : 0,
            pointerEvents: view === 'diary' ? 'auto' : 'none',
            transform: view === 'diary' ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          {view === 'diary' && (
            <DiaryView
              selectedMood={selectedMood}
              energy={energy}
              records={records}
              onMoodSelect={handleMoodSelect}
              onEnergyChange={setEnergy}
              onSubmit={handleSubmit}
              onDelete={handleDelete}
            />
          )}
        </div>
        <div
          style={{
            ...styles.viewWrap,
            ...styles.viewOverlay,
            opacity: view === 'trend' ? 1 : 0,
            pointerEvents: view === 'trend' ? 'auto' : 'none',
            transform: view === 'trend' ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          {view === 'trend' && <TrendView records={records} />}
        </div>
      </main>

      {toast && (
        <div
          style={{
            ...styles.toast,
            borderColor: toast.color,
            boxShadow: `0 12px 32px ${toast.color}55, 0 4px 12px rgba(0,0,0,0.08)`,
          }}
        >
          <span style={styles.toastEmoji}>{toast.emoji}</span>
          <span style={{ ...styles.toastText, color: toast.color }}>
            {toast.text}
          </span>
        </div>
      )}
    </div>
  );
};

interface DiaryViewProps {
  selectedMood: MoodType | null;
  energy: number;
  records: MoodRecord[];
  onMoodSelect: (m: MoodType) => void;
  onEnergyChange: (v: number) => void;
  onSubmit: () => void;
  onDelete: (id: string) => void;
}

const DiaryView: React.FC<DiaryViewProps> = ({
  selectedMood,
  energy,
  records,
  onMoodSelect,
  onEnergyChange,
  onSubmit,
  onDelete,
}) => {
  const cfg = selectedMood ? getMoodConfig(selectedMood) : null;

  return (
    <div style={styles.diaryLayout}>
      <div style={styles.leftColumn}>
        <MoodWheel onMoodSelect={onMoodSelect} selectedMood={selectedMood} />

        <div style={{ marginTop: 4, width: '100%', maxWidth: 440 }}>
          <EnergySlider value={energy} onChange={onEnergyChange} disabled={false} />
        </div>

        <button
          onClick={onSubmit}
          style={{
            ...styles.submitBtn,
            background: cfg
              ? `linear-gradient(135deg, ${cfg.gradientFrom}, ${cfg.gradientTo})`
              : 'linear-gradient(135deg, #B898DE, #6B5B8A)',
            boxShadow: cfg
              ? `0 10px 30px ${cfg.solidColor}66, 0 3px 10px rgba(0,0,0,0.08)`
              : '0 10px 30px rgba(107,91,138,0.3), 0 3px 10px rgba(0,0,0,0.06)',
          }}
        >
          <span style={styles.submitEmoji}>{cfg ? cfg.emoji : ENERGY_EMOJIS[energy]}</span>
          <span style={styles.submitText}>
            {cfg ? `记录${cfg.name}的一刻` : '先选择一个情绪吧'}
          </span>
          <span style={styles.submitArrow}>➜</span>
        </button>
      </div>

      <div style={styles.rightColumn}>
        <HistoryList records={records} onDelete={onDelete} />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    position: 'relative',
    minHeight: '100vh',
    width: '100%',
    overflow: 'hidden',
    fontFamily:
      '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, -apple-system, sans-serif',
    color: '#3D2F52',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  },
  bgGradient: {
    position: 'fixed',
    inset: 0,
    background:
      'radial-gradient(1200px 800px at 10% 0%, #E8E0F0 0%, #F5F0FA 45%, #EDE6F6 100%)',
    zIndex: -3,
  },
  bgOrbs: {
    position: 'fixed',
    inset: 0,
    zIndex: -2,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  orb: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(60px)',
    opacity: 0.55,
    willChange: 'transform',
  },
  orb1: {
    width: 380,
    height: 380,
    left: '-80px',
    top: '15%',
    background:
      'radial-gradient(circle, rgba(255,179,71,0.6) 0%, rgba(255,179,71,0) 70%)',
    animation: 'orbFloat1 14s ease-in-out infinite',
  },
  orb2: {
    width: 440,
    height: 440,
    right: '-100px',
    top: '40%',
    background:
      'radial-gradient(circle, rgba(163,242,208,0.55) 0%, rgba(163,242,208,0) 70%)',
    animation: 'orbFloat2 18s ease-in-out infinite',
  },
  orb3: {
    width: 360,
    height: 360,
    left: '40%',
    bottom: '-120px',
    background:
      'radial-gradient(circle, rgba(184,152,222,0.55) 0%, rgba(184,152,222,0) 70%)',
    animation: 'orbFloat3 22s ease-in-out infinite',
  },
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    padding: '14px 24px',
    background:
      'linear-gradient(135deg, #4A3A5C 0%, #5C4A75 45%, #6B5B8A 100%)',
    boxShadow: '0 8px 28px rgba(74,58,92,0.28)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(20px)',
  },
  navInner: {
    maxWidth: 1400,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    flexWrap: 'wrap',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  brandEmoji: {
    fontSize: 30,
    filter: 'drop-shadow(0 2px 6px rgba(255,255,255,0.3))',
    animation: 'brandSpin 10s linear infinite',
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.1,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '3px',
    textShadow: '0 2px 8px rgba(0,0,0,0.25)',
  },
  brandSub: {
    fontSize: 10,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: '2.5px',
    marginTop: 2,
  },
  navTabs: {
    display: 'flex',
    gap: 8,
    padding: 4,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  navTab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 22px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '1.5px',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    outline: 'none',
  },
  navTabText: {},
  navStats: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.15)',
    flexShrink: 0,
  },
  navStatItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#fff',
  },
  navStatIcon: { fontSize: 16 },
  navStatValue: {
    fontSize: 18,
    fontWeight: 800,
    marginRight: 4,
    letterSpacing: '1px',
  },
  navStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: 600,
    letterSpacing: '1px',
  },
  navStatDivider: {
    width: 1,
    height: 22,
    background: 'rgba(255,255,255,0.2)',
  },
  main: {
    position: 'relative',
    maxWidth: 1400,
    margin: '0 auto',
    padding: '28px 28px 48px',
    minHeight: 'calc(100vh - 80px)',
  },
  viewWrap: {
    position: 'relative',
    transition:
      'opacity 0.32s cubic-bezier(0.4, 0, 0.2, 1), transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
    minHeight: 0,
  },
  viewOverlay: {
    position: 'absolute',
    inset: '28px 28px 0',
  },
  diaryLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(360px, 0.9fr)',
    gap: 28,
    alignItems: 'flex-start',
    minHeight: 0,
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 22,
    padding: '12px 12px 12px 0',
    position: 'sticky',
    top: 110,
  },
  rightColumn: {
    minHeight: 560,
    maxHeight: 'calc(100vh - 140px)',
    background: 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(16px)',
    borderRadius: 22,
    border: '1px solid rgba(255,255,255,0.75)',
    boxShadow: '0 12px 36px rgba(74,58,92,0.1)',
    padding: 22,
    display: 'flex',
    overflow: 'hidden',
  },
  submitBtn: {
    width: '100%',
    maxWidth: 440,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '16px 28px',
    borderRadius: 18,
    border: 'none',
    cursor: 'pointer',
    color: '#fff',
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: '2px',
    transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
    outline: 'none',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
  },
  submitEmoji: { fontSize: 22 },
  submitText: {},
  submitArrow: {
    fontSize: 18,
    marginLeft: 4,
    transition: 'transform 0.25s',
  },
  toast: {
    position: 'fixed',
    bottom: 40,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 24px',
    background: 'rgba(255,255,255,0.98)',
    backdropFilter: 'blur(16px)',
    borderRadius: 999,
    border: '2px solid',
    zIndex: 200,
    animation: 'toastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  toastEmoji: { fontSize: 22 },
  toastText: {
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: '1px',
  },
};

export default App;
