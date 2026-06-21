import * as THREE from 'three';
import { StructureType, StructureParams } from './structures';

export type ControlChangeCallback = (type: StructureType, params: StructureParams) => void;
export type GeodesicCallback = (point: { u: number; v: number }) => void;

const STYLE_ID = 'non-euclid-controls-style';

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ne-nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 48px;
      background: rgba(16, 18, 22, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      backdrop-filter: blur(10px);
      gap: 0;
    }

    .ne-nav-btn {
      width: 120px;
      height: 36px;
      border: none;
      background: transparent;
      color: #8888A0;
      font-size: 14px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: 0.5px;
    }

    .ne-nav-btn.active {
      background: linear-gradient(135deg, #6C63FF, #A78BFA);
      color: #fff;
    }

    .ne-nav-btn:hover:not(.active) {
      background: rgba(255, 255, 255, 0.05);
      color: #aaaacc;
    }

    .ne-nav-sep {
      width: 1px;
      height: 24px;
      background: #2A2A38;
    }

    .ne-panel {
      position: fixed;
      top: 64px;
      left: 16px;
      width: 260px;
      background: rgba(20, 22, 28, 0.85);
      border: 4px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      padding: 20px 16px;
      z-index: 90;
      backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ne-panel-title {
      color: #ccccdd;
      font-size: 13px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 4px;
    }

    .ne-control-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ne-control-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #9999aa;
      font-size: 12px;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    .ne-control-value {
      color: #A78BFA;
      font-weight: 600;
      font-size: 12px;
    }

    .ne-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 160px;
      height: 4px;
      background: #333340;
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    }

    .ne-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .ne-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
      box-shadow: 0 0 6px 2px #FFB347;
    }

    .ne-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      border: none;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .ne-slider::-moz-range-thumb:hover {
      transform: scale(1.2);
      box-shadow: 0 0 6px 2px #FFB347;
    }

    .ne-hint {
      color: #666677;
      font-size: 11px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      line-height: 1.5;
      margin-top: 8px;
      border-top: 1px solid rgba(255,255,255,0.06);
      padding-top: 10px;
    }
  `;
  document.head.appendChild(style);
}

export interface ControlsHandle {
  getType(): StructureType;
  getParams(): StructureParams;
  onChange(cb: ControlChangeCallback): void;
  onGeodesicSelect(cb: GeodesicCallback): void;
}

export function createControls(
  initialType: StructureType,
  initialParams: StructureParams
): ControlsHandle {
  injectStyles();

  let currentType = initialType;
  let currentParams = { ...initialParams };
  const changeCallbacks: ControlChangeCallback[] = [];
  const geodesicCallbacks: GeodesicCallback[] = [];

  const nav = document.createElement('div');
  nav.className = 'ne-nav';

  const types: { key: StructureType; label: string }[] = [
    { key: 'mobius', label: '莫比乌斯带' },
    { key: 'klein', label: '克莱因瓶' },
    { key: 'hyperbolic', label: '双曲镶嵌' },
  ];

  types.forEach((item, idx) => {
    if (idx > 0) {
      const sep = document.createElement('div');
      sep.className = 'ne-nav-sep';
      nav.appendChild(sep);
    }
    const btn = document.createElement('button');
    btn.className = 'ne-nav-btn' + (item.key === currentType ? ' active' : '');
    btn.textContent = item.label;
    btn.dataset.type = item.key;
    btn.addEventListener('click', () => {
      currentType = item.key;
      nav.querySelectorAll('.ne-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      notifyChange();
    });
    nav.appendChild(btn);
  });

  document.body.appendChild(nav);

  const panel = document.createElement('div');
  panel.className = 'ne-panel';

  const title = document.createElement('div');
  title.className = 'ne-panel-title';
  title.textContent = '参数控制';
  panel.appendChild(title);

  interface SliderConfig {
    id: string;
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
    paramKey: keyof StructureParams;
    format: (v: number) => string;
  }

  const sliderConfigs: SliderConfig[] = [
    {
      id: 'twist',
      label: '扭曲度',
      min: 1,
      max: 5,
      step: 1,
      value: currentParams.twist,
      paramKey: 'twist',
      format: v => v.toString(),
    },
    {
      id: 'density',
      label: '填充密度',
      min: 16,
      max: 128,
      step: 1,
      value: currentParams.density,
      paramKey: 'density',
      format: v => v.toString(),
    },
    {
      id: 'curvature',
      label: '曲率半径',
      min: 0.5,
      max: 2,
      step: 0.01,
      value: currentParams.curvature,
      paramKey: 'curvature',
      format: v => v.toFixed(2),
    },
  ];

  sliderConfigs.forEach(config => {
    const group = document.createElement('div');
    group.className = 'ne-control-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'ne-control-label';

    const labelText = document.createElement('span');
    labelText.textContent = config.label;

    const valueText = document.createElement('span');
    valueText.className = 'ne-control-value';
    valueText.textContent = config.format(config.value);

    labelRow.appendChild(labelText);
    labelRow.appendChild(valueText);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'ne-slider';
    slider.min = config.min.toString();
    slider.max = config.max.toString();
    slider.step = config.step.toString();
    slider.value = config.value.toString();
    slider.dataset.paramKey = config.paramKey;

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      currentParams[config.paramKey] = val;
      valueText.textContent = config.format(val);
      notifyChange();
    });

    group.appendChild(labelRow);
    group.appendChild(slider);
    panel.appendChild(group);
  });

  const hint = document.createElement('div');
  hint.className = 'ne-hint';
  hint.textContent = '点击结构上的点可显示测地线路径（红色发光线，1秒后淡出）';
  panel.appendChild(hint);

  document.body.appendChild(panel);

  function notifyChange(): void {
    changeCallbacks.forEach(cb => cb(currentType, { ...currentParams }));
  }

  return {
    getType() { return currentType; },
    getParams() { return { ...currentParams }; },
    onChange(cb: ControlChangeCallback) { changeCallbacks.push(cb); },
    onGeodesicSelect(cb: GeodesicCallback) { geodesicCallbacks.push(cb); },
  };
}

export function createGeodesicLine(): THREE.Line {
  const material = new THREE.LineBasicMaterial({
    color: 0xff3333,
    linewidth: 2,
    transparent: true,
    opacity: 1,
  });
  const geometry = new THREE.BufferGeometry();
  const line = new THREE.Line(geometry, material);
  return line;
}

export function updateGeodesicLine(
  line: THREE.Line,
  points: THREE.Vector3[]
): void {
  const positions = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    positions[i * 3] = points[i].x;
    positions[i * 3 + 1] = points[i].y;
    positions[i * 3 + 2] = points[i].z;
  }
  line.geometry.dispose();
  line.geometry = new THREE.BufferGeometry();
  line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  (line.material as THREE.LineBasicMaterial).opacity = 1;
}

export function fadeGeodesicLine(line: THREE.Line, deltaTime: number): boolean {
  const mat = line.material as THREE.LineBasicMaterial;
  mat.opacity -= deltaTime;
  if (mat.opacity <= 0) {
    mat.opacity = 0;
    return true;
  }
  return false;
}


