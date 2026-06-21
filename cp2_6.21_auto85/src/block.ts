import * as THREE from 'three';

const COLOR_LOW = new THREE.Color('#1E90FF');
const COLOR_MID = new THREE.Color('#FFD700');
const COLOR_HIGH = new THREE.Color('#FF4500');

const BASE_SIZE = 0.8;
const BASE_HEIGHT = 0.2;
const MIN_HEIGHT = 0.2;
const MAX_HEIGHT = 3.0;
const TRANSITION_DURATION = 800;
const HOVER_SCALE = 1.2;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function heatColor(value: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, value));
  const color = new THREE.Color();
  if (clamped <= 0.5) {
    color.copy(COLOR_LOW).lerp(COLOR_MID, clamped * 2);
  } else {
    color.copy(COLOR_MID).lerp(COLOR_HIGH, (clamped - 0.5) * 2);
  }
  return color;
}

function heightFromValue(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return MIN_HEIGHT + clamped * (MAX_HEIGHT - MIN_HEIGHT);
}

export class Block {
  mesh: THREE.Mesh;
  label: THREE.Sprite;
  row: number;
  col: number;
  index: number;

  private startHeight: number = BASE_HEIGHT;
  private targetHeight: number = BASE_HEIGHT;
  private startColor: THREE.Color = new THREE.Color(COLOR_LOW);
  private targetColor: THREE.Color = new THREE.Color(COLOR_LOW);
  private transitionStart: number = 0;
  private isTransitioning: boolean = false;
  private currentOpacity: number = 0.75;
  private isHovered: boolean = false;
  private currentScale: number = 1.0;
  private geometry: THREE.BoxGeometry;
  private material: THREE.MeshPhongMaterial;
  private labelCanvas: HTMLCanvasElement;
  private labelTexture: THREE.CanvasTexture;
  private labelCtx: CanvasRenderingContext2D;
  private currentValue: number = 0;

  constructor(row: number, col: number, index: number) {
    this.row = row;
    this.col = col;
    this.index = index;

    this.geometry = new THREE.BoxGeometry(BASE_SIZE, BASE_HEIGHT, BASE_SIZE);
    this.material = new THREE.MeshPhongMaterial({
      color: COLOR_LOW.clone(),
      transparent: true,
      opacity: this.currentOpacity,
      shininess: 40,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);

    const spacing = 1.1;
    this.mesh.position.set(
      col * spacing - 4,
      BASE_HEIGHT / 2,
      row * spacing - 4
    );
    this.mesh.userData = { blockIndex: index };

    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 128;
    this.labelCanvas.height = 48;
    this.labelCtx = this.labelCanvas.getContext('2d')!;
    this.labelTexture = new THREE.CanvasTexture(this.labelCanvas);
    this.labelTexture.minFilter = THREE.LinearFilter;

    const labelMat = new THREE.SpriteMaterial({
      map: this.labelTexture,
      transparent: true,
      depthTest: false,
    });
    this.label = new THREE.Sprite(labelMat);
    this.label.scale.set(1.0, 0.4, 1.0);
    this.label.position.set(0, BASE_HEIGHT / 2 + 0.3, 0);
    this.mesh.add(this.label);
    this.updateLabelText(0);
  }

  setData(value: number, timestamp: number): void {
    this.currentValue = value;
    this.startHeight = this.mesh.scale.y * BASE_HEIGHT;
    this.targetHeight = heightFromValue(value);
    this.startColor.copy(this.material.color);
    this.targetColor.copy(heatColor(value));
    this.transitionStart = timestamp;
    this.isTransitioning = true;
  }

  update(timestamp: number): void {
    if (this.isTransitioning) {
      const elapsed = timestamp - this.transitionStart;
      let t = Math.min(elapsed / TRANSITION_DURATION, 1);
      t = easeInOut(t);

      const newHeight = this.startHeight + (this.targetHeight - this.startHeight) * t;
      this.mesh.scale.y = newHeight / BASE_HEIGHT;
      this.mesh.position.y = newHeight / 2;

      this.material.color.copy(this.startColor).lerp(this.targetColor, t);

      if (t >= 1) {
        this.isTransitioning = false;
      }
    }

    const targetScale = this.isHovered ? HOVER_SCALE : 1.0;
    this.currentScale += (targetScale - this.currentScale) * 0.15;
    this.mesh.scale.x = this.currentScale;
    this.mesh.scale.z = this.currentScale;

    const targetOpacity = this.isHovered ? 0.9 : 0.75;
    this.currentOpacity += (targetOpacity - this.currentOpacity) * 0.15;
    this.material.opacity = this.currentOpacity;

    this.label.position.y = (this.mesh.scale.y * BASE_HEIGHT) / 2 + 0.3;
  }

  setHovered(hovered: boolean): void {
    this.isHovered = hovered;
  }

  getCurrentValue(): number {
    return this.currentValue;
  }

  getCurrentHeight(): number {
    return this.mesh.scale.y * BASE_HEIGHT;
  }

  private updateLabelText(value: number): void {
    const ctx = this.labelCtx;
    ctx.clearRect(0, 0, 128, 48);
    ctx.beginPath();
    ctx.moveTo(16, 4);
    ctx.lineTo(112, 4);
    ctx.quadraticCurveTo(118, 4, 118, 10);
    ctx.lineTo(118, 38);
    ctx.quadraticCurveTo(118, 44, 112, 44);
    ctx.lineTo(16, 44);
    ctx.quadraticCurveTo(10, 44, 10, 38);
    ctx.lineTo(10, 10);
    ctx.quadraticCurveTo(10, 4, 16, 4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value.toFixed(1), 64, 22);
    this.labelTexture.needsUpdate = true;
  }

  updateLabel(value: number): void {
    this.updateLabelText(value);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.labelTexture.dispose();
    (this.label.material as THREE.SpriteMaterial).dispose();
  }
}
