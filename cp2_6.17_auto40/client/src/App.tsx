import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import HorseCustomizer, { HorseConfig, Strategy } from './components/HorseCustomizer';
import RaceTrack, { RaceData } from './components/RaceTrack';
import HUD from './components/HUD';

type ViewMode = 'standard' | 'first-person' | 'minimap';
type GamePhase = 'customizing' | 'waiting' | 'racing' | 'finished';

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('customizing');
  const [raceData, setRaceData] = useState<RaceData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [playerCount, setPlayerCount] = useState(0);
  const [totalSlots] = useState(8);
  const [waitingForPlayers, setWaitingForPlayers] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const playerIdRef = useRef<string>('');

  useEffect(() => {
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('player:id', (id: string) => {
      playerIdRef.current = id;
    });

    socket.on('race:state', (state: RaceData) => {
      setRaceData(state);
      if (state.phase === 'countdown') {
        setPhase('waiting');
      } else if (state.phase === 'racing') {
        setPhase('racing');
      } else if (state.phase === 'finished') {
        setPhase('finished');
      }
    });

    socket.on('player:joined', (data: { count: number; readyCount: number; total: number }) => {
      setPlayerCount(data.count);
    });

    socket.on('race:reset', () => {
      setPhase('customizing');
      setRaceData(null);
      setWaitingForPlayers(false);
      setViewMode('standard');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleReady = useCallback((config: HorseConfig) => {
    if (!socketRef.current) return;
    setWaitingForPlayers(true);
    socketRef.current.emit('player:ready', {
      name: config.name,
      color: config.color,
      stamina: config.stamina,
      speed: config.speed,
      strategy: config.strategy,
    });
  }, []);

  const handleRestart = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('race:restart');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') setViewMode('standard');
      else if (e.key === '2') setViewMode('first-person');
      else if (e.key === '3') setViewMode('minimap');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative' }}>
      {(phase === 'customizing' || phase === 'waiting') && !waitingForPlayers && (
        <HorseCustomizer
          onReady={handleReady}
          waitingForPlayers={false}
          playerCount={playerCount}
          totalSlots={totalSlots}
        />
      )}

      {waitingForPlayers && phase !== 'racing' && phase !== 'finished' && (
        <div className="customizer-overlay">
          <div className="customizer-panel glass-panel" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <h2 className="customizer-title" style={{ marginBottom: 24 }}>准备就绪</h2>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🐴</div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
              等待其他玩家加入...
            </p>
            <p style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 32,
              fontWeight: 700,
              color: '#ffd700',
              marginTop: 16
            }}>
              {playerCount} / {totalSlots}
            </p>
            <div style={{
              marginTop: 20,
              display: 'flex',
              gap: 8,
              justifyContent: 'center'
            }}>
              {Array.from({ length: totalSlots }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: i < playerCount ? '#6c63ff' : 'rgba(255,255,255,0.15)',
                    transition: 'background 0.3s ease',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {(phase === 'racing' || phase === 'finished') && raceData && (
        <div className="race-view">
          <HUD raceData={raceData} />
          {viewMode === 'standard' && (
            <RaceTrack raceData={raceData} viewMode="standard" />
          )}
          {viewMode === 'first-person' && (
            <RaceTrack raceData={raceData} viewMode="first-person" />
          )}
          {viewMode === 'minimap' && (
            <>
              <RaceTrack raceData={raceData} viewMode="standard" />
              <RaceTrack raceData={raceData} viewMode="minimap" />
            </>
          )}
        </div>
      )}

      {phase === 'finished' && raceData && (
        <ResultPanel
          raceData={raceData}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

function ResultPanel({ raceData, onRestart }: { raceData: RaceData; onRestart: () => void }) {
  const ranked = [...raceData.horses]
    .sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.position - a.position;
    });

  const champion = ranked[0];

  return (
    <div className="result-overlay">
      <div className="result-panel">
        <div
          className="result-champion-bar"
          style={{ background: champion?.color || '#ffd700' }}
        />
        <div className="result-content">
          <h2 className="result-title">🏆 比赛结果</h2>

          <div className="champion-horse">
            <div className="champion-horse-icon">
              <ChampionStars color={champion?.color || '#ffd700'} />
              <svg viewBox="0 0 48 48" fill="none">
                <ellipse cx="24" cy="30" rx="14" ry="8" fill={champion?.color || '#ffd700'} />
                <circle cx="34" cy="20" r="7" fill={champion?.color || '#ffd700'} />
                <polygon points="38,15 44,8 40,18" fill={champion?.color || '#ffd700'} />
                <circle cx="35" cy="18" r="2" fill="#fff" />
              </svg>
            </div>
          </div>

          <ul className="result-list">
            {ranked.map((horse, idx) => (
              <li key={horse.id} className="result-item">
                <span className={`result-rank ${idx === 0 ? 'gold' : ''}`}>
                  {idx + 1}
                </span>
                <div
                  className="result-horse-icon"
                  style={{ background: horse.color }}
                />
                <span className="result-name">{horse.name}</span>
                <span className="result-time">
                  {horse.finished
                    ? formatFinishTime(horse.finishTime)
                    : '未完赛'}
                </span>
              </li>
            ))}
          </ul>

          <button className="restart-btn" onClick={onRestart}>
            再赛一局
          </button>
        </div>
      </div>
    </div>
  );
}

function formatFinishTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function ChampionStars({ color }: { color: string }) {
  const starCount = 12;
  const radius = 30;

  return (
    <div className="champion-stars">
      {Array.from({ length: starCount }).map((_, i) => {
        const angle = (i / starCount) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const starColor = i % 2 === 0 ? '#ffd700' : '#ffaa00';

        return (
          <div
            key={i}
            className="champion-star"
            style={{
              left: x - 4,
              top: y - 4,
              background: starColor,
              boxShadow: `0 0 4px ${starColor}`,
            }}
          />
        );
      })}
    </div>
  );
}
