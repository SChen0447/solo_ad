import { ToolType, ToolState } from './tools';

export interface UIHandlers {
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onRecordToggle: () => void;
  onPlayToggle: () => void;
  onSpeedChange: (speed: number) => void;
}

const toolIcons: Record<ToolType, string> = {
  brush: '✏️',
  eraser: '🧹',
  select: '▭',
  line: '╱',
  text: 'T',
};

const toolLabels: Record<ToolType, string> = {
  brush: '画笔',
  eraser: '橡皮擦',
  select: '选区',
  line: '直线',
  text: '文字',
};

export function initUI(
  toolbarEl: HTMLElement,
  colorWheelEl: HTMLCanvasElement,
  brightnessSliderEl: HTMLInputElement,
  brushSizeSliderEl: HTMLInputElement,
  brushPreviewEl: HTMLElement,
  recordBtnEl: HTMLButtonElement,
  playBtnEl: HTMLButtonElement,
  speedSelectEl: HTMLSelectElement,
  progressFillEl: HTMLElement,
  progressBarWrapperEl: HTMLElement,
  canvasContainerEl: HTMLElement,
  handlers: UIHandlers,
  initialState: ToolState
) {
  let currentTool: ToolType = 'brush';
  let currentColor = initialState.color;
  let baseHue = 0;
  let baseSat = 0;
  let brightness = initialState.brightness;

  const tools: ToolType[] = ['brush', 'eraser', 'select', 'line', 'text'];

  tools.forEach((tool) => {
    const btn = document.createElement('button');
    btn.className = 'tool-btn';
    btn.dataset.tool = tool;
    btn.title = toolLabels[tool];
    btn.textContent = toolIcons[tool];

    if (tool === currentTool) {
      btn.classList.add('active');
    }

    btn.addEventListener('click', () => {
      currentTool = tool;
      document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      if (tool === 'eraser') {
        canvasContainerEl.classList.add('eraser-mode');
      } else {
        canvasContainerEl.classList.remove('eraser-mode');
      }

      handlers.onToolChange(tool);
    });

    toolbarEl.appendChild(btn);
  });

  updateActiveToolIndicator(currentColor);

  initColorWheel(colorWheelEl, (hue: number, sat: number) => {
    baseHue = hue;
    baseSat = sat;
    currentColor = hsvToHex(hue, sat, brightness);
    handlers.onColorChange(currentColor);
    updateBrushPreview(brushPreviewEl, initialState.brushSize, currentColor);
    updateActiveToolIndicator(currentColor);
    updateProgressFillColor(currentColor, progressFillEl);
  });

  brightnessSliderEl.value = String(brightness * 100);
  brightnessSliderEl.addEventListener('input', () => {
    brightness = Number(brightnessSliderEl.value) / 100;
    currentColor = hsvToHex(baseHue, baseSat, brightness);
    handlers.onColorChange(currentColor);
    updateBrushPreview(brushPreviewEl, initialState.brushSize, currentColor);
    updateActiveToolIndicator(currentColor);
    updateProgressFillColor(currentColor, progressFillEl);
  });

  brushSizeSliderEl.value = String(initialState.brushSize);
  updateBrushPreview(brushPreviewEl, initialState.brushSize, currentColor);

  brushSizeSliderEl.addEventListener('input', () => {
    const size = Number(brushSizeSliderEl.value);
    handlers.onBrushSizeChange(size);
    updateBrushPreview(brushPreviewEl, size, currentColor);
  });

  recordBtnEl.addEventListener('click', () => {
    handlers.onRecordToggle();
  });

  playBtnEl.addEventListener('click', () => {
    handlers.onPlayToggle();
  });

  speedSelectEl.addEventListener('change', () => {
    handlers.onSpeedChange(Number(speedSelectEl.value));
  });

  return {
    updateRecordButton: (isRecording: boolean) => {
      if (isRecording) {
        recordBtnEl.classList.add('recording');
        recordBtnEl.title = '停止录制';
      } else {
        recordBtnEl.classList.remove('recording');
        recordBtnEl.title = '录制';
      }
    },
    updatePlayButton: (canPlay: boolean, isPlaying: boolean) => {
      playBtnEl.disabled = !canPlay;
      playBtnEl.title = isPlaying ? '停止回放' : '回放';
    },
    updateProgress: (progress: number) => {
      progressFillEl.style.width = `${progress * 100}%`;
    },
    showProgressBar: (show: boolean) => {
      if (show) {
        progressBarWrapperEl.classList.add('visible');
      } else {
        progressBarWrapperEl.classList.remove('visible');
      }
    },
    getCurrentColor: () => currentColor,
  };
}

function updateBrushPreview(el: HTMLElement, size: number, color: string) {
  el.innerHTML = '';
  const circle = document.createElement('div');
  circle.className = 'brush-preview-circle';
  circle.style.width = `${size}px`;
  circle.style.height = `${size}px`;
  circle.style.background = color;
  el.appendChild(circle);
}

function updateActiveToolIndicator(color: string) {
  const activeBtn = document.querySelector('.tool-btn.active');
  if (activeBtn) {
    const style = document.createElement('style');
    style.textContent = `
      .tool-btn.active::after {
        background: ${color} !important;
      }
    `;
    const existingStyle = document.getElementById('tool-indicator-style');
    if (existingStyle) existingStyle.remove();
    style.id = 'tool-indicator-style';
    document.head.appendChild(style);
  }
}

function updateProgressFillColor(color: string, fillEl: HTMLElement) {
  const lighter = lightenColor(color, 40);
  fillEl.style.background = `linear-gradient(to right, ${color}, ${lighter})`;
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

function initColorWheel(canvas: HTMLCanvasElement, onChange: (hue: number, sat: number) => void) {
  const ctx = canvas.getContext('2d')!;
  const size = canvas.width;
  const center = size / 2;
  const radius = size / 2 - 5;

  for (let angle = 0; angle < 360; angle += 0.5) {
    const startAngle = ((angle - 0.5) * Math.PI) / 180;
    const endAngle = ((angle + 0.5) * Math.PI) / 180;

    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
    gradient.addColorStop(0, `hsl(${angle}, 0%, 100%)`);
    gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  let isDragging = false;

  const getColorAt = (x: number, y: number) => {
    const dx = x - center;
    const dy = y - center;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) return null;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    const sat = Math.min(100, (dist / radius) * 100);

    return { hue: angle, sat };
  };

  const handleDown = (e: PointerEvent) => {
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const color = getColorAt(x, y);
    if (color) {
      onChange(color.hue, color.sat);
    }
  };

  const handleMove = (e: PointerEvent) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const color = getColorAt(x, y);
    if (color) {
      onChange(color.hue, color.sat);
    }
  };

  const handleUp = () => {
    isDragging = false;
  };

  canvas.addEventListener('pointerdown', handleDown);
  canvas.addEventListener('pointermove', handleMove);
  canvas.addEventListener('pointerup', handleUp);
  canvas.addEventListener('pointerleave', handleUp);

  onChange(0, 0);
}

function hsvToHex(h: number, s: number, v: number): string {
  const sat = s / 100;
  const val = v;
  const c = val * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = val - c;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);

  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}
