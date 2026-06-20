import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LevelEditor, GRID_SIZE, CELL_SIZE, type Tower, type LevelConfig } from './levelEditor';
import { GameEngine, type GameState, type Enemy } from './gameEngine';

const MAP_SIZE = 700;
const GRID_PIXEL_SIZE = GRID_SIZE * CELL_SIZE;
const SCALE = MAP_SIZE / GRID_PIXEL_SIZE;

interface TowerInfo {
  tower: Tower;
  targetName: string | null;
}

const GameApp: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelEditorRef = useRef<LevelEditor>(new LevelEditor());
  const gameEngineRef = useRef<GameEngine>(new GameEngine());
  const animationFrameRef = useRef<number | null>(null);
  const rotationRef = useRef<number>(0);

  const [gameMode, setGameMode] = useState<'edit' | 'battle'>('edit');
  const [editMode, setEditMode] = useState<'path' | 'tower'>('path');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTower, setSelectedTower] = useState<TowerInfo | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<'victory' | 'defeat' | null>(null);
  const [levelId, setLevelId] = useState<string | null>(null);
  const [loadLevelId, setLoadLevelId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  }, []);

  useEffect(() => {
    const engine = gameEngineRef.current;

    const handleStateUpdate = (state: GameState) => {
      setGameState({ ...state });
    };

    const handleGameOver = () => {
      setGameResult('defeat');
      setShowGameOver(true);
    };

    const handleVictory = () => {
      setGameResult('victory');
      setShowGameOver(true);
    };

    engine.on('stateUpdate', handleStateUpdate);
    engine.on('gameOver', handleGameOver);
    engine.on('victory', handleVictory);

    return () => {
      engine.off('stateUpdate', handleStateUpdate);
      engine.off('gameOver', handleGameOver);
      engine.off('victory', handleVictory);
    };
  }, []);

  useEffect(() => {
    if (gameMode !== 'battle') return;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawBackground(ctx);
      drawGrid(ctx);
      drawPath(ctx);

      if (gameState) {
        drawTowers(ctx, gameState.towers);
        drawEnemies(ctx, gameState.enemies);
        drawTowerRanges(ctx, gameState.towers);
      }

      rotationRef.current += 0.02;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameMode, gameState]);

  useEffect(() => {
    if (gameMode !== 'edit') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawBackground(ctx);
    drawGrid(ctx);
    drawPath(ctx);
    drawTowerSlots(ctx);
    drawEditTowers(ctx);
  }, [gameMode, editMode]);

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;

    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * CELL_SIZE * SCALE;
      
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, MAP_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(MAP_SIZE, pos);
      ctx.stroke();
    }
  };

  const drawPath = (ctx: CanvasRenderingContext2D) => {
    const editor = levelEditorRef.current;
    const cellPixel = CELL_SIZE * SCALE;
    const padding = cellPixel * 0.1;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (editor.grid[y][x] === 'path') {
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.roundRect(
            x * cellPixel + padding,
            y * cellPixel + padding,
            cellPixel - padding * 2,
            cellPixel - padding * 2,
            4
          );
          ctx.fill();
        }
      }
    }
  };

  const drawTowerSlots = (ctx: CanvasRenderingContext2D) => {
    const editor = levelEditorRef.current;
    const cellPixel = CELL_SIZE * SCALE;
    const padding = cellPixel * 0.1;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (editor.grid[y][x] === 'tower_slot') {
          const tower = editor.getTowerAt(x, y);
          if (!tower) {
            ctx.fillStyle = '#065f46';
            ctx.beginPath();
            ctx.roundRect(
              x * cellPixel + padding,
              y * cellPixel + padding,
              cellPixel - padding * 2,
              cellPixel - padding * 2,
              4
            );
            ctx.fill();
          }
        }
      }
    }
  };

  const drawEditTowers = (ctx: CanvasRenderingContext2D) => {
    const editor = levelEditorRef.current;
    const cellPixel = CELL_SIZE * SCALE;

    editor.towers.forEach(tower => {
      const centerX = (tower.position.x + 0.5) * cellPixel;
      const centerY = (tower.position.y + 0.5) * cellPixel;
      const towerSize = 16 * SCALE;

      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(
        centerX - towerSize / 2,
        centerY - towerSize / 2,
        towerSize,
        towerSize
      );

      ctx.save();
      ctx.translate(centerX, centerY - towerSize / 2);
      ctx.rotate(rotationRef.current);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, tower.range * cellPixel, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  };

  const drawTowers = (ctx: CanvasRenderingContext2D, towers: Tower[]) => {
    const cellPixel = CELL_SIZE * SCALE;

    towers.forEach(tower => {
      const centerX = (tower.position.x + 0.5) * cellPixel;
      const centerY = (tower.position.y + 0.5) * cellPixel;
      const towerSize = 16 * SCALE;

      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(
        centerX - towerSize / 2,
        centerY - towerSize / 2,
        towerSize,
        towerSize
      );

      ctx.save();
      ctx.translate(centerX, centerY - towerSize / 2);
      ctx.rotate(rotationRef.current);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, tower.range * cellPixel, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  };

  const drawTowerRanges = (ctx: CanvasRenderingContext2D, towers: Tower[]) => {
    if (!selectedTower) return;
    
    const cellPixel = CELL_SIZE * SCALE;
    const tower = selectedTower.tower;
    const centerX = (tower.position.x + 0.5) * cellPixel;
    const centerY = (tower.position.y + 0.5) * cellPixel;

    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, tower.range * cellPixel, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawEnemies = (ctx: CanvasRenderingContext2D, enemies: Enemy[]) => {
    const cellPixel = CELL_SIZE * SCALE;
    const enemySize = 12 * SCALE;

    enemies.forEach(enemy => {
      enemy.trail.forEach((pos, index) => {
        const alpha = 0.3 * (1 - index / enemy.trail.length);
        ctx.fillStyle = `rgba(220, 38, 38, ${alpha})`;
        ctx.beginPath();
        ctx.arc(
          (pos.x + 0.5) * cellPixel,
          (pos.y + 0.5) * cellPixel,
          enemySize / 2 * (1 - index / enemy.trail.length * 0.5),
          0,
          Math.PI * 2
        );
        ctx.fill();
      });

      const centerX = (enemy.position.x + 0.5) * cellPixel;
      const centerY = (enemy.position.y + 0.5) * cellPixel;

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(centerX, centerY, enemySize / 2, 0, Math.PI * 2);
      ctx.fill();

      const healthRatio = enemy.health / enemy.maxHealth;
      const barWidth = 20 * SCALE;
      const barHeight = 3 * SCALE;
      const barX = centerX - barWidth / 2;
      const barY = centerY - enemySize / 2 - 6 * SCALE;

      ctx.fillStyle = '#334155';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      ctx.fillStyle = healthRatio > 0.5 ? '#22c55e' : healthRatio > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (CELL_SIZE * SCALE));
    const y = Math.floor((e.clientY - rect.top) / (CELL_SIZE * SCALE));

    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    if (gameMode === 'edit') {
      const editor = levelEditorRef.current;
      
      if (editMode === 'tower' && editor.grid[y][x] === 'tower_slot') {
        const existingTower = editor.getTowerAt(x, y);
        if (existingTower) {
          editor.removeTower(existingTower.id);
        } else {
          editor.placeTower(x, y);
        }
      } else {
        editor.toggleCell(x, y);
      }

      const canvas2 = canvasRef.current;
      if (canvas2) {
        const ctx = canvas2.getContext('2d');
        if (ctx) {
          drawBackground(ctx);
          drawGrid(ctx);
          drawPath(ctx);
          drawTowerSlots(ctx);
          drawEditTowers(ctx);
        }
      }
    } else if (gameMode === 'battle' && gameState) {
      const engine = gameEngineRef.current;
      const tower = engine.getTowerById(
        gameState.towers.find(t => t.position.x === x && t.position.y === y)?.id || ''
      );
      
      if (tower) {
        const target = tower.targetId ? engine.getEnemyById(tower.targetId) : null;
        setSelectedTower({
          tower,
          targetName: target ? `敌人 ${target.id.slice(-4)}` : null
        });
      } else {
        setSelectedTower(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameMode !== 'edit') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (CELL_SIZE * SCALE));
    const y = Math.floor((e.clientY - rect.top) / (CELL_SIZE * SCALE));

    drawBackground(ctx);
    drawGrid(ctx);
    drawPath(ctx);
    drawTowerSlots(ctx);
    drawEditTowers(ctx);

    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      const editor = levelEditorRef.current;
      if (editMode === 'tower' && editor.grid[y][x] === 'tower_slot' && !editor.getTowerAt(x, y)) {
        const cellPixel = CELL_SIZE * SCALE;
        const padding = cellPixel * 0.1;
        
        ctx.save();
        ctx.translate(
          x * cellPixel + cellPixel / 2,
          y * cellPixel + cellPixel / 2
        );
        ctx.scale(1.1, 1.1);
        ctx.fillStyle = '#047857';
        ctx.beginPath();
        ctx.roundRect(
          -cellPixel / 2 + padding,
          -cellPixel / 2 + padding,
          cellPixel - padding * 2,
          cellPixel - padding * 2,
          4
        );
        ctx.fill();
        ctx.restore();
      }
    }
  };

  const handleSaveLevel = async () => {
    const editor = levelEditorRef.current;
    const config = editor.exportConfig();
    
    if (config.path.length < 2) {
      showMessage('请至少绘制2个格子的路径！');
      return;
    }

    try {
      const id = await editor.saveLevel('My Level');
      setLevelId(id);
      showMessage(`关卡已保存！ID: ${id}`);
    } catch (error) {
      showMessage('保存关卡失败，请确保后端服务已启动');
    }
  };

  const handleLoadLevel = async () => {
    if (!loadLevelId.trim()) {
      showMessage('请输入关卡ID');
      return;
    }

    try {
      await levelEditorRef.current.loadLevel(loadLevelId.trim());
      showMessage('关卡加载成功！');
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawBackground(ctx);
          drawGrid(ctx);
          drawPath(ctx);
          drawTowerSlots(ctx);
          drawEditTowers(ctx);
        }
      }
    } catch (error) {
      showMessage('加载关卡失败，请检查ID是否正确');
    }
  };

  const handleStartBattle = () => {
    const editor = levelEditorRef.current;
    const config = editor.exportConfig();
    
    if (config.path.length < 2) {
      showMessage('请至少绘制2个格子的路径！');
      return;
    }

    if (config.towers.length === 0) {
      showMessage('请至少放置一个防御塔！');
      return;
    }

    gameEngineRef.current.loadLevel(config);
    setGameMode('battle');
    setSelectedTower(null);
    setGameState(null);
  };

  const handleStart = () => {
    try {
      gameEngineRef.current.start();
    } catch (error) {
      showMessage('启动失败：' + (error as Error).message);
    }
  };

  const handlePause = () => {
    const engine = gameEngineRef.current;
    if (engine.state.isPaused) {
      engine.resume();
    } else {
      engine.pause();
    }
  };

  const handleRestart = () => {
    setShowGameOver(false);
    setGameResult(null);
    gameEngineRef.current.reset();
    setGameState(null);
  };

  const handleBackToEdit = () => {
    gameEngineRef.current.stop();
    setGameMode('edit');
    setShowGameOver(false);
    setGameResult(null);
    setSelectedTower(null);
    setGameState(null);
  };

  const handleClear = () => {
    levelEditorRef.current.clear();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawBackground(ctx);
        drawGrid(ctx);
      }
    }
    setLevelId(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{
        textAlign: 'center',
        marginBottom: '20px',
        color: '#f8fafc',
        fontSize: '28px'
      }}>
        塔防关卡编辑器与战斗模拟
      </h1>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#1e293b',
              padding: '12px 24px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 1000
            }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{
        display: 'flex',
        gap: '20px',
        justifyContent: 'center',
        alignItems: 'flex-start',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {gameMode === 'edit' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setEditMode('path')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: editMode === 'path' ? '#3b82f6' : '#334155',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    if (editMode !== 'path') {
                      e.currentTarget.style.backgroundColor = '#475569';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (editMode !== 'path') {
                      e.currentTarget.style.backgroundColor = '#334155';
                    }
                  }}
                >
                  绘制路径
                </button>
                <button
                  onClick={() => setEditMode('tower')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: editMode === 'tower' ? '#3b82f6' : '#334155',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    if (editMode !== 'tower') {
                      e.currentTarget.style.backgroundColor = '#475569';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (editMode !== 'tower') {
                      e.currentTarget.style.backgroundColor = '#334155';
                    }
                  }}
                >
                  放置塔位
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveLevel}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#16a34a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#22c55e';
                  }}
                >
                  保存关卡
                </button>
                <button
                  onClick={handleClear}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ef4444';
                  }}
                >
                  清空
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={loadLevelId}
                  onChange={(e) => setLoadLevelId(e.target.value)}
                  placeholder="输入关卡ID"
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={handleLoadLevel}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }}
                >
                  加载
                </button>
              </div>

              <button
                onClick={handleStartBattle}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#d97706';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f59e0b';
                }}
              >
                开始战斗 →
              </button>
            </motion.div>
          )}

          {levelId && gameMode === 'edit' && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#1e293b',
              borderRadius: '8px',
              fontSize: '13px'
            }}>
              当前关卡ID: <span style={{ color: '#fbbf24' }}>{levelId}</span>
            </div>
          )}

          <div style={{
            position: 'relative',
            boxShadow: '0 0 12px rgba(59,130,246,0.2)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <canvas
              ref={canvasRef}
              width={MAP_SIZE}
              height={MAP_SIZE}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              style={{
                display: 'block',
                cursor: gameMode === 'edit' ? 'pointer' : 'default'
              }}
            />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            width: '280px',
            backgroundColor: '#0f172a',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {gameMode === 'edit' && (
            <div style={{
              padding: '16px',
              backgroundColor: '#1e293b',
              borderRadius: '12px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#f8fafc' }}>
                编辑说明
              </h3>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '13px',
                lineHeight: '1.8',
                color: '#94a3b8'
              }}>
                <li>路径模式：点击格子添加/移除路径</li>
                <li>塔位模式：点击格子添加/移除塔位</li>
                <li>点击塔位放置/移除防御塔</li>
                <li>路径需从左侧开始向右延伸</li>
                <li>至少需要2格路径和1个塔</li>
              </ul>
            </div>
          )}

          {gameMode === 'battle' && (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '18px',
                  color: '#f8fafc',
                  marginBottom: '12px'
                }}>
                  波次: {gameState ? gameState.currentWave + 1 : 1} / {gameState?.totalWaves || 5}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                    fontSize: '14px'
                  }}>
                    <span>生命值</span>
                    <span style={{ color: '#ef4444' }}>{gameState?.health || 20} / {gameState?.maxHealth || 20}</span>
                  </div>
                  <div style={{
                    height: '12px',
                    backgroundColor: '#334155',
                    borderRadius: '6px',
                    overflow: 'hidden'
                  }}>
                    <motion.div
                      animate={{
                        width: `${gameState ? (gameState.health / gameState.maxHealth) * 100 : 100}%`
                      }}
                      transition={{ duration: 0.3 }}
                      style={{
                        height: '100%',
                        backgroundColor: '#ef4444'
                      }}
                    />
                  </div>
                </div>

                <div style={{
                  fontSize: '24px',
                  color: '#fbbf24',
                  fontWeight: 'bold',
                  marginBottom: '20px'
                }}>
                  💰 {gameState?.gold || 0}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {!gameState?.isRunning ? (
                    <button
                      onClick={handleStart}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#3b82f6';
                      }}
                    >
                      开始
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: gameState?.isPaused ? '#22c55e' : '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = gameState?.isPaused ? '#16a34a' : '#d97706';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = gameState?.isPaused ? '#22c55e' : '#f59e0b';
                      }}
                    >
                      {gameState?.isPaused ? '继续' : '暂停'}
                    </button>
                  )}
                  <button
                    onClick={handleBackToEdit}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#334155',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#475569';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#334155';
                    }}
                  >
                    ← 返回
                  </button>
                </div>

                <div style={{
                  fontSize: '13px',
                  color: '#94a3b8',
                  marginBottom: '8px'
                }}>
                  敌人数量: {gameState?.enemies.length || 0}
                </div>
              </div>

              <AnimatePresence>
                {selectedTower && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      backgroundColor: '#334155',
                      borderRadius: '12px',
                      padding: '16px'
                    }}
                  >
                    <h4 style={{
                      margin: '0 0 12px 0',
                      color: '#f8fafc',
                      fontSize: '15px'
                    }}>
                      🗼 防御塔信息
                    </h4>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      fontSize: '13px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>攻击力</span>
                        <span style={{ color: '#ef4444' }}>{selectedTower.tower.damage}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>射程</span>
                        <span style={{ color: '#3b82f6' }}>{selectedTower.tower.range} 格</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>攻速</span>
                        <span style={{ color: '#22c55e' }}>{selectedTower.tower.attackSpeed}s</span>
                      </div>
                      <div style={{
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid #475569',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ color: '#94a3b8' }}>当前目标</span>
                        <span style={{ color: selectedTower.targetName ? '#fbbf24' : '#64748b' }}>
                          {selectedTower.targetName || '无'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          <div style={{
            padding: '12px',
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            fontSize: '12px',
            color: '#64748b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#475569', borderRadius: '2px' }}></div>
              <span>路径</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#065f46', borderRadius: '2px' }}></div>
              <span>塔位</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6' }}></div>
              <span>防御塔</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#dc2626', borderRadius: '50%' }}></div>
              <span>敌人</span>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showGameOver && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.4, type: 'spring' }}
              style={{
                width: '400px',
                backgroundColor: '#1e293b',
                borderRadius: '24px',
                padding: '32px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                {gameResult === 'victory' ? '🏆' : '💀'}
              </div>
              <h2 style={{
                margin: '0 0 8px 0',
                color: gameResult === 'victory' ? '#22c55e' : '#ef4444',
                fontSize: '28px'
              }}>
                {gameResult === 'victory' ? '胜利！' : '失败...'}
              </h2>
              <p style={{
                margin: '0 0 24px 0',
                color: '#94a3b8',
                fontSize: '14px'
              }}>
                {gameResult === 'victory' 
                  ? `恭喜你成功抵御了所有波次的进攻！获得 ${gameState?.gold || 0} 金币`
                  : '你的基地被敌人攻陷了，再接再厉！'
                }
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={handleRestart}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }}
                >
                  重新开始
                </button>
                <button
                  onClick={handleBackToEdit}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#334155',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#475569';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#334155';
                  }}
                >
                  返回编辑
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameApp;
