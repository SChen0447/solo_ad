import * as THREE from 'three';
import type { ClayData } from './clay-editor';
import type { FiringResult } from './kiln-controller';
import type { GlazeColor } from './glaze-module';

export interface GalleryRecipe {
  temperature: number;
  duration: number;
  glazes: GlazeColor[];
}

export class GalleryViewer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private potteryMesh: THREE.Mesh | null = null;
  private frameId: number | null = null;

  private targetRotationX = 0.3;
  private targetRotationY = 0;
  private currentRotationX = 0.3;
  private currentRotationY = 0;
  private damping = 0.15;

  private targetZoom = 1;
  private currentZoom = 1;
  private minZoom = 0.8;
  private maxZoom = 2;

  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private autoRotate = true;

  private clayData: ClayData;
  private firingResult: FiringResult;
  private recipe: GalleryRecipe;
  private initStartTime: number;

  constructor(
    container: HTMLElement,
    clayData: ClayData,
    firingResult: FiringResult,
    recipe: GalleryRecipe
  ) {
    this.container = container;
    this.clayData = clayData;
    this.firingResult = firingResult;
    this.recipe = recipe;
    this.initStartTime = performance.now();

    this.scene = new THREE.Scene();
    this.scene.background = null;

    const rect = container.getBoundingClientRect();
    this.camera = new THREE.PerspectiveCamera(
      40,
      rect.width / rect.height,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 6);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.buildPottery();
    this.bindEvents();
    this.buildRecipeUI();

    setTimeout(() => { this.animate(); }, 50);
    window.addEventListener('resize', this.onResize);
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(3, 4, 5);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffe8cc, 0.55);
    fillLight.position.set(-4, 2, 3);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xccddff, 0.35);
    rimLight.position.set(0, -2, -4);
    this.scene.add(rimLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.3);
    topLight.position.set(0, 6, 0);
    this.scene.add(topLight);

    const hemi = new THREE.HemisphereLight(0xfff2e0, 0xd4b896, 0.4);
    this.scene.add(hemi);
  }

  private buildPottery(): void {
    if (this.potteryMesh) {
      this.scene.remove(this.potteryMesh);
      this.potteryMesh.geometry.dispose();
      (this.potteryMesh.material as THREE.Material).dispose();
    }

    const { rows, centerY } = this.clayData;
    const heightScale = 2.2 / (rows[rows.length - 1].y - rows[0].y);
    const radiusScale = 1.6 / 120;
    const yCenter = (rows[0].y + rows[rows.length - 1].y) / 2;

    const points: THREE.Vector2[] = [];
    const colorMap: { y: number; color: { r: number; g: number; b: number } }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const x = row.currentRadius * radiusScale;
      const y = -(row.y - yCenter) * heightScale;
      points.push(new THREE.Vector2(x, y));

      const colorEntry = this.firingResult.kilnData.colorLayers.find(c =>
        Math.abs(c.y - row.y) < 8
      );
      if (colorEntry) {
        colorMap.push({ y, color: colorEntry.color });
      } else {
        const finalColor = this.firingResult.finalColors.get(i);
        if (finalColor) {
          colorMap.push({ y, color: finalColor });
        } else {
          colorMap.push({ y, color: { r: 193, g: 154, b: 107 } });
        }
      }
    }

    const topY = points[points.length - 1].y;
    const topRadius = points[points.length - 1].x;
    points.push(new THREE.Vector2(topRadius * 0.6, topY + 0.02));
    points.push(new THREE.Vector2(0, topY + 0.03));

    const segments = 96;
    const geometry = new THREE.LatheGeometry(points, segments);
    geometry.computeVertexNormals();

    const colors = new Float32Array(geometry.attributes.position.count * 3);
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const vy = positions.getY(i);
      const color = this.getColorAtHeight(vy, colorMap);
      colors[i * 3] = color.r / 255;
      colors[i * 3 + 1] = color.g / 255;
      colors[i * 3 + 2] = color.b / 255;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.28,
      metalness: 0.05,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
      reflectivity: 0.5,
      sheen: 0.15,
      sheenColor: new THREE.Color(0xfff5e0),
      envMapIntensity: 1
    });

    this.potteryMesh = new THREE.Mesh(geometry, material);
    this.potteryMesh.castShadow = true;
    this.potteryMesh.receiveShadow = true;

    this.scene.add(this.potteryMesh);
    this.addTurntable();

    const loadTime = performance.now() - this.initStartTime;
    console.log(`[GalleryViewer] 3D模型加载完成，耗时: ${loadTime.toFixed(0)}ms`);
  }

  private getColorAtHeight(
    height: number,
    colorMap: { y: number; color: { r: number; g: number; b: number } }[]
  ): { r: number; g: number; b: number } {
    if (colorMap.length === 0) return { r: 193, g: 154, b: 107 };
    if (colorMap.length === 1) return colorMap[0].color;

    let below = colorMap[0];
    let above = colorMap[colorMap.length - 1];

    for (let i = 0; i < colorMap.length - 1; i++) {
      if (height >= colorMap[i].y && height <= colorMap[i + 1].y) {
        below = colorMap[i];
        above = colorMap[i + 1];
        break;
      }
      if (height < colorMap[i].y) {
        if (i === 0) {
          return colorMap[0].color;
        }
        below = colorMap[i - 1];
        above = colorMap[i];
        break;
      }
    }

    const range = above.y - below.y;
    if (Math.abs(range) < 0.0001) return below.color;

    const t = Math.max(0, Math.min(1, (height - below.y) / range));
    return {
      r: Math.round(below.color.r + (above.color.r - below.color.r) * t),
      g: Math.round(below.color.g + (above.color.g - below.color.g) * t),
      b: Math.round(below.color.b + (above.color.b - below.color.b) * t)
    };
  }

  private addTurntable(): void {
    const platformGeo = new THREE.CylinderGeometry(1.4, 1.5, 0.08, 64);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0xd4c4a8,
      roughness: 0.7,
      metalness: 0.1
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -1.2;
    platform.receiveShadow = true;
    this.scene.add(platform);

    const shadowGeo = new THREE.CircleGeometry(1.3, 48);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.12
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.15;
    this.scene.add(shadow);
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'grab';

    const getPos = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e
        ? (e.touches[0]?.clientX ?? (e as TouchEvent).changedTouches[0].clientX)
        : e.clientX;
      const clientY = 'touches' in e
        ? (e.touches[0]?.clientY ?? (e as TouchEvent).changedTouches[0].clientY)
        : e.clientY;
      return { x: clientX, y: clientY };
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      this.isDragging = true;
      this.autoRotate = false;
      const pos = getPos(e);
      this.lastMouseX = pos.x;
      this.lastMouseY = pos.y;
      canvas.style.cursor = 'grabbing';
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging) return;
      e.preventDefault();
      const pos = getPos(e);
      const dx = pos.x - this.lastMouseX;
      const dy = pos.y - this.lastMouseY;

      this.targetRotationY += dx * 0.008;
      this.targetRotationX += dy * 0.008;
      this.targetRotationX = Math.max(-1.2, Math.min(1.2, this.targetRotationX));

      this.lastMouseX = pos.x;
      this.lastMouseY = pos.y;
    };

    const onUp = () => {
      this.isDragging = false;
      canvas.style.cursor = 'grab';
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1.1 : 0.9;
      this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * delta));
    };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
  }

  private buildRecipeUI(): void {
    const recipeContainer = document.getElementById('recipeCard');
    if (!recipeContainer) return;

    const { temperature, duration, glazes } = this.recipe;

    recipeContainer.innerHTML = `
      <div class="recipe-title">🏺 作品配方记录</div>
      <div class="recipe-grid">
        <div class="recipe-item">
          <div class="recipe-label">烧制温度</div>
          <div class="recipe-value temp">${temperature}°C</div>
        </div>
        <div class="recipe-item">
          <div class="recipe-label">烧制时长</div>
          <div class="recipe-value time">${duration}秒</div>
        </div>
        <div class="recipe-item">
          <div class="recipe-label">釉色配方</div>
          <div class="glaze-list" id="glazeChips">
            ${glazes.length > 0
              ? glazes.map(g => `
                <span class="glaze-chip">
                  <span class="glaze-chip-dot" style="background:${g.hex}"></span>
                  ${g.name}
                </span>
              `).join('')
              : '<span style="color:#A0896B;font-size:13px">未上釉</span>'
            }
          </div>
        </div>
      </div>
    `;
  }

  private onResize = (): void => {
    const rect = this.container.getBoundingClientRect();
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height);
  };

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);

    if (this.autoRotate && !this.isDragging) {
      this.targetRotationY += 0.004;
    }

    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * this.damping;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * this.damping;
    this.currentZoom += (this.targetZoom - this.currentZoom) * this.damping;

    if (this.potteryMesh) {
      this.potteryMesh.rotation.x = this.currentRotationX;
      this.potteryMesh.rotation.y = this.currentRotationY;
      this.potteryMesh.scale.setScalar(this.currentZoom);
    }

    this.camera.position.z = 6 / this.currentZoom;

    this.renderer.render(this.scene, this.camera);
  };

  updateData(clayData: ClayData, firingResult: FiringResult, recipe: GalleryRecipe): void {
    this.clayData = clayData;
    this.firingResult = firingResult;
    this.recipe = recipe;
    this.buildPottery();
    this.buildRecipeUI();
  }

  resetView(): void {
    this.targetRotationX = 0.3;
    this.targetRotationY = 0;
    this.targetZoom = 1;
    this.autoRotate = true;
  }

  destroy(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.onResize);
    if (this.potteryMesh) {
      this.scene.remove(this.potteryMesh);
      this.potteryMesh.geometry.dispose();
      (this.potteryMesh.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
