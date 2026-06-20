import * as THREE from 'three';
import { SmoothValue, SmoothColor, TweenManager, lerp, easeInOutCubic, clamp } from './animationUtils';

export interface LightParams {
  ambientIntensity: number;
  pointIntensity: number;
  pointColor: [number, number, number];
  pointPosition: [number, number, number];
  spotAngle: number;
  spotColor: [number, number, number];
  materialRoughness: number;
}

export interface LightPreset {
  name: string;
  params: Partial<LightParams>;
}

const PRESETS: LightPreset[] = [
  {
    name: '暖光温馨',
    params: {
      ambientIntensity: 0.3,
      pointIntensity: 1.5,
      pointColor: [1, 0.75, 0.5],
      pointPosition: [0, 5, 0],
      spotAngle: 0.5,
      spotColor: [1, 0.85, 0.6],
      materialRoughness: 0.4
    }
  },
  {
    name: '冷光科技',
    params: {
      ambientIntensity: 0.2,
      pointIntensity: 2,
      pointColor: [0.4, 0.6, 1],
      pointPosition: [0, 6, 1],
      spotAngle: 0.3,
      spotColor: [0.3, 0.5, 1],
      materialRoughness: 0.2
    }
  },
  {
    name: '混合戏剧',
    params: {
      ambientIntensity: 0.15,
      pointIntensity: 2.5,
      pointColor: [1, 0.4, 0.4],
      pointPosition: [-2, 5, 2],
      spotAngle: 0.4,
      spotColor: [0.4, 1, 0.6],
      materialRoughness: 0.7
    }
  }
];

export class LightController {
  private scene: THREE.Scene;
  private ambientLight: THREE.AmbientLight;
  private pointLight: THREE.PointLight;
  private spotLight: THREE.SpotLight;
  private pointLightHelper: THREE.Mesh;
  private pointLightGlow: THREE.Mesh;

  private ambientIntensity: SmoothValue;
  private pointIntensity: SmoothValue;
  private pointColor: SmoothColor;
  private pointPosX: SmoothValue;
  private pointPosY: SmoothValue;
  private pointPosZ: SmoothValue;
  private spotAngle: SmoothValue;
  private spotColor: SmoothColor;
  private materialRoughness: SmoothValue;

  private tweenManager: TweenManager;
  private currentPresetIndex: number = 0;
  private breathingPhase: number = 0;
  private isBreathing: boolean = false;

  private panel: HTMLElement | null = null;
  private colorPickerPopup: HTMLElement | null = null;
  private activeColorPicker: 'point' | 'spot' | null = null;

  private trailPositions: THREE.Vector3[] = [];
  private trailGeometry: THREE.BufferGeometry | null = null;
  private trailMesh: THREE.Points | null = null;

  private isDraggingAxis: 'x' | 'y' | 'z' | null = null;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragStartValue: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.tweenManager = new TweenManager();

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(this.ambientLight);

    this.pointLight = new THREE.PointLight(0xffffff, 1.5, 20, 1);
    this.pointLight.position.set(0, 5, 0);
    this.pointLight.castShadow = true;
    scene.add(this.pointLight);

    this.spotLight = new THREE.SpotLight(0xffffff, 1, 20, 0.5, 0.5, 1);
    this.spotLight.position.set(0, 6, -5);
    this.spotLight.target.position.set(0, 2, 0);
    this.spotLight.castShadow = true;
    scene.add(this.spotLight);
    scene.add(this.spotLight.target);

    const helperGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const helperMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.pointLightHelper = new THREE.Mesh(helperGeometry, helperMaterial);
    this.pointLightHelper.position.copy(this.pointLight.position);
    scene.add(this.pointLightHelper);

