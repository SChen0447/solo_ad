import React, { useState, useEffect, useRef, useCallback } from 'react';
import PoetryCard from './PoetryCard';
import { battleAPI, type BattleResult, type HistoryItem, type PoemInfo } from '../utils/api';

const SESSION_KEY = 'poetry_battle_session';
const BEST_SCORE_KEY = 'poetry_battle_best_score';

const BattleArena: React.FC = () => {
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [difficulty, setDifficulty] = useState('medium');
  const [difficultyName, setDifficultyName] = useState('秀才');
  const [difficultyTransition, setDifficultyTransition] = useState(false);

  const [currentUserLine, setCurrentUserLine] = useState('');
  const [currentAiLine, setCurrentAiLine] = useState('');
  const [currentPoem, setCurrentPoem] = useState<PoemInfo | null>(null);
  const [lastResultSuccess, setLastResultSuccess] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const [comboPulse, setComboPulse] = useState(false);
  const [showEarnedPoints, setShowEarnedPoints] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const [isStarted, setIsStarted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    const savedBest = localStorage.getItem(BEST_SCORE_KEY);
    if (savedBest) {
      setBestScore(parseInt(savedBest, 10) || 0);
    }
    if (savedSession) {
      setSessionId(savedSession);
      loadScore(savedSession);
      loadHistory(savedSession);
    }
  }, []);

  const loadScore = async (sid: string) => {
    try {
      const data = await battleAPI.getScore(sid);
      setScore(data.score);
      setCombo(data.combo);
      setMaxCombo(data.max_combo);
      setDifficulty(data.difficulty);
      setDifficultyName(data.difficulty_name);
      if (data.best_score > bestScore) {
        setBestScore(data.best_score);
        localStorage.setItem(BEST_SCORE_KEY, String(data.best_score));
      }
    } catch (e) {
      console.error('加载分数失败', e);
    }
  };

  const loadHistory = async (sid: string) => {
    try {
      const data = await battleAPI.getHistory(sid, 1, 50);
      setHistory(data.history);
    } catch (e) {
      console.error('加载历史失败', e);
    }
  };

  const triggerComboPulse = useCallback(() => {
    setComboPulse(true);
    setTimeout(() => setComboPulse(false), 150);
  }, []);

  const triggerDifficultyTransition = useCallback((newDiff: string, newName: string) => {
    if (newDiff !== difficulty) {
      setDifficultyTransition(true);
      setTimeout(() => {
        setDifficulty(newDiff);
        setDifficultyName(newName);
        setTimeout(() => setDifficultyTransition(false), 500);
      }, 250);
    }
  }, [difficulty]);

  const handleSubmit = async () => {
    if (!userInput.trim() || isLoading) return;

    setIsLoading(true);
    setMessage('');

    try {
      const result: BattleResult = await battleAPI.submitLine(userInput, sessionId || undefined);

      if (!sessionId && result.session_id) {
        setSessionId(result.session_id);
        localStorage.setItem(SESSION_KEY, result.session_id);
      }

      setCurrentUserLine(userInput);

      if (result.success) {
        setCurrentAiLine(result.next_line || '');
        setCurrentPoem(result.poem || null);
        setLastResultSuccess(true);
        setMessage(result.message);

        const newCombo = result.combo;
        const prevCombo = combo;
        setCombo(newCombo);
        setScore(result.score);
        setMaxCombo(result.max_combo);

        if (newCombo > prevCombo && newCombo >= 2) {
          triggerComboPulse();
        }

        if (result.earned_points) {
          setEarnedPoints(result.earned_points);
          setShowEarnedPoints(true);
          setTimeout(() => setShowEarnedPoints(false), 1000);
        }

        if (result.best_score > bestScore) {
          setBestScore(result.best_score);
          localStorage.setItem(BEST_SCORE_KEY, String(result.best_score));
        }

        triggerDifficultyTransition(result.difficulty, result.difficulty_name);

        setHistory(prev => {
          const newItem: HistoryItem = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            user_line: userInput,
            ai_line: result.next_line || '',
            success: true,
            score: result.earned_points || 0,
            combo: newCombo,
            poem: result.poem,
          };
          return [newItem, ...prev].slice(0, 50);
        });

      } else {
        setCurrentAiLine('');
        setCurrentPoem(null);
        setLastResultSuccess(false);
        setMessage(result.message);
        setCombo(0);

        triggerDifficultyTransition(result.difficulty, result.difficulty_name);

        setHistory(prev => {
          const newItem: HistoryItem = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            user_line: userInput,
            ai_line: null,
            success: false,
            score: 0,
            combo: 0,
          };
          return [newItem, ...prev].slice(0, 50);
        });
      }

      setUserInput('');

    } catch (error: any) {
      setMessage('连接失败，请稍后重试');
      setLastResultSuccess(false);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleReset = async () => {
    if (!window.confirm('确定要重新开始吗？当前得分和历史记录将被清空。')) {
      return;
    }
    try {
      const data = await battleAPI.resetScore(sessionId || undefined);
      setScore(0);
      setCombo(0);
      setMaxCombo(0);
      setCurrentUserLine('');
      setCurrentAiLine('');
      setCurrentPoem(null);
      setLastResultSuccess(null);
      setMessage('');
      setHistory([]);
      setDifficulty(data.difficulty);
      setDifficultyName(data.difficulty_name);
      if (data.session_id) {
        setSessionId(data.session_id);
        localStorage.setItem(SESSION_KEY, data.session_id);
      }
    } catch (e) {
      console.error('重置失败', e);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const getComboColor = (c: number) => {
    if (c >= 5) return 'linear-gradient(135deg, #ff6b35, #ff3d00, #ff8f00)';
    if (c >= 4) return 'linear-gradient(135deg, #ff9800, #ff5722, #ffeb3b)';
    if (c >= 3) return 'linear-gradient(135deg, #ffc107, #ff9800, #ffeb3b)';
    if (c >= 2) return 'linear-gradient(135deg, #ffeb3b, #ffc107)';
    return '#8da3b9';
  };

  const getDifficultyColor = (diff: string) => {
    if (diff === 'hard') return '#c23b22';
    if (diff === 'easy') return '#4a7c4a';
    return '#8b4513';
  };

  if (!isStarted) {
    return (
      <div style={styles.welcomeContainer}>
        <div style={styles.welcomeCard}>
          <h1 style={styles.title}>诗韵对决</h1>
          <p style={styles.subtitle}>古诗词接龙挑战</p>
          <p style={styles.welcomeDesc}>
            与AI对弈古诗词接龙，体验中华文化之美
          </p>
          <div style={styles.welcomeRules}>
            <p>📜 输入上句，AI接下句</p>
            <p>🔥 连续成功，分数倍率递增</p>
            <p>📚 点击诗句，查看文化解析</p>
            <p>🏆 挑战最高分，成为诗仙</p>
          </div>
          <button
            onClick={() => {
              setIsStarted(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            style={styles.startButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#9b2e1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#c23b22';
            }}
          >
            开始挑战
          </button>
          {bestScore > 0 && (
            <p style={styles.welcomeBest}>
              历史最佳：<span style={{ color: '#c23b22', fontWeight: 'bold' }}>{bestScore}</span> 分
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>诗韵对决</h1>
        <div style={styles.divider} />

        <div style={styles.scoreBar}>
          <div style={styles.scoreItem}>
            <span style={styles.scoreLabel}>总分</span>
            <span style={styles.scoreValue}>{score}</span>
          </div>

          <div
            className={comboPulse ? 'combo-pulse' : ''}
            style={styles.comboContainer}
          >
            {combo >= 2 && (
              <div
                style={{
                  ...styles.comboFlame,
                  background: getComboColor(combo),
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                🔥
              </div>
            )}
            <span style={styles.comboText}>
              {combo >= 2 ? `${combo} 连击` : '连击'}
            </span>
          </div>

          <div style={styles.scoreItem}>
            <span style={styles.scoreLabel}>最高连击</span>
            <span style={styles.scoreValue}>{maxCombo}</span>
          </div>
        </div>

        <div style={styles.bestAndDifficulty}>
          <span style={styles.bestScoreText}>
            历史最佳：<strong style={{ color: '#c23b22' }}>{bestScore}</strong> 分
          </span>
          <div
            className={difficultyTransition ? 'difficulty-transition' : ''}
            style={{
              ...styles.difficultyBadge,
              backgroundColor: getDifficultyColor(difficulty),
            }}
          >
            <span style={styles.difficultyIcon}>🎭</span>
            <span style={styles.difficultyText}>{difficultyName}</span>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.battleArea}>
          <div style={styles.playerSide}>
            <div style={styles.sideHeader}>
              <div style={styles.playerAvatar}>👤</div>
              <span style={styles.sideTitle}>你</span>
            </div>

            {currentUserLine ? (
              <PoetryCard
                line={currentUserLine}
                poem={null}
                variant="player"
                isSuccess={lastResultSuccess !== false}
                showExpandButton={false}
              />
            ) : (
              <div style={styles.emptyCard}>
                <p style={styles.emptyText}>等待输入诗句...</p>
              </div>
            )}
          </div>

          <div style={styles.vsDivider}>
            <span style={styles.vsText}>VS</span>
          </div>

          <div style={styles.aiSide}>
            <div style={styles.sideHeader}>
              <div
                style={{
                  ...styles.aiAvatar,
                  transform: isLoading ? 'rotate(-5deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }}
              >
                🕊️
              </div>
              <span style={styles.sideTitle}>诗仙AI</span>
            </div>

            {isLoading ? (
              <div style={styles.thinkingCard}>
                <p style={styles.thinkingText}>正在思考中...</p>
                <div style={styles.thinkingDots}>
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            ) : currentAiLine ? (
              <PoetryCard
                line={currentAiLine}
                poem={currentPoem}
                variant="ai"
                isSuccess={true}
                showExpandButton={true}
              />
            ) : (
              <div style={styles.emptyCard}>
                <p style={styles.emptyText}>等待你的诗句...</p>
              </div>
            )}
          </div>
        </div>

        {showEarnedPoints && (
          <div
            style={{
              ...styles.earnedPointsPopup,
              opacity: showEarnedPoints ? 1 : 0,
              transform: showEarnedPoints ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.3s ease',
            }}
          >
            +{earnedPoints} 分
          </div>
        )}

        {message && (
          <p
            style={{
              ...styles.message,
              color: lastResultSuccess ? '#4a7c4a' : '#c23b22',
            }}
          >
            {message}
          </p>
        )}

        <div style={styles.inputArea}>
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="请输入一句古诗词（五言或七言）"
            style={{
              ...styles.input,
              borderColor: userInput ? '#c23b22' : '#2c2c2c',
              transition: 'border-color 0.3s ease',
            }}
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !userInput.trim()}
            style={{
              ...styles.submitButton,
              opacity: isLoading || !userInput.trim() ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#9b2e1a';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#c23b22';
              }
            }}
          >
            {isLoading ? '...' : '出句'}
          </button>
        </div>

        <div style={styles.actionRow}>
          <button
            onClick={handleReset}
            style={styles.resetButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e8dcc8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            🔄 重新开始
          </button>
        </div>
      </main>

      <div style={styles.historySection}>
        <button
          onClick={() => setHistoryExpanded(!historyExpanded)}
          style={styles.historyToggle}
        >
          <span>{historyExpanded ? '▼' : '▶'}</span>
          <span style={{ marginLeft: '8px' }}>
            历史记录（{history.length}）
          </span>
        </button>

        <div
          className={historyExpanded ? 'history-panel-expand' : 'history-panel-collapse'}
        >
          <div style={styles.historyContainer}>
            {history.length === 0 ? (
              <p style={styles.emptyHistory}>暂无记录，开始你的第一局吧！</p>
            ) : (
              history.map((item, index) => (
                <div key={item.id || index} style={styles.historyItem}>
                  <span style={styles.historyTime}>
                    {formatTime(item.timestamp)}
                  </span>
                  <div style={styles.historyContent}>
                    <p style={styles.historyLine}>
                      <span style={styles.historyUserLabel}>你：</span>
                      {item.user_line}
                    </p>
                    {item.ai_line && (
                      <p style={styles.historyLine}>
                        <span style={styles.historyAiLabel}>AI：</span>
                        {item.ai_line}
                      </p>
                    )}
                    {!item.success && (
                      <p style={styles.historyFail}>接续失败</p>
                    )}
                  </div>
                  <div style={styles.historyScore}>
                    {item.success ? (
                      <span style={styles.scorePositive}>+{item.score}</span>
                    ) : (
                      <span style={styles.scoreZero}>0</span>
                    )}
                    {item.combo >= 2 && (
                      <span style={styles.comboMini}>🔥{item.combo}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <footer style={styles.footer}>
        <p>古诗词接龙 · 传承中华文化</p>
      </footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  welcomeContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  welcomeCard: {
    maxWidth: '480px',
    width: '100%',
    padding: '48px 32px',
    backgroundColor: 'rgba(255, 252, 240, 0.95)',
    borderRadius: '12px',
    boxShadow: '4px 4px 20px rgba(0, 0, 0, 0.08)',
    textAlign: 'center',
    border: '2px solid #d4c4a0',
  },
  title: {
    fontFamily: "'Ma Shan Zheng', cursive",
    fontSize: '52px',
    color: '#2c2c2c',
    margin: 0,
    letterSpacing: '8px',
  },
  subtitle: {
    fontFamily: "'Ma Shan Zheng', cursive",
    fontSize: '24px',
    color: '#8b4513',
    margin: '8px 0 24px 0',
    letterSpacing: '4px',
  },
  welcomeDesc: {
    fontSize: '16px',
    color: '#5a4a3a',
    marginBottom: '24px',
    lineHeight: 1.8,
  },
  welcomeRules: {
    textAlign: 'left',
    padding: '16px 20px',
    backgroundColor: '#faf3e0',
    borderRadius: '8px',
    marginBottom: '28px',
  },
  welcomeRules_p: {
    margin: '8px 0',
    fontSize: '14px',
    color: '#5a4a3a',
  },
  startButton: {
    padding: '14px 48px',
    fontSize: '20px',
    fontFamily: "'Ma Shan Zheng', cursive",
    color: 'white',
    backgroundColor: '#c23b22',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    letterSpacing: '4px',
    boxShadow: '2px 2px 8px rgba(194, 59, 34, 0.3)',
    transition: 'all 0.2s ease',
  },
  welcomeBest: {
    marginTop: '20px',
    fontSize: '14px',
    color: '#8b4513',
  },
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '900px',
    margin: '0 auto',
    padding: '16px',
  },
  header: {
    textAlign: 'center',
    padding: '12px 0 8px 0',
  },
  headerTitle: {
    fontFamily: "'Ma Shan Zheng', cursive",
    fontSize: '40px',
    color: '#2c2c2c',
    margin: 0,
    letterSpacing: '6px',
  },
  divider: {
    width: '80%',
    height: '1px',
    backgroundColor: 'rgba(139, 69, 19, 0.3)',
    margin: '10px auto 14px auto',
  },
  scoreBar: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '32px',
    marginBottom: '10px',
  },
  scoreItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: '12px',
    color: '#8b4513',
    marginBottom: '2px',
  },
  scoreValue: {
    fontFamily: "'Ma Shan Zheng', cursive",
    fontSize: '28px',
    color: '#2c2c2c',
    fontWeight: 'bold',
  },
  comboContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '70px',
  },
  comboFlame: {
    fontSize: '32px',
    lineHeight: 1,
  },
  comboText: {
    fontSize: '13px',
    color: '#8b4513',
    marginTop: '2px',
    fontWeight: 'bold',
  },
  bestAndDifficulty: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 16px',
    marginBottom: '8px',
  },
  bestScoreText: {
    fontSize: '13px',
    color: '#8b4513',
    margin: 0,
  },
  difficultyBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  difficultyIcon: {
    fontSize: '16px',
  },
  difficultyText: {
    fontFamily: "'Ma Shan Zheng', cursive",
    letterSpacing: '2px',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
  },
  battleArea: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: '16px',
    width: '100%',
    margin: '16px 0',
    flexWrap: 'wrap',
  },
  playerSide: {
    flex: 1,
    minWidth: '240px',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  aiSide: {
    flex: 1,
    minWidth: '240px',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  sideHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  playerAvatar: {
    fontSize: '28px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7ed',
    borderRadius: '50%',
    border: '2px solid #a8c9a0',
  },
  aiAvatar: {
    fontSize: '28px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbecec',
    borderRadius: '50%',
    border: '2px solid #d89b9b',
  },
  sideTitle: {
    fontFamily: "'Ma Shan Zheng', cursive",
    fontSize: '20px',
    color: '#2c2c2c',
    margin: 0,
  },
  vsDivider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
  },
  vsText: {
    fontFamily: "'Ma Shan Zheng', cursive",
    fontSize: '28px',
    color: '#c23b22',
    fontWeight: 'bold',
  },
  emptyCard: {
    width: '100%',
    maxWidth: '420px',
    height: '100px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 252, 240, 0.6)',
    border: '2px dashed #d4c4a0',
    borderRadius: '8px',
  },
  emptyText: {
    color: '#a09080',
    fontSize: '14px',
    margin: 0,
  },
  thinkingCard: {
    width: '100%',
    maxWidth: '420px',
    padding: '28px 24px',
    backgroundColor: '#faf3e0',
    border: '2px solid #d4c4a0',
    borderRadius: '8px',
    boxShadow: '2px 2px 8px rgba(0, 0, 0, 0.06)',
    textAlign: 'center',
  },
  thinkingText: {
    color: '#8b4513',
    fontSize: '16px',
    margin: '0 0 8px 0',
  },
  thinkingDots: {
    fontSize: '24px',
    color: '#c23b22',
    letterSpacing: '4px',
  },
  earnedPointsPopup: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: 'translateX(-50%)',
    fontFamily: "'Ma Shan Zheng', cursive",
    fontSize: '36px',
    color: '#c23b22',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)',
    pointerEvents: 'none',
    zIndex: 10,
  },
  message: {
    fontSize: '15px',
    marginTop: '12px',
    marginBottom: '8px',
    fontWeight: 'bold',
    textAlign: 'center',
    minHeight: '22px',
  },
  inputArea: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    maxWidth: '500px',
    marginTop: '12px',
  },
  input: {
    flex: 1,
    padding: '14px 18px',
    fontSize: '16px',
    backgroundColor: '#fffcf0',
    border: '2px solid #2c2c2c',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: "'Ma Shan Zheng', cursive",
    letterSpacing: '2px',
    boxShadow: '2px 2px 8px rgba(0, 0, 0, 0.04)',
  },
  submitButton: {
    padding: '0 28px',
    fontSize: '18px',
    fontFamily: "'Ma Shan Zheng', cursive",
    color: 'white',
    backgroundColor: '#c23b22',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    letterSpacing: '3px',
    transition: 'all 0.2s ease',
    boxShadow: '2px 2px 8px rgba(194, 59, 34, 0.3)',
  },
  actionRow: {
    marginTop: '12px',
    display: 'flex',
    gap: '12px',
  },
  resetButton: {
    padding: '8px 20px',
    fontSize: '14px',
    color: '#8b4513',
    backgroundColor: 'transparent',
    border: '1px solid #d4c4a0',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  historySection: {
    marginTop: '20px',
    width: '100%',
  },
  historyToggle: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: 'rgba(255, 252, 240, 0.8)',
    border: '1px solid #d4c4a0',
    borderRadius: '8px',
    color: '#8b4513',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.2s ease',
  },
  historyContainer: {
    marginTop: '8px',
    backgroundColor: 'rgba(255, 252, 240, 0.6)',
    borderRadius: '8px',
    border: '1px solid #d4c4a0',
    padding: '10px',
    maxHeight: '800px',
    overflowY: 'auto',
  },
  emptyHistory: {
    textAlign: 'center',
    color: '#a09080',
    fontSize: '13px',
    padding: '20px',
    margin: 0,
  },
  historyItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '10px 12px',
    backgroundColor: '#fffcf0',
    borderRadius: '8px',
    marginBottom: '8px',
    boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.04)',
  },
  historyTime: {
    fontSize: '11px',
    color: '#a09080',
    flexShrink: 0,
    paddingTop: '2px',
  },
  historyContent: {
    flex: 1,
  },
  historyLine: {
    margin: '0 0 4px 0',
    fontSize: '14px',
    color: '#2c2c2c',
    lineHeight: 1.5,
  },
  historyUserLabel: {
    color: '#4a7c4a',
    fontWeight: 'bold',
    fontSize: '12px',
  },
  historyAiLabel: {
    color: '#c23b22',
    fontWeight: 'bold',
    fontSize: '12px',
  },
  historyFail: {
    margin: 0,
    fontSize: '12px',
    color: '#c23b22',
  },
  historyScore: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  scorePositive: {
    color: '#4a7c4a',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  scoreZero: {
    color: '#a09080',
    fontSize: '14px',
  },
  comboMini: {
    fontSize: '11px',
    marginTop: '2px',
  },
  footer: {
    textAlign: 'center',
    padding: '16px 0',
    color: '#a09080',
    fontSize: '12px',
  },
};

export default BattleArena;
