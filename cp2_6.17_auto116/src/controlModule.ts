import { GUI } from 'dat.gui';
import type { Molecule, AppState, DisplayMode } from './eventBus';
import { eventBus } from './eventBus';

let gui: GUI | null = null;
let currentState: AppState;

const BACKGROUND_COLORS: Record<string, string> = {
  '深蓝': '#0a0a2e',
  '纯黑': '#000000',
  '浅灰': '#e0e0e0',
  '天蓝': '#87ceeb',
  '暗绿': '#1a3a1a'
};

const DISPLAY_MODES: Record<string, DisplayMode> = {
  '实心填充': 'solid',
  '透明框架': 'wireframe'
};

function throttle(func: (value: number) => void, delay: number): (value: number) => void {
  let lastCall = 0;
  return function (value: number) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(value);
    }
  };
}

export function initControlPanel(
  moleculeList: Molecule[],
  initialState: AppState
): void {
  if (gui) {
    gui.destroy();
  }

  currentState = { ...initialState };

  const container = document.createElement('div');
  container.id = 'control-panel';
  container.className = 'control-panel';
  document.body.appendChild(container);

  const title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = '分子可视化控制';
  container.appendChild(title);

  gui = new GUI({ autoPlace: false, width: 240 });
  container.appendChild(gui.domElement);

  const moleculeOptions: Record<string, string> = {};
  moleculeList.forEach((mol) => {
    moleculeOptions[`${mol.name} ${mol.formula}`] = mol.id;
  });

  const moleculeFolder = gui.addFolder('分子选择');
  moleculeFolder.open();

  const moleculeController = moleculeFolder.add(
    { molecule: currentState.currentMoleculeId },
    'molecule',
    moleculeOptions
  );
  moleculeController.name('选择分子');
  moleculeController.onChange((value: string) => {
    currentState.currentMoleculeId = value;
    eventBus.emit('molecule:change', value);
  });

  const paramsFolder = gui.addFolder('显示参数');
  paramsFolder.open();

  const atomScaleController = paramsFolder.add(
    { atomScale: currentState.atomScale },
    'atomScale',
    0.5,
    2.0,
    0.01
  );
  atomScaleController.name('原子半径缩放');
  atomScaleController.onChange(
    throttle((value: number) => {
      currentState.atomScale = value;
      eventBus.emit('atomScale:change', value);
    }, 16)
  );

  const cameraDistanceController = paramsFolder.add(
    { cameraDistance: currentState.cameraDistance },
    'cameraDistance',
    5,
    20,
    0.1
  );
  cameraDistanceController.name('相机距离');
  cameraDistanceController.onChange(
    throttle((value: number) => {
      currentState.cameraDistance = value;
      eventBus.emit('cameraDistance:change', value);
    }, 16)
  );

  const backgroundColorController = paramsFolder.add(
    { backgroundColor: '深蓝' },
    'backgroundColor',
    Object.keys(BACKGROUND_COLORS)
  );
  backgroundColorController.name('背景颜色');
  backgroundColorController.onChange((value: string) => {
    const color = BACKGROUND_COLORS[value] || '#0a0a2e';
    currentState.backgroundColor = color;
    eventBus.emit('backgroundColor:change', color);
  });

  const displayModeController = paramsFolder.add(
    { displayMode: '实心填充' },
    'displayMode',
    Object.keys(DISPLAY_MODES)
  );
  displayModeController.name('显示模式');
  displayModeController.onChange((value: string) => {
    const mode = DISPLAY_MODES[value] || 'solid';
    currentState.displayMode = mode;
    eventBus.emit('displayMode:change', mode);
  });

  const mobileToggle = document.createElement('button');
  mobileToggle.className = 'mobile-toggle';
  mobileToggle.innerHTML = '⚙️';
  mobileToggle.addEventListener('click', () => {
    container.classList.toggle('expanded');
  });
  document.body.appendChild(mobileToggle);

  applyCustomStyles();
}

export function updateControlState(state: Partial<AppState>): void {
  currentState = { ...currentState, ...state };

  if (!gui) return;

  const controllers = gui.controllersRecursive();
  controllers.forEach((controller) => {
    if (controller.property === 'molecule' && state.currentMoleculeId) {
      controller.setValue(state.currentMoleculeId);
    }
    if (controller.property === 'atomScale' && state.atomScale !== undefined) {
      controller.setValue(state.atomScale);
    }
    if (controller.property === 'cameraDistance' && state.cameraDistance !== undefined) {
      controller.setValue(state.cameraDistance);
    }
  });
}

function applyCustomStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    .dg.ac {
      z-index: 100 !important;
    }
    .dg .c {
      background-color: transparent !important;
    }
    .dg .cr {
      border-left: 3px solid transparent !important;
      transition: border-color 0.2s ease !important;
    }
    .dg .cr:hover {
      border-left-color: #6c63ff !important;
    }
    .dg .property-name {
      color: #e0e0e0 !important;
      font-family: sans-serif !important;
      font-size: 13px !important;
    }
    .dg .slider {
      background-color: #3a3a5c !important;
      border-radius: 4px !important;
      height: 6px !important;
      margin-top: 6px !important;
    }
    .dg .slider-fg {
      background-color: #6c63ff !important;
      border-radius: 4px !important;
      height: 6px !important;
    }
    .dg .has-slider input[type="text"] {
      color: #e0e0e0 !important;
      background-color: #2a2a4a !important;
    }
    .dg select {
      background-color: #2a2a4a !important;
      color: #ffffff !important;
      border: none !important;
      border-radius: 4px !important;
      padding: 4px 8px !important;
      cursor: pointer !important;
    }
    .dg select:focus {
      outline: 2px solid #6c63ff !important;
    }
    .dg select option {
      background-color: #2a2a4a !important;
      color: #ffffff !important;
    }
    .dg .folder {
      background-color: transparent !important;
    }
    .dg li.title {
      background-color: rgba(108, 99, 255, 0.2) !important;
      color: #e0e0e0 !important;
      font-family: sans-serif !important;
      font-size: 13px !important;
      margin: 0 !important;
    }
    .dg.close-button {
      display: none !important;
    }
    .dg .c .slider:hover .slider-fg {
      background-color: #8b83ff !important;
      transition: background-color 0.2s ease !important;
    }
    .dg.main {
      width: 100% !important;
    }
  `;
  document.head.appendChild(style);
}
