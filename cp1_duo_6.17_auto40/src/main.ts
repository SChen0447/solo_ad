import Phaser from 'phaser';
import { StarmapScene } from './scenes/StarmapScene';
import { BattleScene } from './scenes/BattleScene';
import { fleetManager } from './data/FleetManager';
import { commandPanel } from './ui/CommandPanel';

let game: Phaser.Game | null = null;

function initGame(): void {
  const container = document.getElementById('panel-center')!;

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: container,
    width: container.clientWidth,
    height: container.clientHeight,
    backgroundColor: '#0a0a2a',
    scene: [StarmapScene, BattleScene],
    pixelArt: false,
    transparent: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER
    },
    fps: {
      target: 60,
      min: 30,
      forceSetTimeOut: false
    },
    render: {
      antialias: true,
      antialiasGL: true
    }
  };

  game = new Phaser.Game(config);
}

function setupUI(): void {
  const startScreen = document.getElementById('start-screen')!;
  const gameContainer = document.getElementById('game-container')!;
  const startBtn = document.getElementById('start-btn')!;

  startBtn.addEventListener('click', async () => {
    startScreen.classList.add('hidden');
    gameContainer.classList.add('active');

    await fleetManager.initFleet();
    initGame();

    setTimeout(() => {
      commandPanel.render();
      if (game) {
        game.scale.resize(
          document.getElementById('panel-center')!.clientWidth,
          document.getElementById('panel-center')!.clientHeight
        );
      }
    }, 100);
  });

  const toggleLeft = document.getElementById('toggle-left')!;
  const toggleRight = document.getElementById('toggle-right')!;
  const panelLeft = document.getElementById('panel-left')!;
  const panelRight = document.getElementById('panel-right')!;

  toggleLeft.addEventListener('click', () => {
    panelLeft.classList.toggle('open');
  });

  toggleRight.addEventListener('click', () => {
    panelRight.classList.toggle('open');
  });

  window.addEventListener('resize', () => {
    if (game) {
      setTimeout(() => {
        game!.scale.resize(
          document.getElementById('panel-center')!.clientWidth,
          document.getElementById('panel-center')!.clientHeight
        );
      }, 50);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupUI();
});

export { game };
