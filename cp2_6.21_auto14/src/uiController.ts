import { switchMode, FlowMode } from './flowSimulator';
import { setSpeedMultiplier, setTrailLength, setGlowIntensity } from './particleSystem';

export interface UIControllerParams {
  onResetCamera: () => void;
}

let panel: HTMLDivElement;
let speedSlider: HTMLInputElement;
let trailSlider: HTMLInputElement;
let glowSlider: HTMLInputElement;
let modeSelect: HTMLSelectElement;
let resetButton: HTMLButtonElement;

let speedValueLabel: HTMLSpanElement;
let trailValueLabel: HTMLSpanElement;
let glowValueLabel: HTMLSpanElement;

function createSlider(label: string, min: number, max: number, step: number, value: number): { container: HTMLDivElement; slider: HTMLInputElement; valueLabel: HTMLSpanElement } {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '6px';
  container.style.marginBottom = '16px';
  
  const labelRow = document.createElement('div');
  labelRow.style.display = 'flex';
  labelRow.style.justifyContent = 'space-between';
  labelRow.style.alignItems = 'center';
  
  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  labelEl.style.fontFamily = 'Helvetica, Arial, sans-serif';
  labelEl.style.fontSize = '12px';
  labelEl.style.color = '#ffffff';
  
  const valueLabel = document.createElement('span');
  valueLabel.textContent = value.toFixed(1);
  valueLabel.style.fontFamily = 'Helvetica, Arial, sans-serif';
  valueLabel.style.fontSize = '12px';
  valueLabel.style.color = '#a0a0ff';
  
  labelRow.appendChild(labelEl);
  labelRow.appendChild(valueLabel);
  
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = min.toString();
  slider.max = max.toString();
  slider.step = step.toString();
  slider.value = value.toString();
  
  slider.style.width = '100%';
  slider.style.height = '4px';
  slider.style.appearance = 'none';
  slider.style.background = 'transparent';
  slider.style.cursor = 'pointer';
  slider.style.outline = 'none';
  
  const style = document.createElement('style');
  style.textContent = `
    .ui-slider::-webkit-slider-runnable-track {
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
    }
    .ui-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6060ff, #ff6060);
      cursor: pointer;
      margin-top: -5px;
      box-shadow: 0 0 8px rgba(100, 100, 255, 0.6);
    }
    .ui-slider::-moz-range-track {
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
    }
    .ui-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6060ff, #ff6060);
      cursor: pointer;
      border: none;
      box-shadow: 0 0 8px rgba(100, 100, 255, 0.6);
    }
  `;
  document.head.appendChild(style);
  slider.classList.add('ui-slider');
  
  container.appendChild(labelRow);
  container.appendChild(slider);
  
  return { container, slider, valueLabel };
}

export function createUI(params: UIControllerParams): void {
  panel = document.createElement('div');
  panel.style.position = 'absolute';
  panel.style.top = '20px';
  panel.style.right = '12px';
  panel.style.width = '240px';
  panel.style.padding = '20px';
  panel.style.background = 'rgba(20, 20, 40, 0.6)';
  panel.style.borderRadius = '6px';
  panel.style.backdropFilter = 'blur(12px)';
  panel.style.color = '#ffffff';
  panel.style.fontFamily = 'Helvetica, Arial, sans-serif';
  panel.style.zIndex = '100';
  panel.style.userSelect = 'none';
  
  const title = document.createElement('div');
  title.textContent = '控制面板';
  title.style.fontSize = '14px';
  title.style.fontWeight = 'bold';
  title.style.marginBottom = '20px';
  title.style.color = '#ffffff';
  panel.appendChild(title);
  
  const modeLabel = document.createElement('div');
  modeLabel.textContent = '流体模式';
  modeLabel.style.fontSize = '12px';
  modeLabel.style.color = '#ffffff';
  modeLabel.style.marginBottom = '8px';
  panel.appendChild(modeLabel);
  
  modeSelect = document.createElement('select');
  modeSelect.innerHTML = `
    <option value="laminar">层流</option>
    <option value="vortex">涡旋</option>
    <option value="turbulence">湍流</option>
  `;
  modeSelect.style.width = '100%';
  modeSelect.style.padding = '8px 12px';
  modeSelect.style.fontSize = '12px';
  modeSelect.style.fontFamily = 'Helvetica, Arial, sans-serif';
  modeSelect.style.color = '#ffffff';
  modeSelect.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
  modeSelect.style.border = '1px solid rgba(255, 255, 255, 0.2)';
  modeSelect.style.borderRadius = '6px';
  modeSelect.style.outline = 'none';
  modeSelect.style.cursor = 'pointer';
  modeSelect.style.marginBottom = '20px';
  modeSelect.style.appearance = 'none';
  
  modeSelect.addEventListener('change', () => {
    const mode = modeSelect.value as FlowMode;
    switchMode(mode);
  });
  
  panel.appendChild(modeSelect);
  
  const speedResult = createSlider('粒子速度倍率', 0.1, 5.0, 0.1, 1.0);
  speedSlider = speedResult.slider;
  speedValueLabel = speedResult.valueLabel;
  speedSlider.addEventListener('input', () => {
    const val = parseFloat(speedSlider.value);
    speedValueLabel.textContent = val.toFixed(1);
    setSpeedMultiplier(val);
  });
  panel.appendChild(speedResult.container);
  
  const trailResult = createSlider('尾迹长度', 0, 100, 5, 50);
  trailSlider = trailResult.slider;
  trailValueLabel = trailResult.valueLabel;
  trailValueLabel.textContent = '50';
  trailSlider.addEventListener('input', () => {
    const val = parseInt(trailSlider.value);
    trailValueLabel.textContent = val.toString();
    setTrailLength(val);
  });
  panel.appendChild(trailResult.container);
  
  const glowResult = createSlider('发光强度', 0, 2.0, 0.1, 1.0);
  glowSlider = glowResult.slider;
  glowValueLabel = glowResult.valueLabel;
  glowSlider.addEventListener('input', () => {
    const val = parseFloat(glowSlider.value);
    glowValueLabel.textContent = val.toFixed(1);
    setGlowIntensity(val);
  });
  panel.appendChild(glowResult.container);
  
  resetButton = document.createElement('button');
  resetButton.textContent = '重置视角';
  resetButton.style.width = '100%';
  resetButton.style.padding = '10px';
  resetButton.style.fontSize = '12px';
  resetButton.style.fontFamily = 'Helvetica, Arial, sans-serif';
  resetButton.style.color = '#ffffff';
  resetButton.style.backgroundColor = 'rgba(100, 100, 255, 0.3)';
  resetButton.style.border = '1px solid rgba(150, 150, 255, 0.4)';
  resetButton.style.borderRadius = '6px';
  resetButton.style.cursor = 'pointer';
  resetButton.style.marginTop = '8px';
  resetButton.style.transition = 'background-color 0.2s';
  
  resetButton.addEventListener('mouseenter', () => {
    resetButton.style.backgroundColor = 'rgba(120, 120, 255, 0.5)';
  });
  resetButton.addEventListener('mouseleave', () => {
    resetButton.style.backgroundColor = 'rgba(100, 100, 255, 0.3)';
  });
  
  resetButton.addEventListener('click', () => {
    params.onResetCamera();
  });
  
  panel.appendChild(resetButton);
  
  document.getElementById('app')?.appendChild(panel);
}
