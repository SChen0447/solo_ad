import Phaser from 'phaser';
import { StoryScene, STORY_SCENE_KEY } from './scenes/StoryScene';
import { InventoryScene, INVENTORY_SCENE_KEY } from './scenes/InventoryScene';

const BASE_WIDTH = 1600;
const BASE_HEIGHT = 900;
const ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT;

function calculateGameSize(): { width: number; height: number; scale: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const windowRatio = w / h;

  let width: number;
  let height: number;

  if (windowRatio > ASPECT_RATIO) {
    height = h;
    width = Math.round(h * ASPECT_RATIO);
  } else {
    width = w;
    height = Math.round(w / ASPECT_RATIO);
  }

  const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);

  return { width, height, scale };
}

function createGame(): void {
  const { width, height } = calculateGameSize();

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'app',
    backgroundColor: '#0f0f23',
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
    },
    scene: [StoryScene, InventoryScene],
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    },
    input: {
      activePointers: 3,
    },
    dom: {
      createContainer: false,
    },
    fps: {
      target: 60,
      forceSetTimeOut: false,
    },
    powerPreference: 'high-performance',
    banner: false,
  };

  const game = new Phaser.Game(config);

  game.events.once(Phaser.Core.Events.READY, () => {
    game.scene.start(STORY_SCENE_KEY);
    game.scene.launch(INVENTORY_SCENE_KEY);
    game.scene.bringToTop(INVENTORY_SCENE_KEY);
  });

  let resizeTimeout: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimeout !== null) {
      window.clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(() => {
      game.scale.resize(window.innerWidth, window.innerHeight);
    }, 100);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.pause();
    } else {
      game.resume();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createGame);
} else {
  createGame();
}
