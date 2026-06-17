import React, { useCallback, useRef } from 'react';
import { toPng } from 'html-to-image';
import { GameFinalResult, FunniestAnswer, PlayerInfo } from '../types';

interface ResultPosterProps {
  finalResult: GameFinalResult;
  funniestAnswer: FunniestAnswer | null;
  roomId: string;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_BG = ['rgba(255,215,0,0.15)', 'rgba(192,192,192,0.15)', 'rgba(205,127,50,0.15)'];

export default function ResultPoster({ finalResult, funniestAnswer, roomId }: ResultPosterProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const sorted = [...finalResult.players].sort((a, b) => b.score - a.score);

  const handleDownload = useCallback(async () => {
    if (!posterRef.current) return;
    try {
      const dataUrl = await toPng(posterRef.current, {
        backgroundColor: '#FFF8E7',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `猜词同乐-${roomId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate poster', err);
    }
  }, [roomId]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
    }}>
      <div ref={posterRef} style={{
        background: '#FFF8E7',
        borderRadius: 20,
        padding: 40,
        maxWidth: 520,
        width: '100%',
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#2D3436', marginBottom: 4 }}>
            🎉 游戏结束
          </div>
          <div style={{ fontSize: 14, color: '#888' }}>
            房间号：{roomId} · 主题：{finalResult.theme}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 32, flexWrap: 'wrap' }}>
          {sorted.slice(0, 3).map((p, i) => (
            <div key={p.id} className="fade-in-up" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              padding: '20px 24px', borderRadius: 16,
              background: MEDAL_BG[i],
              animationDelay: `${i * 0.15}s`,
              minWidth: 120,
            }}>
              <div style={{ fontSize: 36 }}>{MEDALS[i]}</div>
              <div style={{
                width: i === 0 ? 72 : 56, height: i === 0 ? 72 : 56, borderRadius: '50%',
                background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: i === 0 ? 28 : 22, fontWeight: 800, color: '#fff',
                boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
              }}>
                {p.nickname.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontWeight: 700, color: '#2D3436', fontSize: 15 }}>{p.nickname}</div>
              <div style={{ fontWeight: 800, color: '#4ECDC4', fontSize: 22, fontFamily: 'Poppins, sans-serif' }}>
                {p.score}分
              </div>
            </div>
          ))}
        </div>

        {sorted.length > 3 && (
          <div style={{ marginBottom: 24 }}>
            {sorted.slice(3).map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                borderRadius: 8, marginBottom: 4,
              }}>
                <span style={{ fontWeight: 700, color: '#aaa', width: 24 }}>{i + 4}</span>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: p.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#fff',
                }}>
                  {p.nickname.charAt(0).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontWeight: 600, color: '#555', fontSize: 14 }}>{p.nickname}</span>
                <span style={{ fontWeight: 700, color: '#4ECDC4', fontFamily: 'Poppins, sans-serif' }}>{p.score}</span>
              </div>
            ))}
          </div>
        )}

        {funniestAnswer && (
          <div style={{
            padding: 20, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(255,107,107,0.08), rgba(255,140,66,0.08))',
            border: '2px dashed rgba(255,107,107,0.2)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#FF6B6B', marginBottom: 8 }}>
              😂 本局最搞笑答案
            </div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>
              {funniestAnswer.nickname} 猜了「<span style={{ fontWeight: 700, color: '#2D3436' }}>{funniestAnswer.answer}</span>」
            </div>
            <div style={{ fontSize: 13, color: '#aaa' }}>
              关键词是「{funniestAnswer.keyword}」— {funniestAnswer.reason}
            </div>
          </div>
        )}
      </div>

      <button
        className="btn-hover"
        onClick={handleDownload}
        style={{
          marginTop: 24, padding: '14px 36px', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
          color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        📥 下载分享海报
      </button>

      <button
        className="btn-hover"
        onClick={() => window.location.reload()}
        style={{
          marginTop: 12, padding: '10px 28px', borderRadius: 10, border: '2px solid #eee',
          background: '#fff', color: '#888', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        🏠 返回主页
      </button>
    </div>
  );
}
