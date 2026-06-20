import { switchMode, FlowMode, getCurrentMode } from './flowSimulator';
import { setSpeedMultiplier, setTrailLength, setGlowIntensity } from './particleSystem';

export interface UIControllerConfig {
  onResetView: () => void;
}

let config: UIControllerConfig | null = null;
let panel: HTMLDivElement | null = null;

export function createUI(container: HTMLElement, configRef: UIControllerConfig): void {
  config = configRef;
  
  panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.top = '50%';
  panel.style.right = '12px';
  panel.style.transform = 'translateY(-50%)';
  panel.style.width = '240px';
  panel.style.padding = '20px';
  panel.style.backgroundColor = 'rgba(20, 20, 40, 0.6)';
  panel.style.backdropFilter = 'blur(10px)';
  (panel.style as any).webkitBackdropFilter = 'blur(10px)';
  panel.style.borderRadius = '12px';
  panel.style.fontFamily = 'Helvetica, Arial, sans-serif';
  panel.style.color = 'white';
  panel.style.zIndex = '1000';
  panel.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
  
  const title = document.createElement('div');
  title.textContent = 'Fluid Controls';
  title.style.fontSize = '16px';
  title.style.fontWeight = 'bold';
  title.style.marginBottom = '16px';
  title.style.textAlign = 'center';
  title.style.letterSpacing = '1px';
  panel.appendChild(title);
  
  const modeLabel = document.createElement('div');
  modeLabel.textContent = 'Flow Mode';
  modeLabel.style.fontSize = '12px';
  modeLabel.style.marginBottom = '8px';
  modeLabel.style.color = 'rgba(255, 255, 255, 0.8)';
  panel.appendChild(modeLabel);
  
  const modeSelect = document.createElement('select');
  modeSelect.style.width = '100%';
  modeSelect.style.padding = '8px 12px';
  modeSelect.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
  modeSelect.style.color = 'white';
  modeSelect.style.border = 'none';
  modeSelect.style.borderRadius = '6px';
  modeSelect.style.fontSize = '12px';
  modeSelect.style.cursor = 'pointer';
  modeSelect.style.outline = 'none';
  modeSelect.style.appearance = 'none';
  modeSelect.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`;
  modeSelect.style.backgroundRepeat = 'no-repeat';
  modeSelect.style.backgroundPosition = 'right 12px center';
  
  const modes: { value: FlowMode; label: string }[] = [
    { value: 'laminar', label: 'Laminar Flow' },
    { value: 'vortex', label: 'Vortex' },
    { value: 'turbulence', label: 'Turbulence' }
  ];
  
  modes.forEach(mode => {
    const option = document.createElement('option');
    option.value = mode.value;
    option.textContent = mode.label;
    option.style.backgroundColor = '#1a1a2e';
    modeSelect.appendChild(option);
  });
  
  modeSelect.value = getCurrentMode();
  
  modeSelect.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    switchMode(target.value as FlowMode);
  });
  
  panel.appendChild(modeSelect);
  
  const spacer1 = document.createElement('div');
  spacer1.style.height = '20px';
  panel.appendChild(spacer1);
  
  createSlider(panel, {
    label: 'Speed Multiplier',
    min: 0.1,
    max: 5.0,
    step: 0.1,
    value: 1.0,
    onChange: (value) => {
      setSpeedMultiplier(value);
    }
  });
  
  createSlider(panel, {
    label: 'Trail Length',
    min: 0,
    max: 100,
    step: 5,
    value: 50,
    onChange: (value) => {
      setTrailLength(Math.round(value));
    }
  });
  
  createSlider(panel, {
    label: 'Glow Intensity',
    min: 0,
    max: 2.0,
    step: 0.1,
    value: 1.0,
    onChange: (value) => {
      setGlowIntensity(value);
    }
  });
  
  const spacer2 = document.createElement('div');
  spacer2.style.height = '16px';
  panel.appendChild(spacer2);
  
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset View';
  resetButton.style.width = '100%';
  resetButton.style.padding = '10px';
  resetButton.style.backgroundColor = 'rgba(100, 100, 200, 0.3)';
  resetButton.style.color = 'white';
  resetButton.style.border = '1px solid rgba(150, 150, 255, 0.3)';
  resetButton.style.borderRadius = '6px';
  resetButton.style.fontSize = '12px';
  resetButton.style.cursor = 'pointer';
  resetButton.style.transition = 'all 0.2s ease';
  resetButton.style.fontFamily = 'Helvetica, Arial, sans-serif';
  
  resetButton.addEventListener('mouseenter', () => {
    resetButton.style.backgroundColor = 'rgba(100, 100, 200, 0.5)';
  });
  
  resetButton.addEventListener('mouseleave', () => {
    resetButton.style.backgroundColor = 'rgba(100, 100, 200, 0.3)';
  });
  
  resetButton.addEventListener('click', () => {
    if (config && config.onResetView) {
      config.onResetView();
    }
  });
  
  panel.appendChild(resetButton);
  
  container.appendChild(panel);
}

interface SliderConfig {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

function createSlider(container: HTMLElement, sliderConfig: SliderConfig): void {
  const wrapper = document.createElement('div');
  wrapper.style.marginBottom = '16px';
  
  const labelRow = document.createElement('div');
  labelRow.style.display = 'flex';
  labelRow.style.justifyContent = 'space-between';
  labelRow.style.alignItems = 'center';
  labelRow.style.marginBottom = '6px';
  
  const label = document.createElement('span');
  label.textContent = sliderConfig.label;
  label.style.fontSize = '12px';
  label.style.color = 'rgba(255, 255, 255, 0.8)';
  
  const valueDisplay = document.createElement('span');
  valueDisplay.textContent = sliderConfig.value.toFixed(1);
  valueDisplay.style.fontSize = '12px';
  valueDisplay.style.color = 'rgba(150, 150, 255, 0.9)';
  valueDisplay.style.fontWeight = 'bold';
  
  labelRow.appendChild(label);
  labelRow.appendChild(valueDisplay);
  wrapper.appendChild(labelRow);
  
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = sliderConfig.min.toString();
  slider.max = sliderConfig.max.toString();
  slider.step = sliderConfig.step.toString();
  slider.value = sliderConfig.value.toString();
  
  slider.style.width = '100%';
  slider.style.height = '4px';
  slider.style.borderRadius = '2px';
  slider.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  slider.style.outline = 'none';
  slider.style.appearance = 'none';
  slider.style.webkitAppearance = 'none';
  slider.style.cursor = 'pointer';
  
  const sliderStyle = document.createElement('style');
  sliderStyle.textContent = `
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #f093fb 50%, #f5576c 100%);
      cursor: pointer;
      box-shadow: 0 0 8px rgba(102, 126, 234, 0.6);
      border: none;
    }
    input[type="range"]::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #f093fb 50%, #f5576c 100%);
      cursor: pointer;
      box-shadow: 0 0 8px rgba(102, 126, 234, 0.6);
      border: none;
    }
    input[type="range"]::-webkit-slider-runnable-track {
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.2);
    }
    input[type="range"]::-moz-range-track {
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.2);
    }
  `;
  document.head.appendChild(sliderStyle);
  
  slider.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value);
    valueDisplay.textContent = value.toFixed(1);
    sliderConfig.onChange(value);
  });
  
  wrapper.appendChild(slider);
  container.appendChild(wrapper);
}
