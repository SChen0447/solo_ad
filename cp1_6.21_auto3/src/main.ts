import Phaser from 'phaser';
import { GameScene } from './game/GameScene';
import { InputHandler } from './input/InputHandler';
import { UpgradeManager } from './upgrade/UpgradeManager';
import { HUD } from './ui/HUD';

const gameContainer = document.getElementById('game-container')!;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: gameContainer,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a0a2e',
  scene: [GameScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
};

const inputHandler = new InputHandler(gameContainer);
const upgradeManager = new UpgradeManager();
const hud = new HUD(upgradeManager);

const game = new Phaser.Game(config);

game.scene.start('GameScene', {
  inputHandler,
  upgradeManager,
  hud,
});

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
