import * as THREE from 'three';
import { GiftAnimation } from './GiftAnimation';

export class Scene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animations: GiftAnimation[] = [];
  private animationFrameId: number = 0;
  private clock: THREE.Clock;

  constructor(container: HTMLElement) {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 10);

    const ambientLight = new THREE.AmbientLight(0x4040ff, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(5, 5, 10);
    this.scene.add(pointLight);

    const targetGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const targetMat = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      emissive: 0xffa500,
      emissiveIntensity: 0.5,
    });
    const targetMesh = new THREE.Mesh(targetGeo, targetMat);
    targetMesh.position.set(0, 0, 0);
    this.scene.add(targetMesh);

    const ringGeo = new THREE.RingGeometry(0.8, 1.0, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    this.scene.add(ring);

    const starCount = 200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 40;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 10;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.6 });
    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onResize.bind(this));
    this.animate();
  }

  private onResize(): void {
    const container = this.renderer.domElement.parentElement;
    if (!container) return;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    this.clock.getDelta();

    const now = performance.now();
    this.animations = this.animations.filter((anim) => {
      const alive = anim.update(now);
      if (!alive) {
        anim.remove(this.scene);
      }
      return alive;
    });

    this.renderer.render(this.scene, this.camera);
  }

  addGiftAnimation(giftName: string, giftValue: number, iconUrl: string): void {
    const startX = -8 + Math.random() * 2;
    const startY = -3 + Math.random() * 6;
    const endX = 0;
    const endY = 0;

    const anim = new GiftAnimation(
      startX,
      startY,
      endX,
      endY,
      giftName,
      giftValue,
      iconUrl
    );
    anim.addToScene(this.scene);
    this.animations.push(anim);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize.bind(this));
    this.animations.forEach((anim) => anim.remove(this.scene));
    this.animations = [];
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
