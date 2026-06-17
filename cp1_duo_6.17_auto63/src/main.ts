/**
 * main.ts - 游戏主入口
 *
 * 职责：组装各模块，建立调用关系
 *
 * 调用关系图：
 *   ┌──────────────┐   updateHUD   ┌──────────────┐
 *   │  GameScene   │──────────────▶│  HUDPanel.ts │ (DOM渲染)
 *   │ (Phaser)     │◀──────────────│              │ (虚拟方向键/重玩按钮)
 *   └──────┬───────┘   direction   └──────┬───────┘
 *          │                              │
 *          │ fetchMaze / localGen         │ showResult
 *          ▼                              ▼
 *   ┌──────────────┐             ┌──────────────────┐
 *   │ MazeService  │             │  ScoreManager    │
 *   │              │◀────────────│  (计时/金币/提交) │
 *   └──────┬───────┘   BFS寻路   └────────┬─────────┘
 *          │                              │
 *          │ HTTP GET                     │ POST / GET
 *          ▼                              ▼
 *   ╔═════════════════════════════════════════════╗
 *   ║       Flask  backend/app.py                 ║
 *   ║  /maze/seed  |  /scores  |  Socket.IO       ║
 *   ╚═════════════════════════════════════════════╝
 */

import Phaser from 'phaser';
import { GameScene } from './core/GameScene';
import { HUDPanel } from './ui/HUDPanel';
import { ScoreManager } from './api/ScoreManager';

const scoreMgr = new ScoreManager();
let gameScene: GameScene | null = null;
let phaserGame: Phaser.Game | null = null;

const hud = new HUDPanel({
  onStart: (playerName: string) => {
    scoreMgr.setPlayerName(playerName);
    startGame(playerName);
  },
  onRestart: () => {
    startGame(scoreMgr.getPlayerName());
  },
  onDirection: (dir, pressed) => {
    if (gameScene) gameScene.setDirection(dir, pressed);
  },
});

function buildPhaserConfig(): Phaser.Types.Core.GameConfig {
  const isMobile = window.innerWidth < 768;
  return {
    type: Phaser.AUTO,
    parent: document.body,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 'transparent',
    transparent: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    },
    fps: {
      target: 60,
      min: 30,
      forceSetTimeOut: false,
    },
  };
}

function startGame(playerName: string) {
  if (!phaserGame) {
    gameScene = new GameScene(
      {
        onUpdateTime: (ms) => hud.updateTime(ms),
        onUpdateCoins: (c) => hud.updateCoins(c),
        onUpdateRank: (r) => hud.updateRank(r),
        onUpdatePlayers: (n) => hud.updatePlayers(n),
        onSetTotalCoins: (total) => hud.setTotalCoins(total),
        onShowResult: (finished, timeMs, coins, submitResult) =>
          hud.showResult(finished, timeMs, coins, submitResult),
      },
      scoreMgr
    );

    const config = buildPhaserConfig();
    (config as any).scene = [gameScene];
    phaserGame = new Phaser.Game(config);
  }

  setTimeout(() => {
    if (gameScene) gameScene.initNewGame(playerName);
  }, 120);
}

window.addEventListener('resize', () => {
  if (phaserGame) {
    phaserGame.scale.resize(window.innerWidth, window.innerHeight);
  }
});

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && phaserGame) {
    phaserGame.scale.resize(window.innerWidth, window.innerHeight);
  }
});
