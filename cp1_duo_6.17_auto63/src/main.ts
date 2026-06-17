/**
 * main.ts - 游戏主入口
 *
 * 职责：组装各模块，建立调用关系
 *
 * 调用关系图：
 *   ┌──────────────┐   EventEmitter   ┌──────────────┐
 *   │  GameScene   │─────────────────▶│  HUDPanel.ts │ (DOM渲染)
 *   │ (Phaser)     │◀─────────────────│              │ (虚拟方向键/重玩按钮)
 *   └──────┬───────┘   setDirection   └──────┬───────┘
 *          │ fetchMaze + validate            │ showResult
 *          ▼                                 ▼
 *   ┌──────────────┐             ┌──────────────────┐
 *   │ MazeService  │             │  ScoreManager    │
 *   │ 带重试/校验  │◀────────────│ 计时/金币/提交   │
 *   └──────┬───────┘   BFS寻路   └────────┬─────────┘
 *          │                              │
 *          │ HTTP GET (AppConfig)        │ HTTP POST/GET (AppConfig)
 *          ▼                              ▼
 *   ╔═════════════════════════════════════════════╗
 *   ║       Flask  backend/app.py                 ║
 *   ║  /maze/seed  |  /scores  |  Socket.IO       ║
 *   ╚═════════════════════════════════════════════╝
 *
 * 所有配置集中在 src/config/AppConfig.ts，从Vite环境变量读取
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

function wireSceneEvents(scene: GameScene) {
  scene.onEvent('set:totalCoins', (total: number) => hud.setTotalCoins(total));
  scene.onEvent('update:time', (ms: number) => hud.updateTime(ms));
  scene.onEvent('update:coins', (count: number) => hud.updateCoins(count));
  scene.onEvent('update:rank', (rank: number | string) => hud.updateRank(rank));
  scene.onEvent('update:players', (count: number) => hud.updatePlayers(count));
  scene.onEvent(
    'show:result',
    (finished: boolean, timeMs: number, coins: number, submitResult: any) => {
      hud.showResult(finished, timeMs, coins, submitResult);
    }
  );

  scoreMgr.on('update', (ms: number, coins: number) => {
    hud.updateTime(ms);
    hud.updateCoins(coins);
  });
}

function startGame(playerName: string) {
  if (!phaserGame) {
    gameScene = new GameScene(scoreMgr);
    wireSceneEvents(gameScene);

    const config = buildPhaserConfig();
    (config as any).scene = [gameScene];
    phaserGame = new Phaser.Game(config);

    phaserGame.events.once('ready', () => {
      setTimeout(() => gameScene?.initNewGame(playerName), 80);
    });
  } else {
    setTimeout(() => gameScene?.initNewGame(playerName), 80);
  }
}

window.addEventListener('resize', () => {
  if (phaserGame) {
    phaserGame.scale.resize(window.innerWidth, window.innerHeight);
  }
});

window.addEventListener('keydown', (e) => {
  if (
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) &&
    (e.target as HTMLElement)?.tagName !== 'INPUT'
  ) {
    e.preventDefault();
  }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && phaserGame) {
    phaserGame.scale.resize(window.innerWidth, window.innerHeight);
  }
});