    const glowGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3
    });
    this.pointLightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.pointLightGlow.position.copy(this.pointLight.position);
    scene.add(this.pointLightGlow);

    this.createTrail();

    this.ambientIntensity = new SmoothValue(0.3, 0.15);
    this.pointIntensity = new SmoothValue(1.5, 0.15);
    this.pointColor = new SmoothColor(1, 1, 1, 0.15);
    this.pointPosX = new SmoothValue(0, 0.15);
    this.pointPosY = new SmoothValue(5, 0.15);
    this.pointPosZ = new SmoothValue(0, 0.15);
    this.spotAngle = new SmoothValue(0.5, 0.15);
    this.spotColor = new SmoothColor(1, 1, 1, 0.15);
    this.materialRoughness = new SmoothValue(0.5, 0.08);

    this.createUIPanel();
  }

  private createTrail(): void {
    const trailCount = 30;
    const positions = new Float32Array(trailCount * 3);
    const colors = new Float32Array(trailCount * 3);
    const sizes = new Float32Array(trailCount);

    for (let i = 0; i < trailCount; i++) {
      this.trailPositions.push(new THREE.Vector3());
      sizes[i] = 0.1 * (1 - i / trailCount);
    }

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.trailGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const trailMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.trailMesh = new THREE.Points(this.trailGeometry, trailMaterial);
    this.scene.add(this.trailMesh);
  }

  private updateTrail(): void {
    if (!this.trailGeometry || !this.trailMesh) return;

    const pos = this.pointLight.position;
    const positions = this.trailGeometry.attributes.position.array as Float32Array;
    const colors = this.trailGeometry.attributes.color.array as Float32Array;

    for (let i = this.trailPositions.length - 1; i > 0; i--) {
      this.trailPositions[i].copy(this.trailPositions[i - 1]);
    }
    this.trailPositions[0].set(pos.x, pos.y, pos.z);

    for (let i = 0; i < this.trailPositions.length; i++) {
      const idx = i * 3;
      positions[idx] = this.trailPositions[i].x;
      positions[idx + 1] = this.trailPositions[i].y;
      positions[idx + 2] = this.trailPositions[i].z;

      const alpha = 1 - i / this.trailPositions.length;
      const [r, g, b] = this.pointColor.getCurrent();
      colors[idx] = r * alpha;
      colors[idx + 1] = g * alpha;
      colors[idx + 2] = b * alpha;
    }

    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
  }

  private createUIPanel(): void {
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      background: rgba(30, 30, 40, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 16px;
      padding: 20px;
      color: #e0e0e0;
      font-family: 'Segoe UI', system-ui, sans-serif;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 1000;
      user-select: none;
    `;

    const title = document.createElement('div');
    title.textContent = '灯光控制面板';
    title.style.cssText = `
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      text-align: center;
      color: #fff;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    `;
    this.panel.appendChild(title);

    const presetInfo = document.createElement('div');
    presetInfo.id = 'preset-info';
    presetInfo.textContent = `当前方案: ${PRESETS[0].name}`;
    presetInfo.style.cssText = `
      font-size: 13px;
      color: #88ccff;
      text-align: center;
      margin-bottom: 16px;
      padding: 8px;
      background: rgba(136, 204, 255, 0.1);
      border-radius: 8px;
    `;
    this.panel.appendChild(presetInfo);

    this.createSlider('环境光亮度', 'ambient', 0, 1, 0.3, (val) => {
      this.ambientIntensity.setTarget(val);
    });

    this.createSlider('点光源强度', 'pointIntensity', 0, 5, 1.5, (val) => {
      this.pointIntensity.setTarget(val);
    });

    this.createColorPicker('点光源颜色', 'pointColor', '#ffffff', (color) => {
      const rgb = this.hexToRgb(color);
      this.pointColor.setTarget(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    });

    this.createSlider('聚光灯角度', 'spotAngle', 0.1, 1, 0.5, (val) => {
      this.spotAngle.setTarget(val);
    });

    this.createColorPicker('聚光灯颜色', 'spotColor', '#ffffff', (color) => {
      const rgb = this.hexToRgb(color);
      this.spotColor.setTarget(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    });

    this.create3DAxisController();

    this.createColorPickerPopup();

    document.body.appendChild(this.panel);
  }

  private createSlider(label: string, id: string, min: number, max: number, value: number, onChange: (value: number) => void): void {
    if (!this.panel) return;

    const container = document.createElement('div');
    container.style.marginBottom = '14px';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 13px;
      color: #b0b0c0;
    `;

    const labelText = document.createElement('span');
    labelText.textContent = label;

    const valueText = document.createElement('span');
    valueText.textContent = value.toFixed(2);
    valueText.style.color = '#88ccff';
    valueText.style.fontWeight = '500';

    labelRow.appendChild(labelText);
    labelRow.appendChild(valueText);
    container.appendChild(labelRow);

    const sliderContainer = document.createElement('div');
    sliderContainer.style.cssText = `
      position: relative;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      cursor: pointer;
      overflow: hidden;
    `;

    const sliderFill = document.createElement('div');
    const percent = ((value - min) / (max - min)) * 100;
    sliderFill.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: ${percent}%;
      background: linear-gradient(90deg, #667eea, #764ba2, #f093fb);
      border-radius: 3px;
      box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
      transition: width 0.05s linear;
    `;
    sliderContainer.appendChild(sliderFill);

    const sliderThumb = document.createElement('div');
    sliderThumb.style.cssText = `
      position: absolute;
      top: 50%;
      left: ${percent}%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      cursor: grab;
      transition: transform 0.1s ease;
    `;
    sliderContainer.appendChild(sliderThumb);

    container.appendChild(sliderContainer);

    let isDragging = false;

    const updateValue = (clientX: number) => {
      const rect = sliderContainer.getBoundingClientRect();
      let percent = (clientX - rect.left) / rect.width;
      percent = clamp(percent, 0, 1);
      const val = min + percent * (max - min);
      valueText.textContent = val.toFixed(2);
      sliderFill.style.width = `${percent * 100}%`;
      sliderThumb.style.left = `${percent * 100}%`;
      onChange(val);
    };

    sliderContainer.addEventListener('mousedown', (e) => {
      isDragging = true;
      sliderThumb.style.transform = 'translate(-50%, -50%) scale(1.2)';
      updateValue(e.clientX);
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        updateValue(e.clientX);
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        sliderThumb.style.transform = 'translate(-50%, -50%) scale(1)';
      }
    });

    this.panel.appendChild(container);
  }

  private createColorPicker(label: string, id: string, value: string, onChange: (color: string) => void): void {
    if (!this.panel) return;

    const container = document.createElement('div');
    container.style.marginBottom = '14px';

    const labelText = document.createElement('div');
    labelText.textContent = label;
    labelText.style.cssText = `
      font-size: 13px;
      color: #b0b0c0;
      margin-bottom: 6px;
    `;
    container.appendChild(labelText);

    const pickerRow = document.createElement('div');
    pickerRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    const colorPreview = document.createElement('div');
    colorPreview.style.cssText = `
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: ${value};
      border: 2px solid rgba(255, 255, 255, 0.3);
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s ease;
    `;
    colorPreview.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showColorPicker(id, colorPreview, onChange);
    });
    colorPreview.addEventListener('mouseenter', () => {
      colorPreview.style.transform = 'scale(1.1)';
    });
    colorPreview.addEventListener('mouseleave', () => {
      colorPreview.style.transform = 'scale(1)';
    });
    pickerRow.appendChild(colorPreview);

    const colorHex = document.createElement('div');
    colorHex.textContent = value.toUpperCase();
    colorHex.style.cssText = `
      font-size: 12px;
      color: #888;
      font-family: monospace;
      flex: 1;
    `;
    pickerRow.appendChild(colorHex);

    container.appendChild(pickerRow);
    this.panel.appendChild(container);
  }

  private createColorPickerPopup(): void {
    this.colorPickerPopup = document.createElement('div');
    this.colorPickerPopup.style.cssText = `
      position: fixed;
      display: none;
      z-index: 2000;
      background: rgba(30, 30, 40, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    const wheelContainer = document.createElement('div');
    wheelContainer.style.cssText = `
      position: relative;
      width: 200px;
      height: 200px;
    `;

    const wheelCanvas = document.createElement('canvas');
    wheelCanvas.width = 200;
    wheelCanvas.height = 200;
    wheelCanvas.style.cssText = `
      border-radius: 50%;
      cursor: crosshair;
      display: block;
    `;

    const ctx = wheelCanvas.getContext('2d')!;
    const centerX = 100;
    const centerY = 100;
    const radius = 95;

    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.fill();
    }

    const innerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.7);
    innerGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    wheelContainer.appendChild(wheelCanvas);

    const selector = document.createElement('div');
    selector.style.cssText = `
      position: absolute;
      width: 14px;
      height: 14px;
      border: 2px solid #fff;
      border-radius: 50%;
      pointer-events: none;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
    `;
    wheelContainer.appendChild(selector);

    this.colorPickerPopup.appendChild(wheelContainer);

    const lightnessSlider = document.createElement('input');
    lightnessSlider.type = 'range';
    lightnessSlider.min = '0';
    lightnessSlider.max = '100';
    lightnessSlider.value = '50';
    lightnessSlider.style.cssText = `
      width: 100%;
      margin-top: 12px;
      -webkit-appearance: none;
      appearance: none;
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(to right, #000, hsl(0, 100%, 50%), #fff);
      outline: none;
    `;
    this.colorPickerPopup.appendChild(lightnessSlider);

    let currentHue = 0;
    let currentLightness = 50;
    let isDraggingWheel = false;
    let currentOnChange: ((color: string) => void) | null = null;
    let currentPreview: HTMLElement | null = null;

    const updateSelector = (hue: number) => {
      const angle = hue * Math.PI / 180;
      const r = radius * 0.85;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      selector.style.left = `${x}px`;
      selector.style.top = `${y}px`;
    };

    const getColorFromPoint = (x: number, y: number): number => {
      const dx = x - centerX;
      const dy = y - centerY;
      let hue = Math.atan2(dy, dx) * 180 / Math.PI;
      if (hue < 0) hue += 360;
      return hue;
    };

    const updateColor = () => {
      const color = `hsl(${currentHue}, 100%, ${currentLightness}%)`;
      selector.style.backgroundColor = color;
      if (currentOnChange && currentPreview) {
        const hex = this.hslToHex(currentHue, 100, currentLightness);
        currentPreview.style.background = hex;
        currentOnChange(hex);
      }
      lightnessSlider.style.background = `linear-gradient(to right, #000, hsl(${currentHue}, 100%, 50%), #fff)`;
    };

    wheelCanvas.addEventListener('mousedown', (e) => {
      isDraggingWheel = true;
      const rect = wheelCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      currentHue = getColorFromPoint(x, y);
      updateSelector(currentHue);
      updateColor();
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (isDraggingWheel) {
        const rect = wheelCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        currentHue = getColorFromPoint(x, y);
        updateSelector(currentHue);
        updateColor();
      }
    });

    document.addEventListener('mouseup', () => {
      isDraggingWheel = false;
    });

    lightnessSlider.addEventListener('input', () => {
      currentLightness = parseInt(lightnessSlider.value);
      updateColor();
    });

    (this.colorPickerPopup as any).setInitialColor = (hex: string) => {
      const hsl = this.hexToHsl(hex);
      currentHue = hsl[0];
      currentLightness = hsl[2];
      lightnessSlider.value = String(currentLightness);
      updateSelector(currentHue);
      updateColor();
    };

    (this.colorPickerPopup as any).setOnChange = (onChange: (color: string) => void, preview: HTMLElement) => {
      currentOnChange = onChange;
      currentPreview = preview;
    };

    document.addEventListener('click', (e) => {
      if (this.colorPickerPopup && this.colorPickerPopup.style.display === 'block') {
        if (!this.colorPickerPopup.contains(e.target as Node)) {
          this.colorPickerPopup.style.display = 'none';
        }
      }
    });

    document.body.appendChild(this.colorPickerPopup);
  }

  private showColorPicker(id: string, previewElement: HTMLElement, onChange: (color: string) => void): void {
    if (!this.colorPickerPopup) return;

    const rect = previewElement.getBoundingClientRect();
    this.colorPickerPopup.style.display = 'block';
    this.colorPickerPopup.style.left = `${rect.left - 20}px`;
    this.colorPickerPopup.style.top = `${rect.bottom + 10}px`;

    const popup = this.colorPickerPopup as any;
    popup.setOnChange(onChange, previewElement);

    const bgColor = previewElement.style.background;
    if (bgColor.startsWith('#')) {
      popup.setInitialColor(bgColor);
    }
  }

  private create3DAxisController(): void {
    if (!this.panel) return;

    const container = document.createElement('div');
    container.style.cssText = `
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    `;

    const title = document.createElement('div');
    title.textContent = '点光源位置';
    title.style.cssText = `
      font-size: 13px;
      color: #b0b0c0;
      margin-bottom: 10px;
    `;
    container.appendChild(title);

    const axisContainer = document.createElement('div');
    axisContainer.style.cssText = `
      position: relative;
      height: 120px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      overflow: hidden;
    `;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.display = 'block';

    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', '20');
    xAxis.setAttribute('y1', '100');
    xAxis.setAttribute('x2', '260');
    xAxis.setAttribute('y2', '100');
    xAxis.setAttribute('stroke', '#ff6b6b');
    xAxis.setAttribute('stroke-width', '3');
    xAxis.setAttribute('stroke-linecap', 'round');
    svg.appendChild(xAxis);

    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', '140');
    yAxis.setAttribute('y1', '110');
    yAxis.setAttribute('x2', '140');
    yAxis.setAttribute('y2', '10');
    yAxis.setAttribute('stroke', '#51cf66');
    yAxis.setAttribute('stroke-width', '3');
    yAxis.setAttribute('stroke-linecap', 'round');
    svg.appendChild(yAxis);

    const zAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    zAxis.setAttribute('x1', '140');
    zAxis.setAttribute('y1', '100');
    zAxis.setAttribute('x2', '80');
    zAxis.setAttribute('y2', '60');
    zAxis.setAttribute('stroke', '#4dabf7');
    zAxis.setAttribute('stroke-width', '3');
    zAxis.setAttribute('stroke-linecap', 'round');
    svg.appendChild(zAxis);

    const xHandle = this.createAxisHandle(260, 100, '#ff6b6b', 'x');
    const yHandle = this.createAxisHandle(140, 10, '#51cf66', 'y');
    const zHandle = this.createAxisHandle(80, 60, '#4dabf7', 'z');

    axisContainer.appendChild(svg);
    axisContainer.appendChild(xHandle);
    axisContainer.appendChild(yHandle);
    axisContainer.appendChild(zHandle);

    const xLabel = document.createElement('div');
    xLabel.textContent = 'X';
    xLabel.style.cssText = `
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 11px;
      color: #ff6b6b;
      font-weight: bold;
    `;
    axisContainer.appendChild(xLabel);

    const yLabel = document.createElement('div');
    yLabel.textContent = 'Y';
    yLabel.style.cssText = `
      position: absolute;
      left: 50%;
      top: 2px;
      transform: translateX(-50%);
      font-size: 11px;
      color: #51cf66;
      font-weight: bold;
    `;
    axisContainer.appendChild(yLabel);

    const zLabel = document.createElement('div');
    zLabel.textContent = 'Z';
    zLabel.style.cssText = `
      position: absolute;
      left: 45px;
      top: 45px;
      font-size: 11px;
      color: #4dabf7;
      font-weight: bold;
    `;
    axisContainer.appendChild(zLabel);

    container.appendChild(axisContainer);
    this.panel.appendChild(container);
  }

  private createAxisHandle(x: number, y: number, color: string, axis: 'x' | 'y' | 'z'): HTMLElement {
    const handle = document.createElement('div');
    handle.style.cssText = `
      position: absolute;
      width: 16px;
      height: 16px;
      background: ${color};
      border-radius: 50%;
      left: ${x - 8}px;
      top: ${y - 8}px;
      cursor: grab;
      box-shadow: 0 2px 8px ${color}80;
      border: 2px solid #fff;
      transition: transform 0.1s ease;
      z-index: 10;
    `;

    let isDragging = false;
    let startX = 0;
    let startY = 0;

    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      this.isDraggingAxis = axis;
      startX = e.clientX;
      startY = e.clientY;
      if (axis === 'x') {
        this.dragStartValue = this.pointPosX.getTarget();
      } else if (axis === 'y') {
        this.dragStartValue = this.pointPosY.getTarget();
      } else {
        this.dragStartValue = this.pointPosZ.getTarget();
      }
      handle.style.transform = 'scale(1.3)';
      handle.style.cursor = 'grabbing';
      e.stopPropagation();
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging || this.isDraggingAxis !== axis) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let delta = 0;
      if (axis === 'x') {
        delta = dx * 0.05;
        const newVal = clamp(this.dragStartValue + delta, -8, 8);
        this.pointPosX.setTarget(newVal);
      } else if (axis === 'y') {
        delta = -dy * 0.05;
        const newVal = clamp(this.dragStartValue + delta, 1, 8);
        this.pointPosY.setTarget(newVal);
      } else {
        delta = dx * 0.03 + dy * 0.03;
        const newVal = clamp(this.dragStartValue + delta, -8, 8);
        this.pointPosZ.setTarget(newVal);
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this.isDraggingAxis = null;
        handle.style.transform = 'scale(1)';
        handle.style.cursor = 'grab';
      }
    });

    return handle;
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [255, 255, 255];
  }

  private hexToHsl(hex: string): [number, number, number] {
    const [r, g, b] = this.hexToRgb(hex).map(v => v / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return [h * 360, s * 100, l * 100];
  }

  private hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

  public nextPreset(): void {
    this.currentPresetIndex = (this.currentPresetIndex + 1) % PRESETS.length;
    this.applyPreset(this.currentPresetIndex);
  }

  private applyPreset(index: number): void {
    const preset = PRESETS[index];
    const params = preset.params;

    const presetInfo = document.getElementById('preset-info');
    if (presetInfo) {
      presetInfo.textContent = `当前方案: ${preset.name}`;
    }

    this.isBreathing = true;
    this.breathingPhase = 0;

    this.tweenManager.add({
      duration: 1000,
      easing: easeInOutCubic,
      onUpdate: (t) => {
        if (params.ambientIntensity !== undefined) {
          const start = this.ambientIntensity.getCurrent();
          this.ambientIntensity.setTarget(lerp(start, params.ambientIntensity, t));
        }
        if (params.pointIntensity !== undefined) {
          const start = this.pointIntensity.getCurrent();
          this.pointIntensity.setTarget(lerp(start, params.pointIntensity, t));
        }
        if (params.pointColor !== undefined) {
          const [sr, sg, sb] = this.pointColor.getCurrent();
          const [er, eg, eb] = params.pointColor;
          this.pointColor.setTarget(
            lerp(sr, er, t),
            lerp(sg, eg, t),
            lerp(sb, eb, t)
          );
        }
        if (params.pointPosition !== undefined) {
          const sx = this.pointPosX.getCurrent();
          const sy = this.pointPosY.getCurrent();
          const sz = this.pointPosZ.getCurrent();
          const [ex, ey, ez] = params.pointPosition;
          this.pointPosX.setTarget(lerp(sx, ex, t));
          this.pointPosY.setTarget(lerp(sy, ey, t));
          this.pointPosZ.setTarget(lerp(sz, ez, t));
        }
        if (params.spotAngle !== undefined) {
          const start = this.spotAngle.getCurrent();
          this.spotAngle.setTarget(lerp(start, params.spotAngle, t));
        }
        if (params.spotColor !== undefined) {
          const [sr, sg, sb] = this.spotColor.getCurrent();
          const [er, eg, eb] = params.spotColor;
          this.spotColor.setTarget(
            lerp(sr, er, t),
            lerp(sg, eg, t),
            lerp(sb, eb, t)
          );
        }
        if (params.materialRoughness !== undefined) {
          const start = this.materialRoughness.getCurrent();
          this.materialRoughness.setTarget(lerp(start, params.materialRoughness, t));
        }
      },
      onComplete: () => {
        this.isBreathing = false;
      }
    });
  }

  public update(deltaTime: number): void {
    this.tweenManager.update();

    const ambient = this.ambientIntensity.update();
    const pointInt = this.pointIntensity.update();
    const [pr, pg, pb] = this.pointColor.update();
    const px = this.pointPosX.update();
    const py = this.pointPosY.update();
    const pz = this.pointPosZ.update();
    const sAngle = this.spotAngle.update();
    const [sr, sg, sb] = this.spotColor.update();
    this.materialRoughness.update();

    this.ambientLight.intensity = ambient;

    this.pointLight.intensity = pointInt;
    this.pointLight.color.setRGB(pr, pg, pb);
    this.pointLight.position.set(px, py, pz);

    this.pointLightHelper.position.set(px, py, pz);
    (this.pointLightHelper.material as THREE.MeshBasicMaterial).color.setRGB(pr, pg, pb);

    this.pointLightGlow.position.set(px, py, pz);
    (this.pointLightGlow.material as THREE.MeshBasicMaterial).color.setRGB(pr, pg, pb);

    const glowPulse = 1 + Math.sin(performance.now() * 0.003) * 0.1;
    this.pointLightGlow.scale.setScalar(glowPulse);

    this.spotLight.angle = sAngle;
    this.spotLight.color.setRGB(sr, sg, sb);

    this.updateTrail();
  }

  public getMaterialRoughness(): number {
    return this.materialRoughness.getCurrent();
  }

  public isBreathingActive(): boolean {
    return this.isBreathing;
  }

  public getBreathingPhase(): number {
    return this.breathingPhase;
  }

  public getCurrentPresetName(): string {
    return PRESETS[this.currentPresetIndex].name;
  }
}
