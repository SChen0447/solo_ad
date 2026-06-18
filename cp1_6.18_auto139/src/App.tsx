import React, { useState, useCallback, useRef } from 'react';
import CharacterSheet from './modules/character/CharacterSheet';
import JudgePanel from './modules/judge/JudgePanel';
import { useCharacterStore } from './modules/character/characterStore';
import { useDiceStore } from './modules/dice/diceStore';
import { useJudgeStore } from './modules/judge/judgeStore';

type TabId = 'character' | 'judge' | 'history';

const TAB_ITEMS: { id: TabId; label: string; icon: string }[] = [
  { id: 'character', label: '角色卡', icon: '👤' },
  { id: 'judge', label: '判定面板', icon: '⚔️' },
  { id: 'history', label: '历史记录', icon: '📜' },
];

function HistoryPanel() {
  const history = useDiceStore((s) => s.history);
  const getStats = useDiceStore((s) => s.getStats);
  const judgeLogs = useJudgeStore((s) => s.logs);
  const levelUpRecords = useCharacterStore((s) => s.character?.levelUpRecords ?? []);
  const stats = getStats();
  const maxDist = Math.max(...Object.values(stats.distribution), 1);

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ color: '#D4A843', fontSize: 20, fontWeight: 700, margin: '0 0 20px 0', textAlign: 'center' as const }}>
        投点历史记录
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={histStyles.statCard}>
          <div style={histStyles.statLabel}>总投点次数</div>
          <div style={histStyles.statValue}>{stats.totalRolls}</div>
        </div>
        <div style={histStyles.statCard}>
          <div style={histStyles.statLabel}>平均点数</div>
          <div style={histStyles.statValue}>{stats.average}</div>
        </div>
        <div style={histStyles.statCard}>
          <div style={histStyles.statLabel}>判定次数</div>
          <div style={histStyles.statValue}>{judgeLogs.length}</div>
        </div>
      </div>

      <div style={{ ...histStyles.section, marginBottom: 24 }}>
        <h4 style={{ color: '#D4A843', fontSize: 15, margin: '0 0 12px 0' }}>点数分布 (1-20)</h4>
        <div style={histStyles.chartContainer}>
          {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
            <div key={num} style={histStyles.barGroup}>
              <span style={histStyles.barTopLabel}>{stats.distribution[num] || 0}</span>
              <div style={histStyles.barTrack}>
                <div
                  style={{
                    ...histStyles.barFill,
                    height: `${((stats.distribution[num] || 0) / maxDist) * 100}%`,
                  }}
                />
              </div>
              <span style={histStyles.barBottomLabel}>{num}</span>
            </div>
          ))}
        </div>
      </div>

      {levelUpRecords.length > 0 && (
        <div style={{ ...histStyles.section, marginBottom: 24 }}>
          <h4 style={{ color: '#D4A843', fontSize: 15, margin: '0 0 12px 0' }}>升级记录</h4>
          <div style={histStyles.timeline}>
            {levelUpRecords.map((r, idx) => (
              <div key={idx} style={histStyles.timelineItem}>
                <div style={histStyles.timelineDot} />
                <div style={histStyles.timelineContent}>
                  <div style={histStyles.timelineTime}>
                    {new Date(r.timestamp).toLocaleString('zh-CN')}
                  </div>
                  <div style={histStyles.timelineLevel}>等级 {r.level}</div>
                  <div style={histStyles.timelineAttrs}>
                    力{r.attributes.力量} 敏{r.attributes.敏捷} 体{r.attributes.体质}
                    智{r.attributes.智力} 感{r.attributes.感知} 魅{r.attributes.魅力}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={histStyles.section}>
        <h4 style={{ color: '#D4A843', fontSize: 15, margin: '0 0 12px 0' }}>最近投点记录</h4>
        <div style={histStyles.tableWrap}>
          <table style={histStyles.table}>
            <thead>
              <tr>
                <th style={histStyles.th}>时间</th>
                <th style={histStyles.th}>配置</th>
                <th style={histStyles.th}>详情</th>
                <th style={histStyles.th}>判定</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id}>
                  <td style={histStyles.td}>
                    {new Date(r.timestamp).toLocaleTimeString('zh-CN')}
                  </td>
                  <td style={histStyles.td}>
                    {r.config.diceCount}D{r.config.sides}
                    {r.config.modifier ? (r.config.modifier > 0 ? '+' : '') + r.config.modifier : ''}
                  </td>
                  <td style={histStyles.td}>{r.result.total}</td>
                  <td style={histStyles.td}>{r.isJudge ? '✔' : ''}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ ...histStyles.td, textAlign: 'center' as const, color: '#8B7355' }}>
                    暂无记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const histStyles: Record<string, React.CSSProperties> = {
  statCard: {
    background: 'rgba(43,29,14,0.85)',
    borderRadius: 8,
    border: '1px solid #5C4033',
    padding: 14,
    textAlign: 'center' as const,
  },
  statLabel: {
    color: '#8B7355',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#D4A843',
    fontSize: 22,
    fontWeight: 700,
  },
  section: {
    background: 'rgba(43,29,14,0.85)',
    borderRadius: 10,
    border: '1px solid #5C4033',
    padding: 16,
  },
  chartContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 4,
    height: 140,
    padding: '0 4px',
  },
  barGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    height: '100%',
  },
  barTopLabel: {
    fontSize: 9,
    color: '#D4A843',
    fontWeight: 700,
    marginBottom: 2,
    minHeight: 12,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    background: 'rgba(20,14,8,0.6)',
    borderRadius: 3,
    display: 'flex',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    background: 'linear-gradient(180deg, #D4A843, #8B6914)',
    borderRadius: 3,
    minHeight: 0,
    transition: 'height 0.3s ease',
  },
  barBottomLabel: {
    fontSize: 8,
    color: '#8B7355',
    marginTop: 3,
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  timelineItem: {
    display: 'flex',
    gap: 12,
    position: 'relative' as const,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#D4A843',
    flexShrink: 0,
    marginTop: 4,
    boxShadow: '0 0 6px rgba(212,168,67,0.5)',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTime: {
    color: '#8B7355',
    fontSize: 12,
  },
  timelineLevel: {
    color: '#D4A843',
    fontSize: 15,
    fontWeight: 700,
  },
  timelineAttrs: {
    color: '#E8D5B7',
    fontSize: 12,
    marginTop: 2,
  },
  tableWrap: {
    overflowX: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 13,
  },
  th: {
    color: '#D4A843',
    borderBottom: '1px solid #5C4033',
    padding: '8px 6px',
    textAlign: 'left' as const,
    fontWeight: 600,
    fontSize: 12,
  },
  td: {
    color: '#E8D5B7',
    borderBottom: '1px solid rgba(92,64,51,0.4)',
    padding: '6px',
    fontSize: 12,
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('character');
  const [showHistory, setShowHistory] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showImportOverlay, setShowImportOverlay] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const character = useCharacterStore((s) => s.character);

  const handleSave = useCallback(() => {
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 800);
  }, []);

  const handleExport = useCallback(() => {
    const diceState = useDiceStore.getState();
    const judgeState = useJudgeStore.getState();
    const charState = useCharacterStore.getState();
    const data = {
      character: charState.character,
      diceHistory: diceState.history,
      judgeLogs: judgeState.logs,
      exportTime: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `骰魂法典_${character?.name ?? 'export'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [character]);

  const handleImport = useCallback((file: File) => {
    setShowImportOverlay(true);
    setImportProgress(0);
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        setImportProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    reader.onload = () => {
      setImportProgress(80);
      try {
        const data = JSON.parse(reader.result as string);
        if (data.character) {
          useCharacterStore.getState().loadCharacter(data.character);
        }
        if (data.diceHistory) {
          useDiceStore.getState().importRecords(data.diceHistory);
        }
        if (data.judgeLogs) {
          useJudgeStore.getState().importLogs(data.judgeLogs);
        }
        setImportProgress(100);
        setTimeout(() => {
          setShowImportOverlay(false);
          setImportProgress(0);
        }, 800);
      } catch {
        alert('导入失败：JSON格式错误');
        setShowImportOverlay(false);
        setImportProgress(0);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.json')) {
        handleImport(file);
      }
    },
    [handleImport]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'character':
        return <CharacterSheet />;
      case 'judge':
        return <JudgePanel />;
      case 'history':
        return <HistoryPanel />;
    }
  };

  return (
    <div style={globalStyles.appContainer} onDrop={handleDrop} onDragOver={handleDragOver}>
      <style>{globalCSS}</style>
      {showImportOverlay && (
        <div style={globalStyles.importOverlay}>
          <div style={globalStyles.importCard}>
            <div style={globalStyles.importLabel}>正在导入数据...</div>
            <div style={globalStyles.progressTrack}>
              <div style={{ ...globalStyles.progressFill, width: `${importProgress}%` }} />
            </div>
            <div style={globalStyles.importPercent}>{importProgress}%</div>
          </div>
        </div>
      )}
      <nav style={globalStyles.sidebar}>
        <div style={globalStyles.sidebarHeader}>
          <span style={globalStyles.logo}>🎲</span>
          <span style={globalStyles.logoText}>骰魂法典</span>
        </div>
        <div style={globalStyles.navItems}>
          {TAB_ITEMS.map((item) => (
            <button
              key={item.id}
              style={{
                ...globalStyles.navItem,
                ...(activeTab === item.id ? globalStyles.navItemActive : {}),
              }}
              onClick={() => setActiveTab(item.id)}
              className="btn-press"
            >
              <span style={globalStyles.navIcon}>{item.icon}</span>
              <span style={globalStyles.navLabel}>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <main style={globalStyles.mainContent}>
        <div style={globalStyles.topBar}>
          <div style={globalStyles.topBarTitle}>
            {TAB_ITEMS.find((t) => t.id === activeTab)?.label}
          </div>
          <div style={globalStyles.topBarActions}>
            <button style={globalStyles.saveBtn} onClick={handleSave} className="btn-press">
              💾 保存
              {saveFlash && <span style={globalStyles.saveCheck}>✓</span>}
            </button>
            <button style={globalStyles.exportBtn} onClick={handleExport} className="btn-press">
              📤 导出
            </button>
            <button
              style={globalStyles.importBtn}
              onClick={() => fileInputRef.current?.click()}
              className="btn-press"
            >
              📥 导入
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
        <div style={globalStyles.contentArea}>{renderContent()}</div>
      </main>
      <button
        style={{
          ...globalStyles.historyFloatBtn,
          ...(showHistory ? globalStyles.historyFloatBtnActive : {}),
        }}
        onClick={() => setShowHistory(!showHistory)}
        className="btn-press"
      >
        🎲
      </button>
      {showHistory && (
        <div style={globalStyles.historyPanel}>
          <div style={globalStyles.historyPanelHeader}>
            <span style={{ color: '#D4A843', fontWeight: 700 }}>投点历史</span>
            <button
              style={globalStyles.historyCloseBtn}
              onClick={() => setShowHistory(false)}
            >
              ✕
            </button>
          </div>
          <div style={globalStyles.historyTableWrap}>
            <table style={histStyles.table}>
              <thead>
                <tr>
                  <th style={histStyles.th}>时间</th>
                  <th style={histStyles.th}>配置</th>
                  <th style={histStyles.th}>点数</th>
                  <th style={histStyles.th}>判定</th>
                </tr>
              </thead>
              <tbody>
                {useDiceStore.getState().history.slice(0, 20).map((r) => (
                  <tr key={r.id}>
                    <td style={histStyles.td}>
                      {new Date(r.timestamp).toLocaleTimeString('zh-CN')}
                    </td>
                    <td style={histStyles.td}>
                      {r.config.diceCount}D{r.config.sides}
                    </td>
                    <td style={histStyles.td}>{r.result.total}</td>
                    <td style={histStyles.td}>{r.isJudge ? '✔' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <nav style={globalStyles.bottomNav}>
        {TAB_ITEMS.map((item) => (
          <button
            key={item.id}
            style={{
              ...globalStyles.bottomNavItem,
              ...(activeTab === item.id ? globalStyles.bottomNavItemActive : {}),
            }}
            onClick={() => setActiveTab(item.id)}
            className="btn-press"
          >
            <span style={globalStyles.bottomNavIcon}>{item.icon}</span>
            <span style={globalStyles.bottomNavLabel}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const globalCSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #2B1D0E; color: #E8D5B7; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; overflow-x: hidden; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: rgba(20,14,8,0.5); }
  ::-webkit-scrollbar-thumb { background: #5C4033; border-radius: 3px; }
  .btn-press:active { transform: scale(0.95); transition: transform 0.1s; }
  @keyframes diceFly {
    0% { opacity: 0; transform: translateY(-30px) rotate(-180deg); }
    60% { opacity: 1; transform: translateY(5px) rotate(10deg); }
    100% { opacity: 1; transform: translateY(0) rotate(0deg); }
  }
  @keyframes diceAppear {
    0% { opacity: 0; transform: scale(0.3) rotate(-90deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes attrSlotGlow {
    0% { box-shadow: inset 0 2px 4px rgba(0,0,0,0.3), 0 0 0 rgba(212,168,67,0); }
    50% { box-shadow: inset 0 2px 4px rgba(0,0,0,0.3), 0 0 15px rgba(212,168,67,0.5); }
    100% { box-shadow: inset 0 2px 4px rgba(0,0,0,0.3), 0 0 0 rgba(212,168,67,0); }
  }
  @keyframes levelUpSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @media (max-width: 767px) {
    .app-container { flex-direction: column !important; }
    .sidebar { display: none !important; }
    .bottom-nav { display: flex !important; }
    .attr-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .judge-btn { width: 60px !important; height: 60px !important; font-size: 24px !important; }
    .dice-display { width: 60px !important; height: 60px !important; font-size: 28px !important; margin-left: -30px !important; margin-top: -30px !important; }
  }
`;

const globalStyles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: 'flex',
    minHeight: '100vh',
    position: 'relative',
  },
  sidebar: {
    width: 250,
    minWidth: 250,
    background: 'linear-gradient(180deg, #3D2B1A 0%, #2B1D0E 100%)',
    borderRight: '1px solid #5C4033',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 0',
    position: 'sticky' as const,
    top: 0,
    height: '100vh',
    backgroundImage: `repeating-linear-gradient(
      45deg,
      transparent,
      transparent 2px,
      rgba(92,64,51,0.1) 2px,
      rgba(92,64,51,0.1) 4px
    )`,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 20px 24px',
    borderBottom: '1px solid #5C4033',
    marginBottom: 20,
  },
  logo: {
    fontSize: 28,
  },
  logoText: {
    color: '#D4A843',
    fontSize: 20,
    fontWeight: 800,
    textShadow: '0 0 10px rgba(212,168,67,0.4)',
  },
  navItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '0 12px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: '#8B7355',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left' as const,
  },
  navItemActive: {
    background: 'rgba(212,168,67,0.15)',
    color: '#D4A843',
    border: '1px solid rgba(212,168,67,0.4)',
    boxShadow: '0 0 10px rgba(212,168,67,0.2)',
  },
  navIcon: {
    fontSize: 20,
  },
  navLabel: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: 'rgba(43,29,14,0.95)',
    borderBottom: '1px solid #5C4033',
    position: 'sticky' as const,
    top: 0,
    zIndex: 50,
  },
  topBarTitle: {
    color: '#D4A843',
    fontSize: 18,
    fontWeight: 700,
  },
  topBarActions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  saveBtn: {
    padding: '8px 14px',
    borderRadius: 6,
    border: '1px solid #5C4033',
    background: 'rgba(20,14,8,0.6)',
    color: '#D4A843',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    position: 'relative' as const,
    transition: 'all 0.2s',
  },
  saveCheck: {
    position: 'absolute' as const,
    top: -6,
    right: -6,
    background: '#22C55E',
    color: '#fff',
    width: 18,
    height: 18,
    borderRadius: '50%',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
  },
  exportBtn: {
    padding: '8px 14px',
    borderRadius: 6,
    border: '1px solid #5C4033',
    background: 'rgba(20,14,8,0.6)',
    color: '#D4A843',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  importBtn: {
    padding: '8px 14px',
    borderRadius: 6,
    border: '1px solid #5C4033',
    background: 'rgba(20,14,8,0.6)',
    color: '#D4A843',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  contentArea: {
    flex: 1,
    overflow: 'auto',
  },
  historyFloatBtn: {
    position: 'fixed' as const,
    bottom: 24,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: '50%',
    border: '2px solid #D4A843',
    background: 'linear-gradient(135deg, #3D2B1A, #5C4033)',
    color: '#D4A843',
    fontSize: 22,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    zIndex: 100,
    transition: 'all 0.2s',
  },
  historyFloatBtnActive: {
    background: 'linear-gradient(135deg, #5C4033, #D4A843)',
    color: '#2B1D0E',
  },
  historyPanel: {
    position: 'fixed' as const,
    bottom: 84,
    right: 24,
    width: 360,
    maxHeight: 400,
    background: 'rgba(43,29,14,0.97)',
    borderRadius: 10,
    border: '1px solid #5C4033',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    zIndex: 100,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  historyPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #5C4033',
  },
  historyCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#8B7355',
    fontSize: 16,
    cursor: 'pointer',
    padding: 4,
  },
  historyTableWrap: {
    overflow: 'auto',
    padding: 8,
  },
  importOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  importCard: {
    background: 'rgba(43,29,14,0.98)',
    borderRadius: 12,
    border: '1px solid #D4A843',
    padding: 28,
    textAlign: 'center' as const,
    minWidth: 280,
  },
  importLabel: {
    color: '#D4A843',
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 16,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    background: 'rgba(20,14,8,0.8)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #8B6914, #D4A843)',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  importPercent: {
    color: '#8B7355',
    fontSize: 13,
  },
  bottomNav: {
    display: 'none',
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    background: 'rgba(43,29,14,0.98)',
    borderTop: '1px solid #5C4033',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 100,
  },
  bottomNavItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 2,
    padding: '6px 12px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: '#8B7355',
    cursor: 'pointer',
    fontSize: 11,
    transition: 'all 0.2s',
  },
  bottomNavItemActive: {
    color: '#D4A843',
    background: 'rgba(212,168,67,0.1)',
  },
  bottomNavIcon: {
    fontSize: 20,
  },
  bottomNavLabel: {
    fontWeight: 600,
  },
};
