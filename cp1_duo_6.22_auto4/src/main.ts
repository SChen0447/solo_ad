import { SceneManager } from './scene/sceneManager';
import { UIPanel } from './ui/panel';

function init(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const canvas = document.createElement('canvas');
  app.appendChild(canvas);

  const sceneManager = new SceneManager(canvas);
  const uiPanel = new UIPanel(app, sceneManager);

  sceneManager.setOnStatsUpdate((stats) => {
    uiPanel.updateStats(stats);
  });

  sceneManager.setOnLogUpdate((logs) => {
    uiPanel.updateLogs(logs);
  });

  sceneManager.setOnGameOver((winner) => {
    const stats = sceneManager.getStats();
    uiPanel.showGameOver(winner, stats);
  });

  uiPanel.initDefaultShips();
  sceneManager.start();

  const initialStats = sceneManager.getStats();
  uiPanel.updateStats(initialStats);
  uiPanel.updateLogs(sceneManager.getLogs());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
