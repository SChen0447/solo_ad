import * as THREE from 'three';

interface TrailPoint {
  position: THREE.Vector3;
  time: number;
  opacity: number;
}

interface Ripple {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  time: number;
  mesh: THREE.Mesh;
}

interface GlowParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

export class EffectManager {
  private scene: THREE.Scene;
  private audioContext: AudioContext | null;
  private trailPoints: TrailPoint[];
  private trailMaxPoints: number = 60;
  private trailMesh: THREE.Points | null;
  private trailGeometry: THREE.BufferGeometry | null;
  private ripples: Ripple[];
  private glowParticles: GlowParticle[];
  private glowMesh: THREE.Points | null;
  private glowGeometry: THREE.BufferGeometry | null;
  private maxParticles: number = 200;
  private portalMesh: THREE.Group | null;
  private keyMeshes: Map<number, { mesh: THREE.Mesh; basePos: THREE.Vector3 }>;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.audioContext = null;
    this.trailPoints = [];
    this.ripples = [];
    this.glowParticles = [];
    this.keyMeshes = new Map();
    this.trailMesh = null;
    this.trailGeometry = null;
    this.glowMesh = null;
    this.glowGeometry = null;
    this.portalMesh = null;
  }

  private initAudio(): void {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext();
      } catch {
        this.audioContext = null;
      }
    }
  }

  public createPlayerGlow(playerPos: THREE.Vector3): THREE.Group {
    const group = new THREE.Group();

    const sphereGeo = new THREE.SphereGeometry(0.4, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xffd54a,
      transparent: true,
      opacity: 0.95
    });
    const core = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(core);

    const glowGeo = new THREE.SphereGeometry(0.6, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffaa40,
      transparent: true,
      opacity: 0.35
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    this.createGlowParticles();
    this.createTrail();

    return group;
  }

  private createGlowParticles(): void {
    this.glowGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    this.glowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.glowGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.glowMesh = new THREE.Points(this.glowGeometry, particleMat);
    this.scene.add(this.glowMesh);
  }

  private createTrail(): void {
    this.trailGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.trailMaxPoints * 3);
    const colors = new Float32Array(this.trailMaxPoints * 3);
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const trailMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.trailMesh = new THREE.Points(this.trailGeometry, trailMat);
    this.scene.add(this.trailMesh);
  }

  public updatePlayerEffects(playerPos: THREE.Vector3, time: number, deltaTime: number): void {
    this.updateGlowParticles(playerPos, time, deltaTime);
    this.updateTrail(playerPos);
    this.updateRipples(deltaTime);
    this.updateKeys(time);
  }

  private updateGlowParticles(playerPos: THREE.Vector3, time: number, deltaTime: number): void {
    if (!this.glowGeometry || !this.glowMesh) return;

    const posAttr = this.glowGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.glowGeometry.getAttribute('color') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;

    for (let i = this.glowParticles.length - 1; i >= 0; i--) {
      const p = this.glowParticles[i];
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.glowParticles.splice(i, 1);
      } else {
        p.position.addScaledVector(p.velocity, deltaTime);
      }
    }

    if (this.glowParticles.length < this.maxParticles) {
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.3 + Math.random() * 0.3;
        const yOffset = (Math.random() - 0.5) * 0.6;
        const offset = new THREE.Vector3(
          Math.cos(angle) * radius,
          yOffset,
          Math.sin(angle) * radius
        );
        this.glowParticles.push({
          position: playerPos.clone().add(offset),
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4
          ),
          life: 0.6 + Math.random() * 0.4,
          maxLife: 1.0,
          size: 0.08 + Math.random() * 0.06
        });
      }
    }

    const count = Math.min(this.glowParticles.length, this.maxParticles);
    for (let i = 0; i < this.maxParticles; i++) {
      if (i < count) {
        const p = this.glowParticles[i];
        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;
        const t = p.life / p.maxLife;
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.75 + 0.25 * t;
        colors[i * 3 + 2] = 0.25 * t;
      } else {
        positions[i * 3] = 9999;
        positions[i * 3 + 1] = 9999;
        positions[i * 3 + 2] = 9999;
      }
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  private updateTrail(playerPos: THREE.Vector3): void {
    if (!this.trailGeometry || !this.trailMesh) return;

    this.trailPoints.push({
      position: playerPos.clone(),
      time: performance.now() / 1000,
      opacity: 1
    });

    if (this.trailPoints.length > this.trailMaxPoints) {
      this.trailPoints.shift();
    }

    const posAttr = this.trailGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.trailGeometry.getAttribute('color') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;

    for (let i = 0; i < this.trailMaxPoints; i++) {
      if (i < this.trailPoints.length) {
        const point = this.trailPoints[i];
        positions[i * 3] = point.position.x;
        positions[i * 3 + 1] = point.position.y - 0.2;
        positions[i * 3 + 2] = point.position.z;
        const t = i / this.trailPoints.length;
        colors[i * 3] = 1.0 * t;
        colors[i * 3 + 1] = 0.7 * t;
        colors[i * 3 + 2] = 0.15 * t;
      } else {
        positions[i * 3] = 9999;
        positions[i * 3 + 1] = 9999;
        positions[i * 3 + 2] = 9999;
      }
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public createWallRipple(position: THREE.Vector3, normal: THREE.Vector3): void {
    const rippleGeo = new THREE.RingGeometry(0.1, 0.3, 32);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0x6a4fb8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(rippleGeo, rippleMat);
    mesh.position.copy(position);
    mesh.lookAt(position.clone().add(normal));
    this.scene.add(mesh);

    this.ripples.push({
      position: position.clone(),
      normal: normal.clone(),
      time: 0,
      mesh
    });

    this.playHumSound();
  }

  private updateRipples(deltaTime: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.time += deltaTime;
      const t = ripple.time / 0.6;
      if (t >= 1) {
        this.scene.remove(ripple.mesh);
        ripple.mesh.geometry.dispose();
        (ripple.mesh.material as THREE.Material).dispose();
        this.ripples.splice(i, 1);
      } else {
        const scale = 1 + t * 3;
        ripple.mesh.scale.set(scale, scale, 1);
        (ripple.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - t);
      }
    }
  }

  public createKeyFragment(position: THREE.Vector3, index: number): THREE.Mesh {
    const keyGeo = new THREE.OctahedronGeometry(0.3, 2);
    const keyMat = new THREE.MeshBasicMaterial({
      color: 0xffd54a,
      transparent: true,
      opacity: 0.95
    });
    const mesh = new THREE.Mesh(keyGeo, keyMat);
    mesh.position.copy(position);
    this.scene.add(mesh);
    this.keyMeshes.set(index, { mesh, basePos: position.clone() });
    return mesh;
  }

  private updateKeys(time: number): void {
    this.keyMeshes.forEach(({ mesh, basePos }) => {
      mesh.rotation.y += 0.02;
      mesh.rotation.x += 0.01;
      mesh.position.y = basePos.y + Math.sin(time * 2) * 0.15;
    });
  }

  public setKeyPulse(index: number, active: boolean, time: number): void {
    const keyData = this.keyMeshes.get(index);
    if (!keyData) return;
    const mat = keyData.mesh.material as THREE.MeshBasicMaterial;
    if (active) {
      const pulse = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 / 1.5);
      mat.color.setHSL(0.12, 1, 0.5 + pulse * 0.3);
      mat.opacity = 0.85 + pulse * 0.15;
    } else {
      mat.color.setHex(0xffd54a);
      mat.opacity = 0.95;
    }
  }

  public collectKey(index: number): void {
    const keyData = this.keyMeshes.get(index);
    if (keyData) {
      this.scene.remove(keyData.mesh);
      this.keyMeshes.delete(index);
    }
  }

  public createPortal(position: THREE.Vector3, forward: THREE.Vector3): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(position);

    const frameGeo = new THREE.TorusGeometry(1.2, 0.12, 16, 48);
    const frameMat = new THREE.MeshBasicMaterial({
      color: 0x8a4fff,
      transparent: true,
      opacity: 0.95
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.rotation.x = Math.PI / 2;
    group.add(frame);

    const innerGeo = new THREE.CircleGeometry(1.1, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x4a1fa0,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.x = Math.PI / 2;
    group.add(inner);

    group.lookAt(position.clone().add(forward));

    this.scene.add(group);
    this.portalMesh = group;
    return group;
  }

  public updatePortal(time: number): void {
    if (this.portalMesh) {
      this.portalMesh.children.forEach((child, i) => {
        if (i === 0) {
          child.rotation.z += 0.02;
        }
      });
    }
  }

  public removePortal(): void {
    if (this.portalMesh) {
      this.scene.remove(this.portalMesh);
      this.portalMesh = null;
    }
  }

  private playHumSound(): void {
    this.initAudio();
    if (!this.audioContext) return;
    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.value = 80;
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      gain.gain.setValueAtTime(0.12, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
      osc.start();
      osc.stop(this.audioContext.currentTime + 0.2);
    } catch {
    }
  }

  public playPickupSound(): void {
    this.initAudio();
    if (!this.audioContext) return;
    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
      osc.start();
      osc.stop(this.audioContext.currentTime + 0.2);
    } catch {
    }
  }

  public playPortalSound(): void {
    this.initAudio();
    if (!this.audioContext) return;
    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
      osc.start();
      osc.stop(this.audioContext.currentTime + 0.5);
    } catch {
    }
  }

  public clearAll(): void {
    this.removePortal();
    this.keyMeshes.forEach(({ mesh }) => {
      this.scene.remove(mesh);
    });
    this.keyMeshes.clear();
    this.ripples.forEach(r => {
      this.scene.remove(r.mesh);
    });
    this.ripples.length = 0;
    this.trailPoints.length = 0;
    this.glowParticles.length = 0;
  }
}
