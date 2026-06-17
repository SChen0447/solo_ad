import Phaser from 'phaser';
import { StarmapScene } from './scenes/StarmapScene';
import { BattleScene } from './scenes/BattleScene';
import { commandPanel } from './ui/CommandPanel';
import { fleetManager } from './data/FleetManager';

const container = document.getElementById('game-container');
const w = container ? container.clientWidth : 800;
const h = container ? container.clientHeight : 600;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: w,
  height: h,
  parent: 'game-container',
  backgroundColor: '#0a0a2a',
  scene: [StarmapScene, BattleScene],
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
    pixelArt: false,
    antialias: true,
  },
};

const game = new Phaser.Game(config);

commandPanel.setOnShipSelect((id: string | null) => {
  const scene = game.scene.getScene('StarmapScene') as StarmapScene;
  if (scene) {
    scene.setSelectedShipId(id);
  }
});

fleetManager.onChange(() => {
  commandPanel.renderFleetList();
});

commandPanel.renderFleetList();
commandPanel.renderCommandPanel();

window.addEventListener('resize', () => {
  game.scale.resize(
    container ? container.clientWidth : 800,
    container ? container.clientHeight : 600
  );
});

export { game };
