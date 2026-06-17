import React, { useCallback, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { GameFinalResult, FunniestAnswer, PlayerInfo } from '../types';

interface ResultPosterProps {
  finalResult: GameFinalResult;
  funniestAnswer: FunniestAnswer | null;
  roomId: string;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_BG = [
  'linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,193,7,0.1))',
  'linear-gradient(135deg, rgba(192,192,192,0.25), rgba(158,158,158,0.1))',
  'linear-gradient(135deg, rgba(205,127,50,0.25), rgba(141,110,99,0.1))',
];

function generateFunniestAnswer(rounds: any[], players: PlayerInfo[]): FunniestAnswer | null {
  if (!rounds || rounds.length === 0) return null;

  const candidates: Array<{
    playerId: string;
    nickname: string;
    answer: string;
    keyword: string;
    reason: string;
    score: number;
  }> = [];

  for (const r of rounds) {
    const keyword = r.keyword;
    const answers = r.answers;

    for (const a of answers) {
      if (a.correct && a.answer && keyword && a.answer !== '(未作答)') {
        const answerLower = a.answer.toLowerCase();
        const keywordLower = keyword.toLowerCase();
        const hasOverlap = keywordLower.includes(answerLower) || answerLower.includes(keywordLower);
        let commonChars = 0;
        for (const c of keywordLower) {
          if (answerLower.includes(c)) commonChars++;
        }
        const overlapRatio = keyword.length > 0 ? commonChars / keyword.length : 0;

        if (!hasOverlap && overlapRatio < 0.35) {
          candidates.push({
            playerId: a.playerId,
            nickname: a.nickname,
            answer: a.answer,
            keyword: keyword,
            reason: '猜的答案与关键词完全无关但被出题者选为正确，太有梗了！',
            score: 100 - Math.floor(overlapRatio * 100),
          });
        }
      }
    }

    if (answers.length >= 3) {
      const uniqueAnswers = new Set(
        answers.filter((a: any) => a.answer && a.answer !== '(未作答)').map((a: any) => a.answer)
      );
      if (uniqueAnswers.size >= answers.length * 0.7) {
        const mostCreative = answers
          .filter((a: any) => a.answer && a.answer !== '(未作答)')
          .sort((a: any, b: any) => b.answer.length - a.answer.length)[0];
        if (mostCreative) {
          candidates.push({
            playerId: mostCreative.playerId,
            nickname: mostCreative.nickname,
            answer: mostCreative.answer,
            keyword: keyword,
            reason: `这轮有${uniqueAnswers.size}个完全不同的答案，每个人都有独特的脑洞！`,
            score: uniqueAnswers.size * 12,
          });
        }
      }
    }
  }

  if (candidates.length === 0) {
    const allCorrect = rounds.flatMap((r: any) =>
      r.answers.filter((a: any) => a.correct && a.answer !== '(未作答)')
    );
    if (allCorrect.length > 0) {
      const randomAnswer = allCorrect[Math.floor(Math.random() * allCorrect.length)];
      const round = rounds.find((r: any) =>
        r.answers.some((a: any) => a.answer === randomAnswer.answer)
      );
      return {
        playerId: randomAnswer.playerId,
        nickname: randomAnswer.nickname,
        answer: randomAnswer.answer,
        keyword: round?.keyword || '',
        reason: '这局最默契的心有灵犀答案！',
      };
    }
    return null;
  }

  const useRule1 = Math.random() > 0.5;
  const rule1Candidates = candidates.filter(c => c.reason.includes('完全无关'));
  const rule2Candidates = candidates.filter(c => c.reason.includes('完全不同'));

  const pool = useRule1 ? (rule1Candidates.length > 0 ? rule1Candidates : candidates)
                       : (rule2Candidates.length > 0 ? rule2Candidates : candidates);

  pool.sort((a, b) => b.score - a.score);
  const best = pool[0];
  return {
    playerId: best.playerId,
    nickname: best.nickname,
    answer: best.answer,
    keyword: best.keyword,
    reason: best.reason,
  };
}

export default function ResultPoster({ finalResult, funniestAnswer, roomId }: ResultPosterProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const sorted = [...finalResult.players].sort((a, b) => b.score - a.score);

  const effectiveFunniest = funniestAnswer || generateFunniestAnswer(finalResult.rounds, finalResult.players);

  const handleDownload = useCallback(async () => {
    if (!posterRef.current || downloading) return;
    setDownloading(true);
    try {
      const startTime = performance.now();
      const dataUrl = await toPng(posterRef.current, {
        backgroundColor: '#FFF8E7',
        pixelRatio: 2,
        cacheBust: true,
        style: {
          transform: 'none',
        },
      });
      const link = document.createElement('a');
      link.download = `猜词同乐-${roomId}.png`;
      link.href = dataUrl;
      link.click();
      const endTime = performance.now();
      console.log(`海报生成耗时: ${(endTime - startTime).toFixed(0)}ms`);
      setGenerated(true);
    } catch (err) {
      console.error('海报生成失败', err);
    } finally {
      setDownloading(false);
    }
  }, [roomId, downloading]);

  const handleRestart = () => {
    window.location.reload();
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      gap: 24,
    }}>
      <div ref={posterRef} style={{
        background: 'linear-gradient(135deg, #FFF8E7 0%, #FFE4C4 50%, #FFF8E7 100%)',
        borderRadius: 24,
        padding: '48px 40px',
        maxWidth: 560,
        width: '100%',
        boxShadow: '0 12px 48px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: -40, right: -40,
          width: 160, height: 160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(78,205,196,0.2), transparent 70%)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -30, left: -30,
          width: 140, height: 140,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,107,0.2), transparent 70%)',
        }} />

        <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 4, letterSpacing: 2 }}>
            🎮 猜词同乐 · 游戏结束
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, color: '#2D3436', marginBottom: 6, letterSpacing: -1 }}>
            🎉 本局战报
          </div>
          <div style={{ fontSize: 13, color: '#999', display: 'flex', gap: 12, justifyContent: 'center' }}>
            <span>房间号：<b style={{ color: '#4ECDC4' }}>{roomId}</b></span>
            <span>主题：<b style={{ color: '#FF6B6B' }}>{finalResult.theme}</b></span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 32, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          {sorted.slice(0, 3).map((p, i) => (
            <div key={p.id} className="fade-in-up" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              padding: '24px 20px', borderRadius: 18,
              background: MEDAL_BG[i],
              animationDelay: `${i * 0.18}s`,
              minWidth: 130,
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                fontSize: 42,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
              }}>{MEDALS[i]}</div>
              <div style={{
                width: i === 0 ? 80 : 64, height: i === 0 ? 80 : 64, borderRadius: '50%',
                background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: i === 0 ? 32 : 26, fontWeight: 800, color: '#fff',
                boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                border: '3px solid rgba(255,255,255,0.6)',
              }}>
                {p.nickname.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontWeight: 700, color: '#2D3436', fontSize: 15 }}>{p.nickname}</div>
              <div style={{
                fontWeight: 900, color: '#4ECDC4', fontSize: i === 0 ? 32 : 26,
                fontFamily: 'Poppins, sans-serif',
                textShadow: '0 2px 8px rgba(78,205,196,0.3)',
              }}>
                {p.score}<span style={{ fontSize: 14, fontWeight: 600, marginLeft: 2 }}>分</span>
              </div>
            </div>
          ))}
        </div>

        {sorted.length > 3 && (
          <div style={{ marginBottom: 24, position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8, paddingLeft: 8, fontWeight: 600 }}>
              其他玩家
            </div>
            {sorted.slice(3).map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                borderRadius: 10, marginBottom: 4,
                background: 'rgba(255,255,255,0.5)',
              }}>
                <span style={{ fontWeight: 700, color: '#bbb', width: 22, fontSize: 12 }}>{i + 4}</span>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: p.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff',
                }}>
                  {p.nickname.charAt(0).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontWeight: 600, color: '#666', fontSize: 14 }}>{p.nickname}</span>
                <span style={{ fontWeight: 800, color: '#4ECDC4', fontFamily: 'Poppins, sans-serif' }}>{p.score}</span>
              </div>
            ))}
          </div>
        )}

        {effectiveFunniest && (
          <div style={{
            padding: 22, borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(255,107,107,0.12), rgba(255,140,66,0.08))',
            border: '2px dashed rgba(255,107,107,0.3)',
            position: 'relative', zIndex: 1,
          }}>
            <div style={{
              fontSize: 15, fontWeight: 700, color: '#FF6B6B', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 18 }}>😂</span>
              本局最搞笑答案
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.7)',
              padding: '12px 16px', borderRadius: 12,
              marginBottom: 8,
            }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
                <b style={{ color: '#2D3436' }}>{effectiveFunniest.nickname}</b> 猜了：
              </div>
              <div style={{
                fontSize: 22, fontWeight: 800, color: '#FF6B6B',
                fontFamily: 'Poppins, sans-serif',
              }}>
                「{effectiveFunniest.answer}」
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>
              关键词是 <b style={{ color: '#4ECDC4' }}>「{effectiveFunniest.keyword}」</b>
              <br />
              <span style={{ fontStyle: 'italic' }}>— {effectiveFunniest.reason}</span>
            </div>
          </div>
        )}

        <div style={{
          textAlign: 'center', marginTop: 24,
          fontSize: 11, color: '#ccc',
          borderTop: '1px dashed rgba(0,0,0,0.08)',
          paddingTop: 12,
          position: 'relative', zIndex: 1,
        }}>
          猜词同乐 · 桌游派对助手 · {new Date().toLocaleDateString('zh-CN')}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          className="btn-hover"
          onClick={handleDownload}
          disabled={downloading}
          style={{
            padding: '14px 36px', borderRadius: 12, border: 'none',
            background: downloading
              ? '#aaa'
              : 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
            color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: downloading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            minWidth: 180,
          }}
        >
          {downloading ? '⏳ 生成中...' : generated ? '✅ 已下载，再次下载' : '📥 下载分享海报'}
        </button>

        <button
          className="btn-hover"
          onClick={handleRestart}
          style={{
            padding: '14px 36px', borderRadius: 12, border: '2px solid rgba(0,0,0,0.08)',
            background: 'rgba(255,255,255,0.8)',
            color: '#666', fontSize: 16, fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          🏠 返回主页
        </button>
      </div>

      {generated && (
        <div style={{
          padding: '10px 20px', borderRadius: 10,
          background: 'rgba(78,205,196,0.12)', color: '#4ECDC4',
          fontSize: 13, fontWeight: 600,
        }}>
          ✨ 海报已生成并下载！快去分享给朋友们吧~
        </div>
      )}
    </div>
  );
}
