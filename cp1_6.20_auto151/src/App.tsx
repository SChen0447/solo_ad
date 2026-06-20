import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import DeckBuilder from './deckBuilder';
import BattleUI from './battleUI';
import { createInitialGameState, Difficulty } from './gameEngine';
import { getDefaultDeck, ALL_CARDS } from './cardData';

type Page = 'home' | 'deckBuilder' | 'battle';

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  wins: number;
  losses: number;
}

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerDeck, setPlayerDeck] = useState<string[]>(getDefaultDeck());
  const [playerName, setPlayerName] = useState('玩家');
  const [showNameInput, setShowNameInput] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    fetchLeaderboard();
    const saved = localStorage.getItem('playerDeck');
    if (saved) {
      setPlayerDeck(JSON.parse(saved));
    }
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get('/api/leaderboard');
      setLeaderboard(res.data);
    } catch (e) {
      console.log('Failed to fetch leaderboard, using mock data');
    }
  };

  const updateScore = async (won: boolean) => {
    try {
      await axios.post('/api/update-score', { name: playerName, won });
      fetchLeaderboard();
    } catch (e) {
      console.log('Failed to update score');
    }
  };

  const startBattle = (deck?: string[]) => {
    if (deck) {
      setPlayerDeck(deck);
    }
    setPage('battle');
  };

  const handleGameEnd = (winner: 'player' | 'ai') => {
    updateScore(winner === 'player');
    setTimeout(() => {
      setPage('home');
    }, 1000);
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      setPlayerName(tempName.trim());
      localStorage.setItem('playerName', tempName.trim());
    }
    setShowNameInput(false);
  };

  const renderHome = () => (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      overflowY: 'auto'
    }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 style={{
          fontSize: '42px',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #e63946, #f4a261, #a8dadc, #457b9d)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          ⚔️ 策略卡牌对战
        </h1>
        <p style={{ textAlign: 'center', color: '#889', marginBottom: '30px' }}>
          组建你的卡组，挑战AI对手！
        </p>
      </motion.div>

      <div style={{
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <span style={{ color: '#aaa', fontSize: '14px' }}>玩家: </span>
        <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{playerName}</span>
        <button
          onClick={() => { setTempName(playerName); setShowNameInput(true); }}
          style={{
            padding: '2px 8px',
            fontSize: '11px',
            backgroundColor: 'transparent',
            color: '#888',
            border: '1px solid #555',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          改名
        </button>
      </div>

      <AnimatePresence>
        {showNameInput && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100
            }}
            onClick={() => setShowNameInput(false)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: '#2d3748',
                padding: '24px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <h3 style={{ margin: 0 }}>输入你的名字</h3>
              <input
                type="text"
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #4a5568',
                  backgroundColor: '#1a202c',
                  color: 'white',
                  fontSize: '14px'
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowNameInput(false)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: '#555',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveName}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: '#457b9d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  确定
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        width: '100%',
        maxWidth: '500px'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>🎮 选择难度</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: `2px solid ${difficulty === d ? '#457b9d' : '#333'}`,
                backgroundColor: difficulty === d ? 'rgba(69, 123, 157, 0.3)' : 'rgba(0,0,0,0.3)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              {d === 'easy' && '😊 简单'}
              {d === 'normal' && '😐 普通'}
              {d === 'hard' && '😈 困难'}
            </button>
          ))}
        </div>

        <button
          onClick={() => startBattle()}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#e63946',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '10px'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c1121f'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e63946'}
        >
          ⚔️ 快速对战
        </button>

        <button
          onClick={() => setPage('deckBuilder')}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#457b9d',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d3557'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#457b9d'}
        >
          🎴 编辑卡组 ({playerDeck.length}/30)
        </button>
      </div>

      <div style={{
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: '12px',
        padding: '20px',
        width: '100%',
        maxWidth: '600px'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>🏆 排行榜</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(69, 123, 157, 0.3)' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#a8dadc' }}>排名</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#a8dadc' }}>玩家名称</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: '#a8dadc' }}>积分</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: '#a8dadc' }}>胜场</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: '#a8dadc' }}>负场</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => (
                <tr
                  key={entry.rank}
                  style={{
                    backgroundColor: i % 2 === 0 ? '#f8f9fa' : '#ffffff',
                    color: '#333',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#f8f9fa' : '#ffffff'}
                >
                  <td style={{ padding: '8px', fontWeight: entry.rank <= 3 ? 'bold' : 'normal' }}>
                    {entry.rank === 1 && '🥇 '}
                    {entry.rank === 2 && '🥈 '}
                    {entry.rank === 3 && '🥉 '}
                    {entry.rank}
                  </td>
                  <td style={{ padding: '8px' }}>{entry.name}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#f4a261', fontWeight: 'bold' }}>
                    {entry.points}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#2a9d8f' }}>{entry.wins}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#e76f51' }}>{entry.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        maxWidth: '600px',
        fontSize: '12px',
        color: '#889'
      }}>
        <p style={{ margin: '0 0 8px 0', color: '#a8dadc', fontWeight: 'bold' }}>📖 属性克制关系：</p>
        <p style={{ margin: '4px 0' }}>🔥 火 → 🌪️ 风 → 💧 水 → 🔥 火 （循环克制，伤害×1.5）</p>
        <p style={{ margin: '4px 0' }}>✨ 光 ⇄ 🌑 暗 （互相克制，伤害×1.5）</p>
        <p style={{ margin: '8px 0 0 0', color: '#a8dadc', fontWeight: 'bold' }}>🎯 胜利条件：</p>
        <p style={{ margin: '4px 0' }}>将对方生命值降为0，或对方无牌可用时获胜</p>
      </div>
    </div>
  );

  const renderBattle = () => {
    const gameState = createInitialGameState(playerDeck, getDefaultDeck());
    return (
      <BattleUI
        initialGameState={gameState}
        difficulty={difficulty}
        onGameEnd={handleGameEnd}
        onBack={() => setPage('home')}
      />
    );
  };

  const renderDeckBuilder = () => (
    <DeckBuilder
      onBack={() => setPage('home')}
      onStartBattle={(deck) => startBattle(deck)}
    />
  );

  return (
    <>
      {page === 'home' && renderHome()}
      {page === 'deckBuilder' && renderDeckBuilder()}
      {page === 'battle' && renderBattle()}
    </>
  );
};

export default App;
