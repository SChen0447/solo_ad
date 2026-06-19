import {
  createGrid,
  getCell,
  fillCellRandom,
  refillCellRandom,
  getEmptyCellsByBfsLayers,
  generateRowByRowFillData,
  countFilledCells,
  setCell,
  clearGrid,
  getGridSize,
  getRandomEmoji
} from './grid';
import { Renderer, THEMES, type Theme, type ToolMode } from './renderer';

const GRID_SIZE = 20;
const MIN_FILL_RATE = 50;
const MAX_FRAME_TIME = 100;

let grid = createGrid(GRID_SIZE);
let currentMode: ToolMode = 'brush';
let currentThemeIndex = 0;
let isAnimating = false;

let renderer: Renderer;
let gridContainer: HTMLElement;
let brushBtn: HTMLElement;
let fillBtn: HTMLElement;
let fillAllBtn: HTMLElement;
let clearBtn: HTMLElement;
let themeButtons: HTMLElement[] = [];
let infoBar: HTMLElement;
let filledCountEl: HTMLElement;
let modeIndicator: HTMLElement;
let progressFill: HTMLElement;

function initApp(): void {
  gridContainer = document.getElementById('grid-container')!;
  brushBtn = document.getElementById('brush-btn')!;
  fillBtn = document.getElementById('fill-btn')!;
  fillAllBtn = document.getElementById('fill-all-btn')!;
  clearBtn = document.getElementById('clear-btn')!;
  infoBar = document.getElementById('info-bar')!;
  filledCountEl = document.getElementById('filled-count')!;
  modeIndicator = document.getElementById('mode-indicator')!;
  progressFill = document.getElementById('progress-fill')!;

  const themeContainer = document.getElementById('theme-selector')!;
  THEMES.forEach((theme, index) => {
    const btn = document.createElement('button');
    btn.className = 'theme-btn';
    btn.dataset.themeIndex = String(index);
    btn.title = theme.name;
    
    const preview = document.createElement('div');
    preview.className = 'theme-preview';
    preview.style.backgroundColor = theme.backgroundColor;
    preview.style.border = `2px solid ${theme.borderColor}`;
    
    btn.appendChild(preview);
    btn.addEventListener('click', () => switchTheme(index));
    themeContainer.appendChild(btn);
    themeButtons.push(btn);
  });

  const initialTheme = THEMES[currentThemeIndex];
  renderer = new Renderer(gridContainer, GRID_SIZE, initialTheme);
  renderer.createGridElement();
  renderer.addCellClickListener(handleCellClick);

  brushBtn.addEventListener('click', () => setMode('brush'));
  fillBtn.addEventListener('click', () => setMode('fill'));
  fillAllBtn.addEventListener('click', handleFillAll);
  clearBtn.addEventListener('click', handleClear);

  setMode('brush');
  updateThemeButtons();
  updateInfo();
  
  window.addEventListener('resize', handleResize);
  handleResize();
}

function setMode(mode: ToolMode): void {
  currentMode = mode;
  renderer.setCursor(mode);

  if (mode === 'brush') {
    brushBtn.classList.add('active');
    fillBtn.classList.remove('active');
    modeIndicator.textContent = '画笔模式';
  } else {
    brushBtn.classList.remove('active');
    fillBtn.classList.add('active');
    modeIndicator.textContent = '填充模式';
  }
}

function handleCellClick(row: number, col: number): void {
  if (isAnimating) return;

  const cell = getCell(grid, row, col);
  if (!cell) return;

  if (currentMode === 'brush') {
    handleBrushClick(row, col);
  } else {
    handleFillClick(row, col);
  }
}

function handleBrushClick(row: number, col: number): void {
  const cell = getCell(grid, row, col);
  if (!cell) return;

  if (cell.emoji === null) {
    const emoji = fillCellRandom(grid, row, col);
    renderer.animateFill(row, col, emoji);
  } else {
    const newEmoji = refillCellRandom(grid, row, col);
    renderer.animateRotateAndReplace(row, col, newEmoji);
  }
  
  updateInfo();
}

