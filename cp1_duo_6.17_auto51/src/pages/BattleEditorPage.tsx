import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/gameStore';
import GridCanvas from '../components/grid/GridCanvas';
import HeroEditor from '../components/editors/HeroEditor';
import { CLASS_COLORS, CLASS_NAMES } from '../data/heroes';
import { Hero } from '../types';
import './BattleEditorPage.css';

type SortField = 'default' | 'name' | 'maxHp' | 'attack' | 'defense' | 'speed';
type SortOrder = 'asc' | 'desc';

export default function BattleEditorPage() {
  const { state, getFormationStats, startSimulation, selectWave } = useAppStore();
  const navigate = useNavigate();
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [sortField, setSortField] = useState<SortField>('default');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const stats = getFormationStats();

  const sortedHeroes = useMemo(() => {
    if (sortField === 'default') {
      return state.heroes;
    }
    const heroes = [...state.heroes];
    heroes.sort((a, b) => {
      let valA: string | number = a[sortField as keyof Hero] as string | number;
      let valB: string | number = b[sortField as keyof Hero] as string | number;
      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA as string);
      }
      valA = Number(valA);
      valB = Number(valB);
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
    return heroes;
  }, [state.heroes, sortField, sortOrder]);

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleDragStart = (e: React.DragEvent, hero: Hero) => {
    e.dataTransfer.setData('hero', JSON.stringify(hero));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleStartSimulation = async () => {
    if (state.formation.length === 0) {
      alert('请先在网格上放置至少一个英雄！');
      return;
    }
    await startSimulation();
    setShowResult(true);
  };

  const handleWatchReplay = () => {
    setShowResult(false);
    navigate('/replay');
  };

  const handleViewHistory = () => {
    navigate('/history');
  };

  const formatNumber = (n: number) => {
    return n.toLocaleString();
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return '#22c55e';
      case 'normal': return '#eab308';
      case 'hard': return '#ef4444';
      default: return '#888';
    }
  };

  const getDifficultyText = (diff: string) => {
    switch (diff) {
      case 'easy': return '简单';
      case 'normal': return '普通';
      case 'hard': return '困难';
      default: return '未知';
    }
  };

  return (
    <div className="battle-editor">
      <div className="editor-header">
        <h1>战术编队</h1>
        <button className="nav-btn" onClick={handleViewHistory}>
          📜 历史记录
        </button>
      </div>

      <div className="editor-content">
        <div className="hero-pool">
          <div className="pool-header">
            <div className="pool-title">英雄池</div>
            <div className="sort-dropdown">
              <select
                className="sort-select"
                value={sortField}
                onChange={(e) => handleSortChange(e.target.value as SortField)}
              >
                <option value="default">默认排序</option>
                <option value="name">按名称</option>
                <option value="maxHp">按生命值</option>
                <option value="attack">按攻击力</option>
                <option value="defense">按防御力</option>
                <option value="speed">按速度</option>
              </select>
              <button
                className="sort-order-btn"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? '升序' : '降序'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
          <div className="hero-list">
            {sortedHeroes.map((hero) => {
              const isPlaced = state.formation.some((f) => f.heroId === hero.id);
              const classColor = CLASS_COLORS[hero.heroClass];
              return (
                <div
                  key={hero.id}
                  className={`hero-card ${isPlaced ? 'placed' : ''}`}
                  draggable={!isPlaced}
                  onDragStart={(e) => handleDragStart(e, hero)}
                  onClick={() => setSelectedHero(hero)}
                  style={{ '--class-color': classColor } as React.CSSProperties}
                >
                  <div
                    className="hero-card-avatar"
                    style={{ boxShadow: `0 0 12px ${classColor}40`, borderColor: classColor }}
                  >
                    <span>{hero.avatar}</span>
                  </div>
                  <div className="hero-card-info">
                    <div className="hero-card-name" style={{ color: classColor }}>{hero.name}</div>
                    <div className="hero-card-class">{CLASS_NAMES[hero.heroClass]}</div>
                    <div className="hero-card-stats">
                      <span title="生命">❤️ {hero.maxHp}</span>
                      <span title="攻击">⚔️ {hero.attack}</span>
                    </div>
                  </div>
                  {isPlaced && <div className="placed-badge">已上阵</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="divider" />

        <div className="grid-section">
          <GridCanvas />
        </div>

        <div className="divider" />

        <div className="side-panel">
          <div className="panel-section">
            <div className="panel-title">阵型统计</div>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-icon">❤️</div>
                <div className="stat-info">
                  <div className="stat-label">总生命</div>
                  <div className="stat-num">{formatNumber(stats.totalHp)}</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">⚔️</div>
                <div className="stat-info">
                  <div className="stat-label">总攻击</div>
                  <div className="stat-num">{formatNumber(stats.totalAttack)}</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">🛡️</div>
                <div className="stat-info">
                  <div className="stat-label">总防御</div>
                  <div className="stat-num">{formatNumber(stats.totalDefense)}</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">⚡</div>
                <div className="stat-info">
                  <div className="stat-label">平均速度</div>
                  <div className="stat-num">{stats.avgSpeed}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-title">敌方波次</div>
            <div className="wave-list">
              {state.waves.map((wave) => (
                <div
                  key={wave.id}
                  className={`wave-item ${state.selectedWaveId === wave.id ? 'selected' : ''}`}
                  onClick={() => selectWave(wave.id)}
                >
                  <div className="wave-name">{wave.name}</div>
                  <div
                    className="wave-diff"
                    style={{ color: getDifficultyColor(wave.difficulty) }}
                  >
                    {getDifficultyText(wave.difficulty)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            className={`start-btn ${state.isSimulating ? 'loading' : ''}`}
            onClick={handleStartSimulation}
            disabled={state.isSimulating || state.formation.length === 0}
          >
            {state.isSimulating ? (
              <>
                <span className="spin">⚙️</span>
                推演中...
              </>
            ) : (
              <>🎮 开始推演</>
            )}
          </button>

          <div className="hint-text">
            拖拽左侧英雄到网格中布阵
          </div>
        </div>
      </div>

      {selectedHero && (
        <div className="editor-modal-overlay" onClick={() => setSelectedHero(null)}>
          <div className="editor-modal" onClick={(e) => e.stopPropagation()}>
            <HeroEditor hero={selectedHero} onClose={() => setSelectedHero(null)} />
          </div>
        </div>
      )}

      {showResult && state.currentBattle && (
        <div className="result-overlay">
          <div className="result-panel">
            <div className="result-header">
              <h2>战斗结果</h2>
              <button className="close-btn" onClick={() => setShowResult(false)}>×</button>
            </div>

            <div className={`result-victory ${state.currentBattle.victory}`}>
              {state.currentBattle.victory === 'win' ? '🎉 胜利！' :
                state.currentBattle.victory === 'lose' ? '💀 失败...' : '🤝 平局'}
            </div>

            <div className="result-summary">
              <div className="summary-item">
                <div className="summary-num">{state.currentBattle.totalTurns}</div>
                <div className="summary-label">总回合数</div>
              </div>
              <div className="summary-item">
                <div className="summary-num">{Math.round(state.currentBattle.duration)}ms</div>
                <div className="summary-label">推演耗时</div>
              </div>
              <div className="summary-item">
                <div className="summary-num">{state.currentBattle.frames.length}</div>
                <div className="summary-label">战斗帧</div>
              </div>
            </div>

            <div className="result-table-wrap">
              <table className="result-table">
                <thead>
                  <tr>
                    <th>英雄</th>
                    <th>击杀</th>
                    <th>输出</th>
                    <th>承受伤害</th>
                  </tr>
                </thead>
                <tbody>
                  {state.currentBattle.heroStats.map((stat) => (
                    <tr key={stat.heroId}>
                      <td className="hero-name-cell">{stat.heroName}</td>
                      <td>{stat.kills}</td>
                      <td>{stat.damageDealt}</td>
                      <td>{stat.damageTaken}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="result-actions">
              <button className="secondary-btn" onClick={() => setShowResult(false)}>
                返回编队
              </button>
              <button className="primary-btn" onClick={handleWatchReplay}>
                🎬 观看回放
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
