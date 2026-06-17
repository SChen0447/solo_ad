import { useState, useEffect, useRef, useCallback } from 'react';
import { CharacterCustomization, PlayerInfo, GamePlayer, Bullet, GameEndData } from '../types';
import { drawCharacter, CharacterPose } from '../characterRenderer';
import socket from '../socket';

interface ArenaProps {
  roomId: string;
  playerId: string;
  nickname: string;
  customization: CharacterCustomization;
  players: PlayerInfo[];
  setPlayers: React.Dispatch<React.SetStateAction<PlayerInfo[]>>;
  isHost: boolean;
  setIsHost: React.Dispatch<React.SetStateAction<boolean>>;
  onLeaveRoom: () => void;
  onReturnToLobby: () => void;
}

interface LocalPlayerState {
  x: number;
  y: number;
  angle: number;
  velocityX: number;
  velocityY: number;
  health: number;
  isAlive: boolean;
}

export default function Arena({
  roomId,
  playerId,
  nickname,
  customization,
  players,
  setPlayers,
  isHost,
  setIsHost,
  onLeaveRoom,
  onReturnToLobby,
}: ArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'ended'>('waiting');
  const [gameEndData, setGameEndData] = useState<GameEndData | null>(null);
  const [hitFlash, setHitFlash] = useState(false);
  const [killFeed, setKillFeed] = useState<{ killer: string; victim: string; id: number }[]>([]);
  const killFeedIdRef = useRef(0);

  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ x: 400, y: 300, down: false });
  const localPlayerRef = useRef<LocalPlayerState>({
    x: 400,
    y: 300,
    angle: 0,
    velocityX: 0,
    velocityY: 0,
    health: 3,
    isAlive: true,
  });
  const remotePlayersRef = useRef<Map<string, GamePlayer & { customization?: CharacterCustomization; nickname?: string }>>(new Map());
  const bulletsRef = useRef<Bullet[]>([]);
  const lastShootRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const walkFrameRef = useRef(0);
  const canvasSize = { width: 800, height: 600 };

  const PLAYER_SPEED = 200;
  const SHOOT_COOLDOWN = 300;

  useEffect(() => {
    players.forEach((p) => {
      if (p.id === playerId) return;
      const existing = remotePlayersRef.current.get(p.id);
      if (!existing) {
        remotePlayersRef.current.set(p.id, {
          id: p.id,
          x: 400,
          y: 300,
          angle: 0,
          velocityX: 0,
          velocityY: 0,
          health: p.health,
          isAlive: p.isAlive,
          customization: p.customization,
          nickname: p.nickname,
        });
      } else {
        existing.customization = p.customization;
        existing.nickname = p.nickname;
        existing.health = p.health;
        existing.isAlive = p.isAlive;
      }
    });
  }, [players, playerId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mouseRef.current.x = (e.clientX - rect.left) * scaleX;
      mouseRef.current.y = (e.clientY - rect.top) * scaleY;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseRef.current.down = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseRef.current.down = false;
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    socket.on('playerJoined', (data: { id: string; nickname: string; customization: CharacterCustomization; isHost: boolean }) => {
      setPlayers((prev) => [
        ...prev,
        {
          id: data.id,
          nickname: data.nickname,
          customization: data.customization,
          isHost: data.isHost,
          isAlive: true,
          health: 3,
          kills: 0,
        },
      ]);
      remotePlayersRef.current.set(data.id, {
        id: data.id,
        x: 400,
        y: 300,
        angle: 0,
        velocityX: 0,
        velocityY: 0,
        health: 3,
        isAlive: true,
        customization: data.customization,
        nickname: data.nickname,
      });
    });

    socket.on('playerLeft', (data: { playerId: string }) => {
      setPlayers((prev) => prev.filter((p) => p.id !== data.playerId));
      remotePlayersRef.current.delete(data.playerId);
    });

    socket.on('hostChanged', (data: { hostId: string }) => {
      setIsHost(data.hostId === playerId);
      setPlayers((prev) =>
        prev.map((p) => ({ ...p, isHost: p.id === data.hostId }))
      );
    });

    socket.on('playerCustomizationChanged', (data: { playerId: string; customization: CharacterCustomization }) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === data.playerId ? { ...p, customization: data.customization } : p
        )
      );
      const remote = remotePlayersRef.current.get(data.playerId);
      if (remote) {
        remote.customization = data.customization;
      }
    });

    socket.on('gameStarted', (data: { players: GamePlayer[]; bullets: Bullet[] }) => {
      setGameState('playing');
      setGameEndData(null);
      bulletsRef.current = data.bullets;

      const myPlayer = data.players.find((p) => p.id === playerId);
      if (myPlayer) {
        localPlayerRef.current = {
          x: myPlayer.x,
          y: myPlayer.y,
          angle: myPlayer.angle,
          velocityX: 0,
          velocityY: 0,
          health: myPlayer.health,
          isAlive: myPlayer.isAlive,
        };
      }

      data.players.forEach((p) => {
        if (p.id !== playerId) {
          const remote = remotePlayersRef.current.get(p.id);
          if (remote) {
            remote.x = p.x;
            remote.y = p.y;
            remote.angle = p.angle;
            remote.health = p.health;
            remote.isAlive = p.isAlive;
          }
        }
      });
    });

    socket.on('gameState', (data: { players: GamePlayer[]; bullets: Bullet[]; timestamp: number }) => {
      if (gameState !== 'playing') return;

      data.players.forEach((p) => {
        if (p.id === playerId) {
          localPlayerRef.current.health = p.health;
          localPlayerRef.current.isAlive = p.isAlive;
        } else {
          const remote = remotePlayersRef.current.get(p.id);
          if (remote) {
            const alpha = 0.5;
            remote.x = remote.x * (1 - alpha) + p.x * alpha;
            remote.y = remote.y * (1 - alpha) + p.y * alpha;
            remote.angle = p.angle;
            remote.health = p.health;
            remote.isAlive = p.isAlive;
            remote.velocityX = p.velocityX;
            remote.velocityY = p.velocityY;
          }
        }
      });

      bulletsRef.current = data.bullets;
    });

    socket.on('playerHit', (data: { targetId: string; shooterId: string; damage: number; targetHealth: number; shooterKills: number }) => {
      if (data.targetId === playerId) {
        setHitFlash(true);
        setTimeout(() => setHitFlash(false), 200);
        localPlayerRef.current.health = data.targetHealth;
      }

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === data.targetId) {
            return { ...p, health: data.targetHealth };
          }
          if (p.id === data.shooterId) {
            return { ...p, kills: data.shooterKills };
          }
          return p;
        })
      );
    });

    socket.on('playerEliminated', (data: { playerId: string; nickname: string; killerId: string; killerName: string }) => {
      if (data.playerId === playerId) {
        localPlayerRef.current.isAlive = false;
      }
      const remote = remotePlayersRef.current.get(data.playerId);
      if (remote) {
        remote.isAlive = false;
      }

      const newEntry = {
        id: killFeedIdRef.current++,
        killer: data.killerName,
        victim: data.nickname,
      };
      setKillFeed((prev) => [...prev.slice(-4), newEntry]);
      setTimeout(() => {
        setKillFeed((prev) => prev.filter((e) => e.id !== newEntry.id));
      }, 5000);
    });

    socket.on('gameEnd', (data: GameEndData) => {
      setGameState('ended');
      setGameEndData(data);
    });

    socket.on('returnedToLobby', () => {
      setGameState('waiting');
      setGameEndData(null);
      setKillFeed([]);
      localPlayerRef.current = {
        x: 400,
        y: 300,
        angle: 0,
        velocityX: 0,
        velocityY: 0,
        health: 3,
        isAlive: true,
      };
      bulletsRef.current = [];
    });

    return () => {
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('hostChanged');
      socket.off('playerCustomizationChanged');
      socket.off('gameStarted');
      socket.off('gameState');
      socket.off('playerHit');
      socket.off('playerEliminated');
      socket.off('gameEnd');
      socket.off('returnedToLobby');
    };
  }, [gameState, playerId, setPlayers, setIsHost]);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const local = localPlayerRef.current;

    if (gameState === 'playing' && local.isAlive) {
      let dx = 0;
      let dy = 0;

      if (keysRef.current.has('w') || keysRef.current.has('arrowup')) dy -= 1;
      if (keysRef.current.has('s') || keysRef.current.has('arrowdown')) dy += 1;
      if (keysRef.current.has('a') || keysRef.current.has('arrowleft')) dx -= 1;
      if (keysRef.current.has('d') || keysRef.current.has('arrowright')) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
        walkFrameRef.current += 1;
      }

      const newX = local.x + dx * PLAYER_SPEED * (1 / 60);
      const newY = local.y + dy * PLAYER_SPEED * (1 / 60);

      local.x = Math.max(20, Math.min(canvasSize.width - 20, newX));
      local.y = Math.max(30, Math.min(canvasSize.height - 20, newY));
      local.velocityX = dx * PLAYER_SPEED;
      local.velocityY = dy * PLAYER_SPEED;

      local.angle = Math.atan2(
        mouseRef.current.y - local.y,
        mouseRef.current.x - local.x
      );

      if (mouseRef.current.down) {
        const now = Date.now();
        if (now - lastShootRef.current > SHOOT_COOLDOWN) {
          lastShootRef.current = now;
          socket.emit('shoot', { x: local.x, y: local.y, angle: local.angle });
        }
      }

      socket.emit('playerMove', {
        x: local.x,
        y: local.y,
        angle: local.angle,
        velocityX: local.velocityX,
        velocityY: local.velocityY,
      });
    }

    render(ctx);

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [gameLoop]);

  const render = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = canvasSize;
    const local = localPlayerRef.current;

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#87ceeb');
    gradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(46, 125, 50, 0.3)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    bulletsRef.current.forEach((bullet) => {
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 10, 0, Math.PI * 2);
      ctx.fill();
    });

    remotePlayersRef.current.forEach((player) => {
      if (!player.customization) return;

      const isMoving = Math.abs(player.velocityX) > 1 || Math.abs(player.velocityY) > 1;
      const pose: CharacterPose = isMoving ? 'walk' : 'idle';
      const frame = isMoving ? walkFrameRef.current : 0;

      if (!player.isAlive) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.translate(player.x, player.y + 15);
        ctx.rotate(Math.PI / 2);
        ctx.translate(-player.x, -(player.y + 15));
        drawCharacter(ctx, player.x, player.y, player.customization, 1, pose, frame, 0);
        ctx.restore();
      } else {
        drawCharacter(ctx, player.x, player.y, player.customization, 1, pose, frame, player.angle);
      }

      if (player.nickname && player.isAlive) {
        drawPlayerInfo(ctx, player.x, player.y - 35, player.nickname, player.health, 3);
      }
    });

    if (local.isAlive) {
      const isMoving = Math.abs(local.velocityX) > 1 || Math.abs(local.velocityY) > 1;
      const pose: CharacterPose = isMoving ? 'walk' : 'idle';
      const frame = isMoving ? walkFrameRef.current : 0;

      drawCharacter(ctx, local.x, local.y, customization, 1, pose, frame, local.angle);
      drawPlayerInfo(ctx, local.x, local.y - 35, nickname + ' (你)', local.health, 3);

      ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(local.x, local.y);
      ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mouseRef.current.x, mouseRef.current.y, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mouseRef.current.x - 15, mouseRef.current.y);
      ctx.lineTo(mouseRef.current.x - 5, mouseRef.current.y);
      ctx.moveTo(mouseRef.current.x + 5, mouseRef.current.y);
      ctx.lineTo(mouseRef.current.x + 15, mouseRef.current.y);
      ctx.moveTo(mouseRef.current.x, mouseRef.current.y - 15);
      ctx.lineTo(mouseRef.current.x, mouseRef.current.y - 5);
      ctx.moveTo(mouseRef.current.x, mouseRef.current.y + 5);
      ctx.lineTo(mouseRef.current.x, mouseRef.current.y + 15);
      ctx.stroke();
    } else if (gameState === 'playing') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ff5252';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('你被淘汰了', width / 2, height / 2 - 20);
      ctx.fillStyle = 'var(--text-secondary)';
      ctx.font = '18px sans-serif';
      ctx.fillText('等待游戏结束...', width / 2, height / 2 + 20);
    }
  };

  const drawPlayerInfo = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    name: string,
    health: number,
    maxHealth: number
  ) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, x, y);

    const barWidth = 36;
    const barHeight = 5;
    const barX = x - barWidth / 2;
    const barY = y + 4;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const healthPercent = health / maxHealth;
    const healthColor = healthPercent > 0.6 ? '#69f0ae' : healthPercent > 0.3 ? '#ffeb3b' : '#ff5252';
    ctx.fillStyle = healthColor;
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  };

  const handleStartGame = () => {
    socket.emit('startGame', (response: { success: boolean; error?: string }) => {
      if (!response.success) {
        alert(response.error || '开始游戏失败');
      }
    });
  };

  const handleReturnLobby = () => {
    socket.emit('returnToLobby');
  };

  const handleLeave = () => {
    socket.emit('leaveRoom', () => {
      onLeaveRoom();
    });
  };

  const myPlayer = players.find((p) => p.id === playerId);

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div style={styles.leftInfo}>
          <h2 style={styles.roomTitle}>房间：{players.length > 0 ? '竞技场' : '加载中...'}</h2>
          <span style={styles.playerCount}>{players.length}/4 人</span>
        </div>
        <div style={styles.centerInfo}>
          {gameState === 'waiting' && <span style={styles.statusText}>等待开始...</span>}
          {gameState === 'playing' && <span style={styles.statusText}>战斗中</span>}
          {gameState === 'ended' && <span style={styles.statusText}>游戏结束</span>}
        </div>
        <div style={styles.rightInfo}>
          {myPlayer && (
            <div style={styles.myStats}>
              <span style={styles.statLabel}>击杀：</span>
              <span style={styles.statValue}>{myPlayer.kills}</span>
            </div>
          )}
          <button onClick={handleLeave} style={styles.leaveButton}>
            离开
          </button>
        </div>
      </div>

      <div style={styles.gameArea}>
        <div style={styles.sidebarLeft}>
          <div style={styles.sidebarSection}>
            <h3 style={styles.sidebarTitle}>玩家列表</h3>
            <div style={styles.playerList}>
              {players.map((p) => (
                <div
                  key={p.id}
                  style={{
                    ...styles.playerItem,
                    ...(p.id === playerId ? styles.playerItemMe : {}),
                    ...(!p.isAlive && gameState === 'playing' ? styles.playerItemDead : {}),
                  }}
                >
                  <div style={styles.playerAvatar}>
                    <span style={styles.avatarText}>
                      {p.nickname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div style={styles.playerInfo}>
                    <div style={styles.playerName}>
                      {p.nickname}
                      {p.isHost && <span style={styles.hostBadge}>房主</span>}
                      {p.id === playerId && <span style={styles.meBadge}>我</span>}
                    </div>
                    {gameState !== 'waiting' && (
                      <div style={styles.playerHealth}>
                        {Array.from({ length: 3 }).map((_, i) => (
                          <span
                            key={i}
                            style={{
                              ...styles.heart,
                              ...(i < p.health ? styles.heartFull : styles.heartEmpty),
                            }}
                          >
                            ♥
                          </span>
                        ))}
                        <span style={styles.killsText}>击杀: {p.kills}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.canvasContainer}>
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            style={{
              ...styles.gameCanvas,
              cursor: gameState === 'playing' ? 'none' : 'default',
            }}
          />

          {hitFlash && <div style={styles.hitFlash} />}

          {gameState === 'waiting' && (
            <div style={styles.overlay}>
              <div style={styles.overlayContent}>
                <h2 style={styles.overlayTitle}>准备战斗</h2>
                <p style={styles.overlayDesc}>等待房主开始游戏</p>
                <p style={styles.playersReady}>
                  {players.length} 名玩家已就位
                </p>
                {isHost && (
                  <button
                    onClick={handleStartGame}
                    disabled={players.length < 2}
                    style={{
                      ...styles.startButton,
                      ...(players.length < 2 ? styles.startButtonDisabled : {}),
                    }}
                  >
                    {players.length < 2 ? '至少需要2名玩家' : '开始游戏'}
                  </button>
                )}
              </div>
            </div>
          )}

          {gameState === 'ended' && gameEndData && (
            <div style={styles.overlay}>
              <div style={styles.overlayContent}>
                <h2 style={styles.overlayTitle}>
                  {gameEndData.winnerId === playerId ? '🏆 胜利！' : '游戏结束'}
                </h2>
                <p style={styles.winnerName}>
                  获胜者：{gameEndData.winnerName}
                </p>
                <div style={styles.statsTable}>
                  <div style={styles.statsHeader}>
                    <span>玩家</span>
                    <span>击杀</span>
                    <span>状态</span>
                  </div>
                  {gameEndData.stats.map((stat) => (
                    <div
                      key={stat.playerId}
                      style={{
                        ...styles.statsRow,
                        ...(stat.playerId === playerId ? styles.statsRowMe : {}),
                      }}
                    >
                      <span>{stat.nickname}</span>
                      <span>{stat.kills}</span>
                      <span style={{ color: stat.survived ? 'var(--success)' : 'var(--danger)' }}>
                        {stat.survived ? '存活' : '淘汰'}
                      </span>
                    </div>
                  ))}
                </div>
                <button onClick={handleReturnLobby} style={styles.startButton}>
                  返回大厅
                </button>
              </div>
            </div>
          )}

          <div style={styles.killFeed}>
            {killFeed.map((entry) => (
              <div key={entry.id} style={styles.killEntry}>
                <span style={styles.killerName}>{entry.killer}</span>
                <span style={styles.killIcon}> ⚔ </span>
                <span style={styles.victimName}>{entry.victim}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.sidebarRight}>
          <div style={styles.sidebarSection}>
            <h3 style={styles.sidebarTitle}>操作说明</h3>
            <div style={styles.controlsList}>
              <div style={styles.controlItem}>
                <span style={styles.keyBadge}>W</span>
                <span style={styles.keyBadge}>A</span>
                <span style={styles.keyBadge}>S</span>
                <span style={styles.keyBadge}>D</span>
                <span style={styles.controlDesc}>移动</span>
              </div>
              <div style={styles.controlItem}>
                <span style={styles.keyBadge}>鼠标</span>
                <span style={styles.controlDesc}>瞄准</span>
              </div>
              <div style={styles.controlItem}>
                <span style={styles.keyBadge}>左键</span>
                <span style={styles.controlDesc}>射击</span>
              </div>
            </div>
          </div>

          <div style={styles.sidebarSection}>
            <h3 style={styles.sidebarTitle}>游戏规则</h3>
            <ul style={styles.rulesList}>
              <li>每人初始 3 点生命值</li>
              <li>被子弹击中扣 1 点生命</li>
              <li>生命归零即被淘汰</li>
              <li>最后存活的玩家获胜</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, var(--bg-primary) 0%, #0a1628 100%)',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: 'rgba(0, 0, 0, 0.4)',
    borderBottom: '1px solid var(--glass-border)',
    backdropFilter: 'blur(10px)',
  },
  leftInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  roomTitle: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  playerCount: {
    padding: '4px 12px',
    background: 'rgba(0, 229, 255, 0.15)',
    color: 'var(--accent-primary)',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  centerInfo: {
    flex: 1,
    textAlign: 'center',
  },
  statusText: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    letterSpacing: '2px',
  },
  rightInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  myStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  statLabel: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
  },
  statValue: {
    color: 'var(--accent-primary)',
    fontSize: '1.1rem',
    fontWeight: 700,
  },
  leaveButton: {
    padding: '8px 18px',
    borderRadius: '8px',
    background: 'rgba(255, 82, 82, 0.15)',
    color: '#ff5252',
    fontSize: '0.9rem',
    fontWeight: 600,
    border: '1px solid rgba(255, 82, 82, 0.3)',
    transition: 'all 0.2s ease',
  },
  gameArea: {
    flex: 1,
    display: 'flex',
    gap: '16px',
    padding: '16px',
    justifyContent: 'center',
  },
  sidebarLeft: {
    width: '220px',
    flexShrink: 0,
  },
  sidebarRight: {
    width: '220px',
    flexShrink: 0,
  },
  sidebarSection: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(10px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '16px',
  },
  sidebarTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--glass-border)',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  playerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.04)',
    transition: 'all 0.2s ease',
  },
  playerItemMe: {
    background: 'rgba(0, 229, 255, 0.1)',
    border: '1px solid rgba(0, 229, 255, 0.3)',
  },
  playerItemDead: {
    opacity: 0.5,
    filter: 'grayscale(0.5)',
  },
  playerAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: 'var(--bg-primary)',
    fontWeight: 700,
    fontSize: '0.9rem',
  },
  playerInfo: {
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    flexWrap: 'wrap',
  },
  hostBadge: {
    fontSize: '0.65rem',
    padding: '1px 5px',
    background: '#f39c12',
    color: '#fff',
    borderRadius: '4px',
    fontWeight: 700,
  },
  meBadge: {
    fontSize: '0.65rem',
    padding: '1px 5px',
    background: 'var(--accent-primary)',
    color: 'var(--bg-primary)',
    borderRadius: '4px',
    fontWeight: 700,
  },
  playerHealth: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  heart: {
    fontSize: '0.8rem',
  },
  heartFull: {
    color: '#ff5252',
  },
  heartEmpty: {
    color: 'rgba(255, 255, 255, 0.2)',
  },
  killsText: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  canvasContainer: {
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
  },
  gameCanvas: {
    display: 'block',
    border: '2px solid var(--glass-border)',
    borderRadius: '12px',
  },
  hitFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    boxShadow: 'inset 0 0 100px rgba(255, 0, 0, 0.6)',
    animation: 'hitFlash 0.2s ease',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 25, 35, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(5px)',
  },
  overlayContent: {
    textAlign: 'center',
    padding: '40px',
    background: 'var(--glass-bg)',
    borderRadius: '16px',
    border: '1px solid var(--glass-border)',
    minWidth: '350px',
  },
  overlayTitle: {
    fontSize: '2rem',
    fontWeight: 800,
    color: 'var(--accent-primary)',
    marginBottom: '10px',
    textShadow: '0 0 20px var(--accent-glow)',
  },
  overlayDesc: {
    color: 'var(--text-secondary)',
    fontSize: '1rem',
    marginBottom: '20px',
  },
  playersReady: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    marginBottom: '20px',
  },
  winnerName: {
    fontSize: '1.3rem',
    color: '#ffeb3b',
    fontWeight: 700,
    marginBottom: '20px',
  },
  startButton: {
    padding: '14px 40px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: 'var(--bg-primary)',
    fontSize: '1.1rem',
    fontWeight: 700,
    transition: 'all 0.2s ease',
    marginTop: '10px',
  },
  startButtonDisabled: {
    background: 'var(--text-muted)',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  statsTable: {
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '20px',
  },
  statsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid var(--glass-border)',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 12px',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  statsRowMe: {
    background: 'rgba(0, 229, 255, 0.1)',
  },
  controlsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  controlItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  keyBadge: {
    padding: '4px 10px',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'var(--text-primary)',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
    border: '1px solid var(--glass-border)',
    minWidth: '28px',
    textAlign: 'center',
  },
  controlDesc: {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    marginLeft: '4px',
  },
  rulesList: {
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    lineHeight: '1.8',
    paddingLeft: '18px',
  },
  killFeed: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    pointerEvents: 'none',
  },
  killEntry: {
    padding: '6px 14px',
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '6px',
    fontSize: '0.85rem',
    animation: 'fadeInUp 0.3s ease',
  },
  killerName: {
    color: 'var(--accent-primary)',
    fontWeight: 600,
  },
  killIcon: {
    color: 'var(--danger)',
  },
  victimName: {
    color: 'var(--danger)',
    fontWeight: 600,
  },
};