function handleFillClick(row: number, col: number): void {
  const cell = getCell(grid, row, col);
  if (!cell) return;

  if (cell.emoji !== null) {
    const newEmoji = refillCellRandom(grid, row, col);
    renderer.animateRotateAndReplace(row, col, newEmoji);
    updateInfo();
    return;
  }

  const layers = getEmptyCellsByBfsLayers(grid, row, col);
  if (layers.length === 0) return;

  const emoji = getRandomEmoji();

  let totalCells = 0;
  layers.forEach(layer => {
    layer.forEach(({ row: r, col: c }) => {
      setCell(grid, r, c, emoji);
      totalCells++;
    });
  });

  console.log(`[填充模式] 开始填充: ${totalCells} 个格子, ${layers.length} 层`);
  
  isAnimating = true;
  const fillStartTime = performance.now();
  
  renderer.animateFloodFill(layers, emoji, 60).then((perf) => {
    isAnimating = false;
    updateInfo();
    
    const totalDuration = performance.now() - fillStartTime;
    const actualRate = (totalCells / totalDuration) * 1000;
    
    console.log(`[填充模式] 完成: ${perf.cellCount} 个格子`);
    console.log(`  - 总耗时: ${totalDuration.toFixed(2)}ms`);
    console.log(`  - 填充速率: ${actualRate.toFixed(2)} 格/秒`);
    
    if (actualRate < MIN_FILL_RATE) {
      console.warn(`⚠️ 填充速率低于 ${MIN_FILL_RATE} 格/秒的最低要求! 当前: ${actualRate.toFixed(2)} 格/秒`);
    }
    
    if (totalDuration > MAX_FRAME_TIME && totalCells > 50) {
      console.warn(`⚠️ 单次填充耗时超过 ${MAX_FRAME_TIME}ms! 当前: ${totalDuration.toFixed(2)}ms`);
    }
  });
}

function handleFillAll(): void {
  if (isAnimating) return;

  const rows = generateRowByRowFillData(grid);
  if (rows.length === 0) return;

  let totalCells = 0;
  rows.forEach(row => {
    row.forEach(({ row: r, col: c, emoji }) => {
      setCell(grid, r, c, emoji);
      totalCells++;
    });
  });

  console.log(`[全随机填充] 开始填充: ${totalCells} 个格子, ${rows.length} 行`);

  isAnimating = true;
  const fillStartTime = performance.now();
  
  renderer.animateRowByRowFill(rows, 80).then((perf) => {
    isAnimating = false;
    updateInfo();
    
    const totalDuration = performance.now() - fillStartTime;
    const actualRate = (totalCells / totalDuration) * 1000;
    
    console.log(`[全随机填充] 完成: ${totalCells} 个格子`);
    console.log(`  - 总耗时: ${totalDuration.toFixed(2)}ms`);
    console.log(`  - 填充速率: ${actualRate.toFixed(2)} 格/秒`);
    console.log(`  - 行数: ${rows.length}`);
    
    if (actualRate < MIN_FILL_RATE) {
      console.warn(`⚠️ 填充速率低于 ${MIN_FILL_RATE} 格/秒的最低要求! 当前: ${actualRate.toFixed(2)} 格/秒`);
    }
    
    if (totalDuration > MAX_FRAME_TIME && totalCells > 50) {
      console.warn(`⚠️ 单次填充耗时超过 ${MAX_FRAME_TIME}ms! 当前: ${totalDuration.toFixed(2)}ms`);
    }
  });
}

function handleClear(): void {
  if (isAnimating) return;
  
  clearGrid(grid);
  renderer.renderGrid(grid);
  updateInfo();
}

function switchTheme(index: number): void {
  if (index < 0 || index >= THEMES.length) return;
  
  currentThemeIndex = index;
  const theme = THEMES[index];
  renderer.applyTheme(theme);
  updateThemeButtons();
}

function updateThemeButtons(): void {
  themeButtons.forEach((btn, index) => {
    if (index === currentThemeIndex) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function updateInfo(): void {
  const { rows, cols } = getGridSize(grid);
  const total = rows * cols;
  const filled = countFilledCells(grid);
  const percentage = Math.round((filled / total) * 100);
  
  filledCountEl.textContent = `${filled} / ${total} (${percentage}%)`;
  progressFill.style.width = `${percentage}%`;
}

function handleResize(): void {
  const viewportWidth = window.innerWidth;
  const toolbar = document.getElementById('toolbar')!;
  const mainContent = document.querySelector('.main-content') as HTMLElement;

  if (viewportWidth <= 420) {
    toolbar.classList.add('mobile-horizontal');
    mainContent.classList.add('mobile-layout');
  } else {
    toolbar.classList.remove('mobile-horizontal');
    mainContent.classList.remove('mobile-layout');
  }
}

document.addEventListener('DOMContentLoaded', initApp);
