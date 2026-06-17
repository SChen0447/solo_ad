import React, { useMemo } from 'react';
import { HorseRaceState, RaceData } from './RaceTrack';

interface Props {
  raceData: RaceData | null;
}

function getRankColor(rank: number): string {
  if (rank === 1) return '#ffd700';
  if (rank === 2) return '#c0c0c0';
  if (rank === 3) return '#cd7f32';
  const t = (rank - 3) / 5;
  const r = Math.round(200 - t * 80);
  const g = Math.round(200 - t * 80);
  const b = Math.round(200 - t * 80);
  return `rgb(${r},${g},${b})`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export default function HUD({ raceData }: Props) {
  const ranked = useMemo(() => {
    if (!raceData) return [];
    return [...raceData.horses]
      .sort((a, b) => b.position - a.position)
      .map((h, i) => ({ ...h, rank: i + 1 }));
  }, [raceData]);

  const playerHorse = useMemo(() => {
    if (!raceData) return null;
    return raceData.horses.find(h => !h.isAI) || null;
  }, [raceData]);

  if (!raceData || raceData.phase === 'waiting') return null;

  const remaining = Math.max(0, raceData.trackLength - (playerHorse?.position ?? 0));

  return (
    <div className="hud-container">
      <div className="ranking-bar">
        {ranked.map((horse, idx) => (
          <div
            key={horse.id}
            className="ranking-item"
            style={{
              background: getRankColor(horse.rank) + '25',
              borderColor: getRankColor(horse.rank) + '40',
              order: horse.rank,
              animation: 'fadeIn 0.3s ease-out',
            }}
          >
            <span
              className="rank-num"
              style={{ color: getRankColor(horse.rank) }}
            >
              #{horse.rank}
            </span>
            <span className="rank-name" style={{ color: horse.color }}>
              {horse.name}
            </span>
          </div>
        ))}
      </div>

      <div className="hud-info-bar glass-panel">
        <div className="hud-info-item">
          <span className="label">时间</span>
          <span className="value">{formatTime(raceData.elapsedTime)}</span>
        </div>
        {playerHorse && (
          <>
            <div className="hud-info-item">
              <span className="label">速度</span>
              <span className="value">
                {(playerHorse.currentSpeed * 3.6).toFixed(1)} km/h
              </span>
            </div>
            <div className="hud-info-item">
              <span className="label">体力</span>
              <span
                className="value"
                style={{
                  color:
                    playerHorse.currentStamina / playerHorse.maxStamina > 0.3
                      ? '#4caf50'
                      : '#e94560',
                }}
              >
                {((playerHorse.currentStamina / playerHorse.maxStamina) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="hud-info-item">
              <span className="label">剩余</span>
              <span className="value">{remaining.toFixed(0)}m</span>
            </div>
            <div className="hud-info-item">
              <span className="label">排名</span>
              <span className="value">
                #{ranked.find(h => h.id === playerHorse.id)?.rank ?? '-'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
