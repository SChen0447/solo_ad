import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { COLOR_SCHEMES, ColorScheme } from '../types';

const formatDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

interface DisplayCell {
  color: string;
  isTheme: boolean;
  id: string;
}

const ColorChallenge: React.FC = () => {
  const { todayChallenge, saveChallenge, setCurrentPage } = useApp();
  const [scheme, setScheme] = useState<ColorScheme | null>(null);
  const [cells, setCells] = useState<(DisplayCell | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<'success' | 'fail' | null>(null);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [flippedCells, setFlippedCells] = useState<Set<string>>(new Set());
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  const initChallenge = useCallback(() => {
    if (todayChallenge) {
      const existingScheme = COLOR_SCHEMES.find(s => s.id === todayChallenge.schemeId) || COLOR_SCHEMES[0];
      setScheme(existingScheme);
      buildCells(existingScheme);
      setResult(todayChallenge.score === 10 ? 'success' : todayChallenge.score === 0 && todayChallenge.timeSpent >= 10 ? 'fail' : null);
      setIsPlaying(false);
      setTimeLeft(10);
      return;
    }

    const randomScheme = COLOR_SCHEMES[Math.floor(Math.random() * COLOR_SCHEMES.length)];
    setScheme(randomScheme);
    buildCells(randomScheme);
    setIsPlaying(true);
    setTimeLeft(10);
    setResult(null);
    setSelectedCell(null);
    setFlippedCells(new Set());
    startTimeRef.current = performance.now();
  }, [todayChallenge]);

  const buildCells = (colorScheme: ColorScheme) => {
    const distractors = [...colorScheme.distractorColors].sort(() => Math.random() - 0.5).slice(0, 4);
    const allColors: DisplayCell[] = [
      ...distractors.map(c => ({ color: c, isTheme: false, id: `d-${c}-${Math.random()}` })),
      { color: colorScheme.themeColor, isTheme: true, id: `t-${colorScheme.themeColor}` },
    ];
    const shuffled = allColors.sort(() => Math.random() - 0.5);
    const grid: (DisplayCell | null)[] = [];
    let idx = 0;
    for (let i = 0; i < 6; i++) {
      if (i === 2 || i === 3) {
        grid.push(null);
      } else {
        grid.push(shuffled[idx]);
        idx++;
      }
    }
    setCells(grid);
  };

  useEffect(() => {
    initChallenge();
  }, [initChallenge]);

  useEffect(() => {
    if (!isPlaying || timeLeft <= 0) {
      if (timeLeft <= 0 && isPlaying) {
        handleTimeout();
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return Math.max(0, prev - 0.1);
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const handleTimeout = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
    setResult('fail');
    if (scheme) {
      const today = formatDate(new Date());
      saveChallenge({
        date: today,
        score: 0,
        timeSpent: 10,
        themeColor: scheme.themeColor,
        distractorColors: scheme.distractorColors,
        schemeId: scheme.id,
        schemeName: scheme.name,
      });
    }
  };

  const handleCellClick = (cell: DisplayCell) => {
    if (!isPlaying || result) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const timeSpent = (performance.now() - startTimeRef.current) / 1000;
    setSelectedCell(cell.id);
    setFlippedCells(prev => new Set(prev).add(cell.id));
    setIsPlaying(false);

    setTimeout(() => {
      if (cell.isTheme) {
        setResult('success');
        if (scheme) {
          const today = formatDate(new Date());
          saveChallenge({
            date: today,
            score: 10,
            timeSpent: Math.min(timeSpent, 10),
            themeColor: scheme.themeColor,
            distractorColors: scheme.distractorColors,
            schemeId: scheme.id,
            schemeName: scheme.name,
          });
        }
      } else {
        setResult('fail');
        if (scheme) {
          const today = formatDate(new Date());
          saveChallenge({
            date: today,
            score: 0,
            timeSpent: Math.min(timeSpent, 10),
            themeColor: scheme.themeColor,
            distractorColors: scheme.distractorColors,
            schemeId: scheme.id,
            schemeName: scheme.name,
          });
        }
      }
    }, 500);
  };

  return (
    <div className="challenge-container">
      <h1 className="page-title">每日配色挑战</h1>

      <div className="challenge-header">
        <div className="timer-box">⏱ {timeLeft.toFixed(1)}s</div>
        <div className="theme-hint">
          主题：<strong style={{ color: '#ffffff' }}>{scheme?.name || '加载中'}</strong>
        </div>
        <div className="score-box">
          {todayChallenge ? `今日: ${todayChallenge.score}分` : '今日: 未完成'}
        </div>
      </div>

      <div className="color-grid">
        {cells.map((cell, idx) => (
          <div
            key={idx}
            className={`color-cell ${!cell ? 'empty' : ''} ${cell && selectedCell === cell.id ? (cell.isTheme ? 'correct' : 'wrong') : ''} ${cell && flippedCells.has(cell.id) ? 'flipped' : ''}`}
            onClick={() => cell && handleCellClick(cell)}
          >
            {cell && (
              <div className="color-cell-inner">
                <div className="color-cell-front" style={{ backgroundColor: cell.color }} />
                <div className="color-cell-back">
                  {cell.isTheme ? '✓ 主题色' : '✗ 干扰色'}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {result && (
        <div className={`result-message ${result === 'success' ? 'success' : 'fail'}`}>
          {result === 'success'
            ? `🎉 恭喜！答对了，获得10分！用时 ${todayChallenge?.timeSpent.toFixed(1)}秒`
            : '😢 很遗憾，答错了或超时了'}
        </div>
      )}

      <div className="challenge-actions">
        <button className="action-btn secondary" onClick={initChallenge}>
          {todayChallenge ? '🔄 重新挑战' : '🔄 换一题'}
        </button>
        {result && (
          <button className="action-btn primary" onClick={() => setCurrentPage('emotion')}>
            下一步：记录情绪 →
          </button>
        )}
      </div>
    </div>
  );
};

export default ColorChallenge;
