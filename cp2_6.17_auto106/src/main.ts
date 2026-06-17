import { initGame, handleKeyDown, resetGame, startGame, stopGame, setOnScoreChange, setOnTimeChange, setOnGameOver, forceRender } from './game';
import { initEditor, refreshEditor } from './editor';
import { initMap, loadLevel, getCurrentLevelIndex, getLevelCount } from './mazeData';

let gameCanvas: HTMLCanvasElement;
let editorCanvas: HTMLCanvasElement;
let levelDisplay: HTMLElement;
let scoreDisplay: HTMLElement;
let timerDisplay: HTMLElement;
let gameOverOverlay: HTMLElement;
let finalTimeDisplay: HTMLElement;
let finalScoreDisplay: HTMLElement;
let editorSection: HTMLElement;
let editorToggleBtn: HTMLElement;
let resetBtn: HTMLElement;
let nextLevelBtn: HTMLElement;
let levelButtons: NodeListOf<HTMLElement>;

let isEditorMode = false;

function init(): void {
  gameCanvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  editorCanvas = document.getElementById('editorCanvas') as HTMLCanvasElement;
  levelDisplay = document.getElementById('levelDisplay')!;
  scoreDisplay = document.getElementById('scoreDisplay')!;
  timerDisplay = document.getElementById('timerDisplay')!;
  gameOverOverlay = document.getElementById('gameOverOverlay')!;
  finalTimeDisplay = document.getElementById('finalTime')!;
  finalScoreDisplay = document.getElementById('finalScore')!;
  editorSection = document.getElementById('editorSection')!;
  editorToggleBtn = document.getElementById('editorToggleBtn')!;
  resetBtn = document.getElementById('resetBtn')!;
  nextLevelBtn = document.getElementById('nextLevelBtn')!;
  levelButtons = document.querySelectorAll('.level-btn');

  initMap();
  initGame(gameCanvas);
  initEditor(editorCanvas);

  setOnScoreChange((score) => {
    scoreDisplay.textContent = score.toString();
  });

  setOnTimeChange((time) => {
    timerDisplay.textContent = time.toFixed(2) + 's';
  });

  setOnGameOver((time, score) => {
    finalTimeDisplay.textContent = time.toFixed(2) + 's';
    finalScoreDisplay.textContent = score.toString();
    gameOverOverlay.classList.add('show');
  });

  bindEvents();
  updateLevelDisplay();
  startGame();
}

function bindEvents(): void {
  document.addEventListener('keydown', handleKeyDown);

  editorToggleBtn.addEventListener('click', toggleEditorMode);

  resetBtn.addEventListener('click', () => {
    resetGame();
    gameOverOverlay.classList.remove('show');
    forceRender();
  });

  nextLevelBtn.addEventListener('click', goToNextLevel);

  levelButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const levelIndex = parseInt(target.dataset.level || '0', 10);
      switchLevel(levelIndex);
    });
  });
}

function toggleEditorMode(): void {
  isEditorMode = !isEditorMode;
  if (isEditorMode) {
    editorSection.classList.add('show');
    editorToggleBtn.classList.add('active');
    editorToggleBtn.textContent = '返回游戏';
    refreshEditor();
  } else {
    editorSection.classList.remove('show');
    editorToggleBtn.classList.remove('active');
    editorToggleBtn.textContent = '编辑器模式';
    resetGame();
    gameOverOverlay.classList.remove('show');
    forceRender();
  }
}

function switchLevel(levelIndex: number): void {
  loadLevel(levelIndex);
  resetGame();
  gameOverOverlay.classList.remove('show');
  updateLevelDisplay();
  refreshEditor();
  forceRender();

  levelButtons.forEach((btn) => {
    btn.classList.remove('active');
    if (parseInt(btn.dataset.level || '0', 10) === levelIndex) {
      btn.classList.add('active');
    }
  });
}

function goToNextLevel(): void {
  const currentIndex = getCurrentLevelIndex();
  const levelCount = getLevelCount();
  const nextIndex = (currentIndex + 1) % levelCount;
  switchLevel(nextIndex);
}

function updateLevelDisplay(): void {
  const currentLevel = getCurrentLevelIndex() + 1;
  levelDisplay.textContent = currentLevel.toString();
}

document.addEventListener('DOMContentLoaded', init);

window.addEventListener('beforeunload', () => {
  stopGame();
});
