import React, { useMemo, useRef, useState, useEffect } from 'react';
import { HorseRaceState, RaceData } from './RaceTrack';

interface Props {
  raceData: RaceData | null;
}

interface RankedHorse extends HorseRaceState {
  rank: number;
  prevRank: number;
  direction: 'up' | 'down' | 'none';
}

function getRankColor(rank: number): string {
  if (rank === 1) return '#ffd700';
  if (rank === 2) return '#c0c0c0';
  if (rank === 3) return '#cd7f32';
  const t = (rank - 3) / 5;
  const r = Math.round(180 - t * 60);
  const g = Math.round(180 - t * 60);
  const b = Math.round(200 - t * 80);
  return `rgb(${r},${g},${b})`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

const ITEM_WIDTH = 120;
const ITEM_GAP = 4;

export default function HUD({ raceData }: Props) {
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const [rankingState, setRankingState] = useState<RankedHorse[]>([]);

  useEffect(() => {
    if (!raceData) return;

    const sorted = [...raceData.horses].sort((a, b) => b.position - a.position);

    const newRanked: RankedHorse[] = sorted.map((h, idx) => {
      const rank = idx + 1;
      const prevRank = prevRanksRef.current.get(h.id) ?? rank;
      let direction: 'up' | 'down' | 'none' = 'none';
      if (rank < prevRank) direction = 'up';
      else if (rank > prevRank) direction = 'down';
      return { ...h, rank, prevRank, direction };
    });

    prevRanksRef.current = new Map(sorted.map((h, i) => [h.id, i + 1]));
    setRankingState(newRanked);
  }, [raceData?.horses.map(h => `${h.id}-${h.position.toFixed(2)}`).join(',')]);

  const playerHorse = useMemo(() => {
    if (!raceData) return null;
    return raceData.horses.find(h => !h.isAI) || raceData.horses[0] || null;
  }, [raceData]);

  if (!raceData || raceData.phase === 'waiting') return null;

  const playerRank = rankingState.find(h => h.id === playerHorse?.id)?.rank ?? '-';
  const remaining = playerHorse ? Math.max(0, raceData.trackLength - playerHorse.position) : 0;

  const totalWidth = rankingState.length * ITEM_WIDTH + (rankingState.length - 1) * ITEM_GAP;
  const startLeft = `calc(50% - ${totalWidth / 2}px)`;

  return (
    <div className="hud-container">
      <div className="ranking-bar" style={{ height: '76px' }}>
        {rankingState.map((horse, idx) => {
          const left = `calc(50% - ${totalWidth / 2}px + ${idx * (ITEM_WIDTH + ITEM_GAP)}px)`;
          const rankColor = getRankColor(horse.rank);

          return (
            <div
              key={horse.id}
              className={`ranking-item ${horse.direction === 'up' ? 'ranking-up' : horse.direction === 'down' ? 'ranking-down' : ''}`}
              style={{
                left,
                background: rankColor + '20',
                borderColor: rankColor + '50',
              }}
            >
              <span className="rank-num" style={{ color: rankColor }}>
                #{horse.rank}
              </span>
              <span className="rank-name" style={{ color: horse.color }}>
                {horse.name}
              </span>
            </div>
          );
        })}
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
              <span className="value">#{playerRank}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
