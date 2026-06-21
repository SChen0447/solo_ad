import * as THREE from 'three';

export class EnvironmentManager {
  public scene: THREE.Scene;
  public ambientLight: THREE.AmbientLight;
  public directionalLight: THREE.DirectionalLight;
  public lightSphere: THREE.Mesh;
  public lightGlow: THREE.Mesh;
  public ground: THREE.Mesh;
  public lightTrail: THREE.Line | null = null;
  public trailStartTime: number = 0;
  public lastLightPosition: THREE.Vector3 = new THREE.Vector3();
  public lightColor: THREE.Color = new THREE.Color(0xffffff);
  public lightHorizontalAngle: number = 0;
  public lightIntensity: number = 1;
  public verticalAngle: number = Math.PI / 4;

  private readonly LIGHT_DISTANCE: number = 8;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.ambientLight = new THREE.AmbientLight();
    this.directionalLight = new THREE.DirectionalLight();
    this.lightSphere = new THREE.Mesh();
    this.lightGlow = new THREE.Mesh();
    this.ground = new THREE.Mesh();
  }

  public init(): void {
    this.setupBackground();
    this.setupGround();
    this.setupLights();
    this.setupLightIndicator();
    this.setupChair();
    this.updateLightPosition();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#e8eee8');
    gradient.addColorStop(0.7, '#c8e0c8');
    gradient.addColorStop(1, '#a8d0a8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupGround(): void {
    const groundGeo = new THREE.CircleGeometry(15, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xb8c8b8,
      roughness: 0.9,
      metalness: 0.0
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -1.5;
    this.scene.add(this.ground);
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.castShadow = false;
    this.scene.add(this.directionalLight);
    this.scene.add(this.directionalLight.target);
  }

  private setupLightIndicator(): void {
    const sphereGeo = new THREE.SphereGeometry(0.3, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      emissive: 0xffffff,
      emissiveIntensity: 1,
      roughness: 0.3,
      metalness: 0.0
    });
    this.lightSphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.scene.add(this.lightSphere);

    const glowGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25
    });
    this.lightGlow = new THREE.Mesh(glowGeo, glowMat);
    this.scene.add(this.lightGlow);
  }

  private setupChair(): void {
    const chairGroup = new THREE.Group();

    const seatGeo = new THREE.BoxGeometry(1.2, 0.08, 1.2);
    const seatMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      roughness: 0.5
    });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.y = 0;
    chairGroup.add(seat);

    const backGeo = new THREE.BoxGeometry(1.2, 1.0, 0.08);
    const back = new THREE.Mesh(backGeo, seatMat);
    back.position.set(0, 0.5, -0.56);
    chairGroup.add(back);

    const legGeo = new THREE.BoxGeometry(0.08, 0.8, 0.08);
    const legPositions = [
      [-0.5, -0.4, -0.5],
      [0.5, -0.4, -0.5],
      [-0.5, -0.4, 0.5],
      [0.5, -0.4, 0.5]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, seatMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      chairGroup.add(leg);
    });

    chairGroup.position.set(3, -0.7, 0);
    chairGroup.rotation.y = -Math.PI / 8;
    this.scene.add(chairGroup);
  }

  public updateLightParams(horizontalAngle: number, intensity: number, color: THREE.Color): void {
    const oldPos = this.lightSphere.position.clone();
    this.lightHorizontalAngle = horizontalAngle;
    this.lightIntensity = intensity;
    this.lightColor = color;
    this.updateLightPosition();
    const newPos = this.lightSphere.position.clone();
    this.createLightTrail(oldPos, newPos);
    this.lastLightPosition.copy(newPos);
  }

  private updateLightPosition(): void {
    const hRad = (this.lightHorizontalAngle * Math.PI) / 180;
    const vRad = this.verticalAngle;
    const x = this.LIGHT_DISTANCE * Math.cos(vRad) * Math.cos(hRad);
    const y = this.LIGHT_DISTANCE * Math.sin(vRad);
    const z = this.LIGHT_DISTANCE * Math.cos(vRad) * Math.sin(hRad);
    this.lightSphere.position.set(x, y, z);
    this.lightGlow.position.copy(this.lightSphere.position);
    this.directionalLight.position.copy(this.lightSphere.position);
    this.directionalLight.target.position.set(0, 0.5, 0);
    this.directionalLight.color.copy(this.lightColor);
    this.directionalLight.intensity = this.lightIntensity;
    (this.lightSphere.material as THREE.MeshStandardMaterial).color.copy(this.lightColor);
    (this.lightSphere.material as THREE.MeshStandardMaterial).emissive.copy(this.lightColor);
    (this.lightSphere.material as THREE.MeshStandardMaterial).emissiveIntensity = this.lightIntensity;
    (this.lightGlow.material as THREE.MeshBasicMaterial).color.copy(this.lightColor);
    this.ambientLight.intensity = 0.2 + 0.15 * this.lightIntensity;
  }

  private createLightTrail(from: THREE.Vector3, to: THREE.Vector3): void {
    if (this.lightTrail) {
      this.scene.remove(this.lightTrail);
      this.lightTrail.geometry.dispose();
    }
    const points = [from, to];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 1
    });
    this.lightTrail = new THREE.Line(geometry, material);
    this.scene.add(this.lightTrail);
    this.trailStartTime = performance.now();
  }

  public updateTrail(_deltaTime: number): void {
    if (this.lightTrail) {
      const elapsed = (performance.now() - this.trailStartTime) / 1000;
      if (elapsed >= 0.3) {
        this.scene.remove(this.lightTrail);
        this.lightTrail.geometry.dispose();
        this.lightTrail = null;
      } else {
        const mat = this.lightTrail.material as THREE.LineBasicMaterial;
        mat.opacity = 1 - elapsed / 0.3;
      }
    }
  }

  public getLightDirection(): THREE.Vector3 {
    return new THREE.Vector3().copy(this.lightSphere.position).normalize();
  }
}
