import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Canvas, { CanvasHandle } from './components/Canvas';
import ToolPanel from './components/ToolPanel';
import useCanvasHistory from './hooks/useCanvasHistory';
import { LineData, canvasApi, LeaderboardEntry, LeaderboardResult } from './api/canvasApi';

interface NotificationItem {
  id: string;
  author: string;
  count: number;
  visible: boolean;
}

const AppInner: React.FC = () => {
  const [toolColor, setToolColor] = useState('#8B4513');
  const [brushSize, setBrushSize] = useState(4);
  const [remoteLines, setRemoteLines] = useState<LineData[]>([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const [firstTime, setFirstTime] = useState<number>(Date.now() / 1000 - 3600);
  const [isPublishing, setIsPublishing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [timeTravelOpen, setTimeTravelOpen] = useState(false);
  const [timeTravelActive, setTimeTravelActive] = useState(false);
  const [timeTravelValue, setTimeTravelValue] = useState<number>(Date.now() / 1000);
  const [timeTravelLines, setTimeTravelLines] = useState<LineData[]>([]);
  const [snapshotStats, setSnapshotStats] = useState<{ online: number; newLines: number } | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbTransitioning, setLbTransitioning] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  const canvasRef = useRef<CanvasHandle>(null);
  const pollTimerRef = useRef<number | null>(null);
  const lbTimerRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const history = useCanvasHistory();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await canvasApi.getRecentLines(1000);
        setRemoteLines(res.lines);
        setOnlineCount(res.online_count);
        setFirstTime(res.first_time);
        lastTimeRef.current = Date.now() / 1000;
      } catch (e) {
        console.error('初始化加载线条失败', e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const since = lastTimeRef.current - 0.5;
        const res = await canvasApi.getRecentLines(500, since);
        if (res.lines.length > 0) {
          setRemoteLines((prev) => {
            const existing = new Set(prev.map((l) => l.id));
            const newOnes = res.lines.filter((l) => !existing.has(l.id));
            if (newOnes.length === 0) return prev;
            newOnes.forEach((l) => {
              showNotification(l.author, 1);
            });
            return [...prev, ...newOnes];
          });
          lastTimeRef.current = Date.now() / 1000;
        }
        setOnlineCount(res.online_count);
      } catch (e) {
        // ignore
      }
    };

    pollTimerRef.current = window.setInterval(poll, 4000);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const loadLb = async () => {
      try {
        const res: LeaderboardResult = await canvasApi.getLeaderboard(20);
        setLbTransitioning(true);
        setTimeout(() => {
          setLeaderboard(res.leaderboard);
          setTimeout(() => setLbTransitioning(false), 80);
        }, 180);
      } catch (e) {
        // ignore
      }
    };
    loadLb();
    lbTimerRef.current = window.setInterval(loadLb, 10000);
    return () => {
      if (lbTimerRef.current) clearInterval(lbTimerRef.current);
    };
  }, []);

  const showNotification = useCallback((author: string, count: number) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setNotifications((prev) => [...prev, { id, author, count, visible: false }]);
    requestAnimationFrame(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, visible: true } : n))
      );
    });
    setTimeout(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, visible: false } : n))
      );
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 450);
    }, 3000);
  }, []);

  const handleLocalLineComplete = useCallback((line: LineData) => {
    history.addLocalLine(line);
  }, [history]);

  const handleUndo = useCallback(() => {
    history.undo();
  }, [history]);

  const handleRedo = useCallback(() => {
    history.redo();
  }, [history]);

  const handlePublish = useCallback(async () => {
    const publishData = canvasRef.current?.getLocalLinesForPublish();
    if (!publishData || publishData.length === 0) {
      showNotification('提示', 0);
      return;
    }
    setIsPublishing(true);
    try {
      const res = await canvasApi.publishLines(publishData);
      if (res.success) {
        canvasRef.current?.clearLocalLines();
        history.clearLocalLines();
        const since = lastTimeRef.current - 0.5;
        setTimeout(async () => {
          try {
            const latest = await canvasApi.getRecentLines(1000, since);
            setRemoteLines((prev) => {
              const existing = new Set(prev.map((l) => l.id));
              const newOnes = latest.lines.filter((l) => !existing.has(l.id));
              return [...prev, ...newOnes];
            });
            lastTimeRef.current = Date.now() / 1000;
          } catch {}
        }, 200);
      }
    } catch (e) {
      console.error('发布失败', e);
    } finally {
      setIsPublishing(false);
    }
  }, [history, showNotification]);

  const handleTimeSliderChange = useCallback(async (rawValue: number) => {
    const snapped = Math.floor(rawValue / 60) * 60;
    setTimeTravelValue(rawValue);
    try {
      const snapshot = await canvasApi.getSnapshot(snapped);
      setSnapshotStats({ online: snapshot.online_count, newLines: snapshot.new_lines_count });
      history.animateToSnapshot(snapshot.lines, (displayLines) => {
        setTimeTravelLines(displayLines);
      }, 420);
    } catch (e) {
      console.error('获取快照失败', e);
    }
  }, [history]);

  const enterTimeTravel = useCallback(() => {
    setTimeTravelOpen(true);
    setTimeTravelActive(true);
    setTimeTravelValue(Date.now() / 1000);
    setTimeTravelLines(remoteLines);
    setSnapshotStats({ online: onlineCount, newLines: remoteLines.length });
  }, [remoteLines, onlineCount]);

  const exitTimeTravel = useCallback(() => {
    setTimeTravelActive(false);
    setTimeTravelOpen(false);
    history.cancelSnapshotAnimation();
    setTimeTravelLines([]);
    setSnapshotStats(null);
  }, [history]);

  const minTime = Math.floor(firstTime / 60) * 60;
  const maxTime = Math.floor(Date.now() / 1000 / 60) * 60;
  const timeRange = Math.max(60, maxTime - minTime);
  const sliderProgress = timeRange > 0 ? ((timeTravelValue - minTime) / timeRange) * 100 : 100;

  const formatTime = (t: number) => {
    const d = new Date(t * 1000);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #ffffff 0%, #f5f0e8 100%)',
      }}
    >
      <Canvas
        ref={canvasRef}
        toolColor={toolColor}
        brushSize={brushSize}
        remoteLines={remoteLines}
        localLines={history.localLines}
        onLocalLineComplete={handleLocalLineComplete}
        isTimeTravel={timeTravelActive}
        timeTravelLines={timeTravelLines}
      />

      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 18px',
          background: 'rgba(250, 246, 238, 0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(139,90,43,0.12)',
          borderRadius: '14px',
          fontSize: '13px',
          color: '#5a4a3a',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 6px 20px rgba(80,50,20,0.08)',
          zIndex: 40,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E8B57" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <span>当前在线</span>
        <span style={{ color: '#2E8B57', fontWeight: 700, fontSize: '14px' }}>{onlineCount}</span>
        <span style={{ color: '#c9b89a' }}>|</span>
        <span>总线条</span>
        <span style={{ fontWeight: 700, fontSize: '14px', color: '#8B5A2B' }}>{remoteLines.length + history.localLines.length}</span>
      </div>

      {!isMobile && (
        <div
          style={{
            position: 'absolute',
            left: '20px',
            top: '70px',
            width: '260px',
            maxHeight: 'calc(100vh - 120px)',
            background: 'rgba(250, 246, 238, 0.72)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(139,90,43,0.12)',
            borderRadius: '18px',
            boxShadow: '0 12px 40px rgba(80,50,20,0.1)',
            overflow: 'hidden',
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(139,90,43,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, rgba(180,130,70,0.12), rgba(139,90,43,0.06))',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5A2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            <span style={{ fontWeight: 700, color: '#5a4a3a', fontSize: '14px' }}>热门线条榜</span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '10px',
                color: '#2E8B57',
                padding: '2px 8px',
                borderRadius: '10px',
                background: 'rgba(46,139,87,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%', background: '#2E8B57',
                animation: 'pulse 1.6s ease-in-out infinite',
              }} />
              LIVE
            </span>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '6px 4px' }}>
            {leaderboard.length === 0 ? (
              <div style={{ padding: '30px 16px', textAlign: 'center', color: '#aaa', fontSize: '12px' }}>
                暂无数据...
              </div>
            ) : (
              leaderboard.map((entry, idx) => (
                <div
                  key={entry.id}
                  onClick={() => canvasRef.current?.focusLine(entry.id)}
                  style={{
                    padding: '9px 12px',
                    margin: '3px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: `opacity 0.22s ease, background 0.15s, transform 0.15s`,
                    opacity: lbTransitioning ? 0 : 1,
                    transitionDelay: `${idx * 28}ms`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(180,130,70,0.09)';
                    e.currentTarget.style.transform = 'translateX(3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <span
                    style={{
                      minWidth: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: entry.rank <= 3
                        ? ['linear-gradient(135deg,#ffd700,#daa520)', 'linear-gradient(135deg,#c0c0c0,#a8a8a8)', 'linear-gradient(135deg,#cd7f32,#a0522d)'][entry.rank - 1]
                        : 'rgba(139,90,43,0.12)',
                      color: entry.rank <= 3 ? '#fff' : '#8B5A2B',
                      boxShadow: entry.rank <= 3 ? '0 2px 6px rgba(0,0,0,0.18)' : 'none',
                    }}
                  >
                    {entry.rank}
                  </span>
                  <span
                    style={{
                      width: '14px', height: '14px', borderRadius: '4px',
                      background: entry.color, flexShrink: 0,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    }}
                  />
                  <span
                    style={{
                      flex: 1, fontSize: '12.5px', color: '#5a4a3a', fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.author}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={entry.likes > 0 ? '#e74c3c' : 'none'} stroke={entry.likes > 0 ? '#e74c3c' : '#999'} strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span style={{ fontSize: '12px', color: entry.likes > 0 ? '#e74c3c' : '#888', fontWeight: 700 }}>
                      {entry.likes}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {timeTravelActive && snapshotStats && !isMobile && (
        <div
          style={{
            position: 'absolute',
            left: '20px',
            bottom: '150px',
            width: '220px',
            background: 'rgba(84, 110, 122, 0.78)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
            color: '#fff',
            overflow: 'hidden',
            zIndex: 45,
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formatTime(timeTravelValue)} 的快照
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', opacity: 0.75, marginBottom: '4px' }}>当时在线</div>
              <div style={{ fontSize: '26px', fontWeight: 800 }}>
                {snapshotStats.online}
                <span style={{ fontSize: '13px', fontWeight: 500, opacity: 0.7, marginLeft: '4px' }}>人</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', opacity: 0.75, marginBottom: '4px' }}>累计线条</div>
              <div style={{ fontSize: '26px', fontWeight: 800 }}>
                {snapshotStats.newLines}
                <span style={{ fontSize: '13px', fontWeight: 500, opacity: 0.7, marginLeft: '4px' }}>条</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToolPanel
        color={toolColor}
        onColorChange={setToolColor}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onPublish={handlePublish}
        isPublishing={isPublishing}
      />

      {!timeTravelOpen && (
        <button
          onClick={enterTimeTravel}
          style={{
            position: 'absolute',
            right: '28px',
            bottom: isMobile ? '70px' : '28px',
            padding: '12px 18px',
            background: 'linear-gradient(135deg, #5a6f7a, #3e515c)',
            color: '#fff',
            border: 'none',
            borderRadius: '14px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 8px 22px rgba(62,81,92,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 45,
            transition: 'transform 0.15s, box-shadow 0.15s, filter 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 11px 28px rgba(62,81,92,0.45)';
            e.currentTarget.style.filter = 'brightness(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 22px rgba(62,81,92,0.35)';
            e.currentTarget.style.filter = 'brightness(1)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
          </svg>
          时光回溯
        </button>
      )}

      {timeTravelOpen && (
        <div
          style={{
            position: 'absolute',
            left: isMobile ? '12px' : '50%',
            right: isMobile ? '12px' : 'auto',
            bottom: isMobile ? '70px' : '30px',
            transform: isMobile ? 'none' : 'translateX(-50%)',
            width: isMobile ? 'auto' : '640px',
            background: 'rgba(84, 110, 122, 0.82)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '18px',
            padding: '16px 20px',
            boxShadow: '0 14px 40px rgba(0,0,0,0.25)',
            color: '#fff',
            zIndex: 60,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              时光回溯 · 拖动查看历史
            </div>
            <button
              onClick={exitTimeTravel}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.12)',
                color: '#fff',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            >
              返回现在
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.8, marginBottom: '6px' }}>
            <span>{formatTime(minTime)}</span>
            <span style={{ fontWeight: 700, fontSize: '13px', opacity: 1, background: 'rgba(255,255,255,0.12)', padding: '2px 10px', borderRadius: '8px' }}>
              {formatTime(Math.floor(timeTravelValue / 60) * 60)}
            </span>
            <span>{formatTime(maxTime)}</span>
          </div>

          <input
            type="range"
            min={minTime}
            max={maxTime}
            step={60}
            value={Math.min(maxTime, Math.max(minTime, timeTravelValue))}
            onChange={(e) => handleTimeSliderChange(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: `linear-gradient(to right, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.9) ${sliderProgress}%, rgba(255,255,255,0.2) ${sliderProgress}%, rgba(255,255,255,0.2) 100%)`,
              appearance: 'none',
              WebkitAppearance: 'none',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          {isMobile && snapshotStats && (
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', opacity: 0.75 }}>在线</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{snapshotStats.online}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', opacity: 0.75 }}>线条</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{snapshotStats.newLines}</div>
              </div>
            </div>
          )}
          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: #fff;
              border: 3px solid #3e515c;
              cursor: pointer;
              box-shadow: 0 3px 8px rgba(0,0,0,0.3);
            }
            input[type="range"]::-moz-range-thumb {
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: #fff;
              border: 3px solid #3e515c;
              cursor: pointer;
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.5; transform: scale(0.85); }
            }
          `}</style>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          right: '28px',
          bottom: isMobile ? '130px' : '110px',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              padding: '10px 16px',
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(139,90,43,0.15)',
              borderRadius: '12px',
              boxShadow: '0 6px 22px rgba(0,0,0,0.12)',
              minWidth: '220px',
              transform: n.visible ? 'translateX(0)' : 'translateX(calc(100% + 40px))',
              opacity: n.visible ? 1 : 0,
              transition: 'transform 0.38s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.3s',
              pointerEvents: 'none',
            }}
          >
            {n.count === 0 ? (
              <div style={{ fontSize: '13px', color: '#888', textAlign: 'center' }}>请先绘制一些线条再发布</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', background: '#2E8B57', flexShrink: 0,
                  boxShadow: '0 0 0 4px rgba(46,139,87,0.15)',
                }} />
                <div style={{ fontSize: '12.5px', color: '#5a4a3a' }}>
                  <span style={{ fontWeight: 700, color: '#8B5A2B' }}>{n.author}</span>
                  {' '}发布了 <span style={{ fontWeight: 700, color: '#2E8B57' }}>{n.count}</span> 条新线条
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppInner />
  </BrowserRouter>
);

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}

export default App;
