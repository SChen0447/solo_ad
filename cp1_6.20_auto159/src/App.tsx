import { useEffect, useRef, useState, useCallback } from 'react';
import type { Planet, MineralRarity } from './planetEngine';
import { generatePlanet, getMineralName, getMineralColor } from './planetEngine';
import type { DrillingState, DrillLevel, FloatingText } from './drillLogic';
import {
  createDrillingState,
  startDrilling,
  updateDrilling,
  completeDrilling,
  createFloatingText,
  updateFloatingText,
  getDrillName,
  getDrillColor,
} from './drillLogic';
import type { RendererState } from './planetRenderer';
import {
  createRendererState,
  render,
  screenToCell,
  isPointInShip,
  updateStars,
  updateParticles,
  addParticles,
} from './planetRenderer';
import type { PlayerState } from './playerState';
import { createPlayerState, addMineral } from './playerState';
import { getNextUpgrade, canUpgrade, performUpgrade } from './upgradeSystem';
import type { TradePrices, PriceChange } from './tradeSystem';
import {
  createTradePrices,
  updatePrices,
  sellMineral,
  buyMineral,
  getMineralName as getTradeMineralName,
  getMineralColor as getTradeMineralColor,
  BASE_PRICES,
} from './tradeSystem';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 560;
const PLANET_COUNT = 3;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const planetRef = useRef<Planet | null>(null);
  const rendererRef = useRef<RendererState | null>(null);
  const drillingRef = useRef<DrillingState>(createDrillingState());
  const playerRef = useRef<PlayerState>(createPlayerState());
  const tradePricesRef = useRef<TradePrices>(createTradePrices());
  const lastPriceUpdateRef = useRef<number>(0);

  const [playerState, setPlayerState] = useState<PlayerState>(createPlayerState());
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('copper');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradePrices, setTradePrices] = useState<TradePrices>(createTradePrices());
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [goldBounce, setGoldBounce] = useState(false);
  const [currentPlanetId, setCurrentPlanetId] = useState(0);
  const [fps, setFps] = useState(60);

  const switchPlanet = useCallback((planetId: number) => {
    const planet = generatePlanet(planetId);
    planetRef.current = planet;
    setCurrentPlanetId(planetId);

    if (rendererRef.current) {
      rendererRef.current.fadeInTime = 0;
      rendererRef.current.shipX = CANVAS_WIDTH / 2;
      rendererRef.current.shipY = 80;
      drillingRef.current = createDrillingState();
    }
  }, []);

  const initGame = useCallback(() => {
    const planet = generatePlanet(0);
    planetRef.current = planet;

    const renderer = createRendererState(CANVAS_WIDTH, CANVAS_HEIGHT);
    renderer.shipX = CANVAS_WIDTH / 2;
    renderer.shipY = 80;
    rendererRef.current = renderer;

    playerRef.current = createPlayerState();
    setPlayerState({ ...playerRef.current });

    tradePricesRef.current = createTradePrices();
    setTradePrices({ ...tradePricesRef.current });
    lastPriceUpdateRef.current = performance.now();
  }, []);

  const handleDrillComplete = useCallback((cellX: number, cellY: number) => {
    const result = completeDrilling(drillingRef.current);
    if (result.rarity && result.amount > 0) {
      addMineral(playerRef.current, result.rarity, result.amount);
      setPlayerState({ ...playerRef.current });

      const renderer = rendererRef.current;
      if (renderer) {
        const planet = planetRef.current;
        if (planet) {
          const offsetX = (CANVAS_WIDTH - planet.gridSize * planet.cellSize) / 2;
          const offsetY = (CANVAS_HEIGHT - planet.gridSize * planet.cellSize) / 2;
          const cx = offsetX + cellX * planet.cellSize + planet.cellSize / 2;
          const cy = offsetY + cellY * planet.cellSize + planet.cellSize / 2;

          const ft = createFloatingText(
            cx,
            cy,
            `+${result.amount} ${getMineralName(result.rarity)}`,
            getMineralColor(result.rarity)
          );
          renderer.floatingTexts.push(ft);

          addParticles(renderer, cx, cy, getMineralColor(result.rarity), 15);
        }
      }
    }
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const planet = planetRef.current;
    const renderer = rendererRef.current;

    if (!canvas || !ctx || !planet || !renderer) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = timestamp;

    const currentFps = Math.round(1 / deltaTime);
    setFps(currentFps);

    if (renderer.fadeInTime < 500) {
      renderer.fadeInTime += deltaTime * 1000;
    }

    updateStars(renderer.stars, deltaTime);
    updateParticles(renderer, deltaTime);

    if (drillingRef.current.active) {
      const isComplete = updateDrilling(
        drillingRef.current,
        drillLevel,
        deltaTime
      );
      if (isComplete && drillingRef.current.cell) {
        handleDrillComplete(
          drillingRef.current.cell.x,
          drillingRef.current.cell.y
        );
      }
    }

    for (let i = renderer.floatingTexts.length - 1; i >= 0; i--) {
      const alive = updateFloatingText(renderer.floatingTexts[i], deltaTime);
      if (!alive) {
        renderer.floatingTexts.splice(i, 1);
      }
    }

    const priceResult = updatePrices(
      tradePricesRef.current,
      lastPriceUpdateRef.current,
      timestamp
    );
    if (priceResult.changes.length > 0) {
      tradePricesRef.current = priceResult.prices;
      setTradePrices({ ...priceResult.prices });
      lastPriceUpdateRef.current = timestamp;

      setPriceChanges((prev) => {
        const newChanges = [...prev, ...priceResult.changes];
        return newChanges.slice(-3);
      });

      setTimeout(() => {
        setPriceChanges((prev) =>
          prev.filter((c) => timestamp - c.timestamp < 2000)
        );
      }, 2000);
    }

    render(
      ctx,
      renderer,
      planet,
      drillingRef.current,
      drillLevel,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      timestamp
    );

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [drillLevel, handleDrillComplete]);

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const planet = planetRef.current;
      const renderer = rendererRef.current;
      if (!planet || !renderer) return;

      const { x, y } = getCanvasCoords(e);

      if (isPointInShip(x, y, renderer.shipX, renderer.shipY, renderer.shipSize, renderer.shipHovered)) {
        setShowTradeModal(true);
        return;
      }

      const cellPos = screenToCell(x, y, planet, CANVAS_WIDTH, CANVAS_HEIGHT);
      if (cellPos) {
        const cell = planet.cells[cellPos.y][cellPos.x];
        if (!cell.mined && !drillingRef.current.active) {
          startDrilling(drillingRef.current, cell);
        }
      }
    },
    [getCanvasCoords]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const planet = planetRef.current;
      const renderer = rendererRef.current;
      if (!planet || !renderer) return;

      const { x, y } = getCanvasCoords(e);

      const hoverShip = isPointInShip(
        x,
        y,
        renderer.shipX,
        renderer.shipY,
        renderer.shipSize,
        renderer.shipHovered
      );
      renderer.shipHovered = hoverShip;

      const cellPos = screenToCell(x, y, planet, CANVAS_WIDTH, CANVAS_HEIGHT);
      if (cellPos) {
        const cell = planet.cells[cellPos.y][cellPos.x];
        if (!cell.mined) {
          renderer.hoveredCell = cellPos;
        } else {
          renderer.hoveredCell = null;
        }
      } else {
        renderer.hoveredCell = null;
      }
    },
    [getCanvasCoords]
  );

  const handleCanvasMouseLeave = useCallback(() => {
    const renderer = rendererRef.current;
    if (renderer) {
      renderer.hoveredCell = null;
      renderer.shipHovered = false;
    }
  }, []);

  const handleUpgrade = useCallback(() => {
    const success = performUpgrade(playerRef.current);
    if (success) {
      setDrillLevel(playerRef.current.drillLevel);
      setPlayerState({ ...playerRef.current });

      const renderer = rendererRef.current;
      if (renderer) {
        addParticles(
          renderer,
          renderer.shipX,
          renderer.shipY,
          getDrillColor(playerRef.current.drillLevel),
          20
        );
      }

      setGoldBounce(true);
      setTimeout(() => setGoldBounce(false), 300);
    }
  }, []);

  const handleSell = useCallback((rarity: MineralRarity, amount: number) => {
    const result = sellMineral(
      playerRef.current,
      tradePricesRef.current,
      rarity,
      amount
    );
    if (result.success) {
      setPlayerState({ ...playerRef.current });
      setGoldBounce(true);
      setTimeout(() => setGoldBounce(false), 300);
    }
  }, []);

  const handleBuy = useCallback((rarity: MineralRarity, amount: number) => {
    const result = buyMineral(
      playerRef.current,
      tradePricesRef.current,
      rarity,
      amount
    );
    if (result.success) {
      setPlayerState({ ...playerRef.current });
    }
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [gameLoop]);

  const nextUpgrade = getNextUpgrade(drillLevel);
  const canDoUpgrade = nextUpgrade ? canUpgrade(drillLevel, playerState.inventory) : false;

  const rarities: MineralRarity[] = ['common', 'rare', 'legendary'];

  return (
    <div className="game-container">
      <div className="game-header">
        <div className="game-title">🚀 宇宙矿工</div>
        <div className="player-stats">
          <div className="stat-item">
            <span className="stat-label">💰 金币:</span>
            <span className={`gold-value ${goldBounce ? 'bounce' : ''}`}>
              {playerState.gold}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">⛏️ 钻头:</span>
            <span
              className="stat-value"
              style={{ color: getDrillColor(drillLevel) }}
            >
              {getDrillName(drillLevel)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">FPS:</span>
            <span className="stat-value">{fps}</span>
          </div>
        </div>
      </div>

      <div className="game-main">
        <div className="game-canvas-container">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="game-canvas"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
          />
        </div>

        <div className="sidebar">
          <div className="panel">
            <div className="panel-title">🌍 星球选择</div>
            <div className="current-planet">
              当前: <span>{planetRef.current?.name || '加载中...'}</span>
            </div>
            <div className="planet-selector">
              {Array.from({ length: PLANET_COUNT }, (_, i) => (
                <button
                  key={i}
                  className={`planet-btn ${currentPlanetId === i ? 'active' : ''}`}
                  onClick={() => switchPlanet(i)}
                >
                  星球 {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">🎒 背包</div>
            <div className="inventory-list">
              {rarities.map((rarity) => (
                <div key={rarity} className="inventory-item">
                  <div className="inventory-item-name">
                    <div
                      className="mineral-dot"
                      style={{
                        backgroundColor: getTradeMineralColor(rarity),
                        color: getTradeMineralColor(rarity),
                      }}
                    />
                    <span>{getTradeMineralName(rarity)}</span>
                  </div>
                  <span className="inventory-item-count">
                    {playerState.inventory[rarity]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">⬆️ 钻头升级</div>
            <div className="drill-info">
              <div
                className="drill-icon"
                style={{
                  backgroundColor: getDrillColor(drillLevel),
                  color: '#000',
                }}
              >
                {getDrillName(drillLevel)}
              </div>
              <div>
                <div style={{ fontWeight: 'bold' }}>
                  {getDrillName(drillLevel)}
                </div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>
                  当前等级
                </div>
              </div>
            </div>
            {nextUpgrade ? (
              <>
                <button
                  className="btn"
                  onClick={handleUpgrade}
                  disabled={!canDoUpgrade}
                >
                  升级到 {getDrillName(nextUpgrade.to)}
                </button>
                <div className="upgrade-cost">
                  需要 {nextUpgrade.cost.amount} 个
                  {getTradeMineralName(nextUpgrade.cost.mineral)}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: '#FFD700' }}>
                ✨ 已达最高等级
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-title">🏪 交易站</div>
            <button className="btn btn-gold" onClick={() => setShowTradeModal(true)}>
              打开交易站
            </button>
            <div className="upgrade-cost">点击飞船也可打开</div>
          </div>
        </div>
      </div>

      {showTradeModal && (
        <div className="trade-modal-overlay" onClick={() => setShowTradeModal(false)}>
          <div className="trade-modal" onClick={(e) => e.stopPropagation()}>
            <div className="trade-modal-header">
              <div className="trade-modal-title">🏪 宇宙交易站</div>
              <button className="close-btn" onClick={() => setShowTradeModal(false)}>
                ✕
              </button>
            </div>

            <div className="merchant-info">
              <div className="merchant-avatar">👽</div>
              <div>
                <div className="merchant-name">星际商人 扎尔格</div>
                <div className="merchant-title">专业收购各类矿石</div>
              </div>
            </div>

            <div className="trade-list" style={{ marginTop: '16px' }}>
              {rarities.map((rarity) => {
                const change = priceChanges.find((c) => c.rarity === rarity);
                return (
                  <div key={rarity} className="trade-item">
                    <div className="trade-item-info">
                      <div className="trade-item-name">
                        <div
                          className="mineral-dot"
                          style={{
                            backgroundColor: getTradeMineralColor(rarity),
                            color: getTradeMineralColor(rarity),
                          }}
                        />
                        {getTradeMineralName(rarity)}
                        <span style={{ fontSize: '12px', color: '#aaa' }}>
                          (拥有: {playerState.inventory[rarity]})
                        </span>
                      </div>
                      <div className="trade-item-price">
                        💰 {tradePrices[rarity]}
                        {change && (
                          <span
                            className={`price-change-indicator ${change.type}`}
                          >
                            {change.type === 'up' ? '↑' : '↓'}
                            {change.amount}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="trade-item-actions">
                      <button
                        className="trade-btn sell"
                        onClick={() => handleSell(rarity, 1)}
                        disabled={playerState.inventory[rarity] < 1}
                      >
                        卖出 1
                      </button>
                      <button
                        className="trade-btn buy"
                        onClick={() => handleBuy(rarity, 1)}
                        disabled={playerState.gold < tradePrices[rarity]}
                      >
                        买入 1
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="trade-modal-footer">
              <div>
                <span style={{ color: '#aaa' }}>你的金币: </span>
                <span
                  className="gold-value"
                  style={{ fontSize: '20px' }}
                >
                  {playerState.gold}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#aaa' }}>
                价格每5秒波动一次
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
