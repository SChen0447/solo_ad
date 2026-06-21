import React, { useState, useCallback } from 'react';
import { SelectPanel } from './components/SelectPanel';
import { BattleArena } from './components/BattleArena';
import { Pokemon, Skill } from './data/pokemonData';

type GamePhase = 'select' | 'battle' | 'result';

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>('select');

  const [playerPokemon, setPlayerPokemon] = useState<Pokemon | null>(null);
  const [playerSkill, setPlayerSkill] = useState<Skill | null>(null);
  const [aiPokemon, setAiPokemon] = useState<Pokemon | null>(null);
  const [aiSkill, setAiSkill] = useState<Skill | null>(null);

  const [battleResult, setBattleResult] = useState<'player' | 'ai' | null>(null);

  const handlePlayerSelection = useCallback((pokemon: Pokemon, skill: Skill) => {
    setPlayerPokemon(pokemon);
    setPlayerSkill(skill);
  }, []);

  const handleAiSelection = useCallback((pokemon: Pokemon, skill: Skill) => {
    setAiPokemon(pokemon);
    setAiSkill(skill);
  }, []);

  const canStartBattle = !!(playerPokemon && playerSkill && aiPokemon && aiSkill);

  const handleStartBattle = () => {
    if (!canStartBattle) return;
    setBattleResult(null);
    setPhase('battle');
  };

  const handleBattleEnd = useCallback((winner: 'player' | 'ai') => {
    setBattleResult(winner);
    setPhase('result');
  }, []);

  const handleBackToSelect = () => {
    setPhase('select');
    setBattleResult(null);
  };

  const handleRestart = () => {
    setPlayerPokemon(null);
    setPlayerSkill(null);
    setAiPokemon(null);
    setAiSkill(null);
    setBattleResult(null);
    setPhase('select');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1a1a2e',
        padding: '24px 16px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header
          style={{
            textAlign: 'center',
            marginBottom: '32px',
          }}
        >
          <h1
            style={{
              margin: 0,
              color: '#fff',
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 40px rgba(255,255,255,0.1)',
            }}
          >
            ⚔️ 宠物小精灵对战策略模拟器 ⚔️
          </h1>
          <p style={{ color: '#888', marginTop: '8px', fontSize: '14px' }}>
            选择你的精灵与技能，与AI展开回合制对战，理解属性克制与技能搭配！
          </p>
        </header>

        {phase === 'select' && (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '24px',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'flex-start',
              }}
            >
              <SelectPanel
                isPlayer={true}
                onSelection={handlePlayerSelection}
                selectedPokemon={playerPokemon}
                selectedSkill={playerSkill}
              />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'stretch',
                  minWidth: '60px',
                  color: '#666',
                  fontSize: '48px',
                  fontWeight: 'bold',
                }}
              >
                <span style={{ animation: 'vsPulse 2s ease-in-out infinite' }}>VS</span>
              </div>

              <SelectPanel
                isPlayer={false}
                onSelection={handleAiSelection}
                selectedPokemon={aiPokemon}
                selectedSkill={aiSkill}
              />
            </div>

            <div
              style={{
                marginTop: '32px',
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              <button
                onClick={handleStartBattle}
                disabled={!canStartBattle}
                style={{
                  padding: '16px 48px',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#fff',
                  background: canStartBattle
                    ? 'linear-gradient(135deg, #ff6b35, #e53935)'
                    : '#444',
                  border: 'none',
                  borderRadius: '14px',
                  cursor: canStartBattle ? 'pointer' : 'not-allowed',
                  boxShadow: canStartBattle
                    ? '0 4px 20px rgba(255, 107, 53, 0.4)'
                    : 'none',
                  transition: 'all 0.3s',
                  opacity: canStartBattle ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (canStartBattle) {
                    e.currentTarget.style.boxShadow =
                      '0 6px 32px rgba(100, 200, 255, 0.5), 0 4px 20px rgba(255, 107, 53, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (canStartBattle) {
                    e.currentTarget.style.boxShadow =
                      '0 4px 20px rgba(255, 107, 53, 0.4)';
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  }
                }}
              >
                🚀 开始对战
              </button>
            </div>

            {!canStartBattle && (
              <p
                style={{
                  textAlign: 'center',
                  color: '#888',
                  marginTop: '12px',
                  fontSize: '13px',
                }}
              >
                请先从左侧面板选择精灵和技能
              </p>
            )}

            <div
              style={{
                marginTop: '40px',
                background: '#16213e',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '800px',
                margin: '40px auto 0',
              }}
            >
              <h3 style={{ color: '#fff', margin: '0 0 16px 0', fontSize: '18px' }}>
                📖 属性克制关系
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '12px',
                  fontSize: '14px',
                }}
              >
                {[
                  { from: '🔥 火', to: '🌿 草', effect: '克制' },
                  { from: '💧 水', to: '🔥 火 / 🪨 岩', effect: '克制' },
                  { from: '🌿 草', to: '💧 水 / 🪨 岩', effect: '克制' },
                  { from: '⚡ 电', to: '💧 水', effect: '克制' },
                  { from: '🪨 岩', to: '🔥 火 / ⚡ 电', effect: '克制' },
                  { from: '👻 幽灵', to: '👻 幽灵', effect: '克制' },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#0f3460',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ color: '#fff' }}>{item.from}</span>
                    <span style={{ color: '#ffd43b' }}>→</span>
                    <span style={{ color: '#fff' }}>{item.to}</span>
                    <span style={{ color: '#51cf66', marginLeft: 'auto', fontSize: '12px' }}>
                      x1.5
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {(phase === 'battle' || phase === 'result') && playerPokemon && playerSkill && aiPokemon && aiSkill && (
          <>
            <BattleArena
              playerPokemon={playerPokemon}
              playerSkill={playerSkill}
              aiPokemon={aiPokemon}
              aiSkill={aiSkill}
              onBattleEnd={handleBattleEnd}
            />

            {phase === 'result' && (
              <div
                style={{
                  marginTop: '24px',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={handleBackToSelect}
                  style={{
                    padding: '14px 32px',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#fff',
                    background: 'linear-gradient(135deg, #4d96ff, #1976d2)',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      '0 6px 28px rgba(100, 200, 255, 0.5)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  🔄 更换阵容
                </button>
                <button
                  onClick={handleRestart}
                  style={{
                    padding: '14px 32px',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#fff',
                    background: 'linear-gradient(135deg, #ff6b35, #e53935)',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      '0 6px 28px rgba(100, 200, 255, 0.5)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  🆕 重新开始
                </button>
              </div>
            )}

            {phase === 'battle' && (
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <button
                  onClick={handleBackToSelect}
                  style={{
                    padding: '10px 24px',
                    fontSize: '14px',
                    color: '#aaa',
                    background: 'transparent',
                    border: '1px solid #444',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#666';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#444';
                    e.currentTarget.style.color = '#aaa';
                  }}
                >
                  ← 返回选择
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes vsPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @media (max-width: 768px) {
          header {
            margin-bottom: 20px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
