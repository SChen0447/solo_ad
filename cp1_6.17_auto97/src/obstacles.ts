import * as THREE from 'three';
import { GameScene } from './gameScene';
import { SoundFX } from './soundFX';

interface RotatingFence {
  group: THREE.Group;
  pivot: THREE.Vector3;
  rotationSpeed: number;
  baseSpeed: number;
  bars: THREE.Mesh[];
  radius: number;
}

interface FloatingPlatform {
  mesh: THREE.Mesh;
  baseY: number;
  amplitude: number;
  period: number;
  phase: number;
  pressedAmount: number;
  originalColor: THREE.Color;
}

export class ObstacleManager {
  private scene: THREE.Scene;
  private gameScene: GameScene;
  private soundFX: SoundFX;
  private fences: RotatingFence[] = [];
  private platforms: FloatingPlatform[] = [];
  private speedMultiplier = 1;

  constructor(gameScene: GameScene, soundFX: SoundFX) {
    this.scene = gameScene.scene;
    this.gameScene = gameScene;
    this.soundFX = soundFX;
    this.createObstacles();
  }

  private createObstacles(): void {
    const midX = Math.floor(this.gameScene.gridWidth / 2);

    const fencePositions = [
      { gridX: midX, gridZ: 3, bars: 3 },
      { gridX: midX, gridZ: 8, bars: 4 },
      { gridX: midX - 2, gridZ: 5, bars: 3 },
      { gridX: midX + 2, gridZ: 11, bars: 3 }
    ];

    for (const fp of fencePositions) {
      const tile = this.gameScene.tiles[fp.gridX]?.[fp.gridZ];
      if (!tile) continue;
      this.createRotatingFence(
        tile.mesh.position.x,
        tile.mesh.position.z,
        fp.bars,
        15
      );
    }

    const platformPositions = [
      { gridX: midX - 2, gridZ: 2 },
      { gridX: midX + 2, gridZ: 5 },
      { gridX: midX, gridZ: 6 },
      { gridX: midX - 1, gridZ: 9 },
      { gridX: midX + 1, gridZ: 10 },
      { gridX: midX + 3, gridZ: 12 },
      { gridX: midX - 1, gridZ: 13 }
    ];

    for (const pp of platformPositions) {
      const tile = this.gameScene.tiles[pp.gridX]?.[pp.gridZ];
      if (!tile) continue;
      this.createFloatingPlatform(
        tile.mesh.position.x,
        tile.mesh.position.z
      );
    }
  }

  private createRotatingFence(worldX: number, worldZ: number, barCount: number, speedDeg: number): void {
    const group = new THREE.Group();
    group.position.set(worldX, 0, worldZ);

    const radius = this.gameScene.tileSize * 0.72;
    const bars: THREE.Mesh[] = [];
    const barHeight = 1.5;

    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, barHeight + 0.6, 12);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a4a,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0xff2244,
      emissiveIntensity: 0.25
    });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = barHeight / 2 + 0.3;
    pole.castShadow = true;
    group.add(pole);

    const capGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xff3355,
      emissive: 0xff3355,
      emissiveIntensity: 1.2,
      metalness: 0.9,
      roughness: 0.15
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = barHeight + 0.6;
    group.add(cap);

    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const barGroup = new THREE.Group();
      barGroup.rotation.y = angle;

      const barGeo = new THREE.BoxGeometry(radius * 2, 0.12, 0.18);
      const barMat = new THREE.MeshStandardMaterial({
        color: 0xcc2244,
        metalness: 0.75,
        roughness: 0.3,
        emissive: 0xaa1133,
        emissiveIntensity: 0.35
      });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(0, barHeight / 2 + 0.3, 0);
      bar.castShadow = true;

      const tipGeo = new THREE.BoxGeometry(0.18, 0.3, 0.35);
      const tipMat = new THREE.MeshStandardMaterial({
        color: 0xff4466,
        emissive: 0xff4466,
        emissiveIntensity: 1.0,
        metalness: 0.8,
        roughness: 0.2
      });
      const tip1 = new THREE.Mesh(tipGeo, tipMat);
      tip1.position.set(radius, barHeight / 2 + 0.3, 0);
      const tip2 = new THREE.Mesh(tipGeo, tipMat);
      tip2.position.set(-radius, barHeight / 2 + 0.3, 0);

      barGroup.add(bar, tip1, tip2);
      group.add(barGroup);
      bars.push(bar);
    }

    const light = new THREE.PointLight(0xff2244, 0.8, 8, 1.8);
    light.position.y = barHeight + 0.6;
    group.add(light);

    this.scene.add(group);
    this.fences.push({
      group,
      pivot: new THREE.Vector3(worldX, 0, worldZ),
      rotationSpeed: THREE.MathUtils.degToRad(speedDeg),
      baseSpeed: THREE.MathUtils.degToRad(speedDeg),
      bars,
      radius
    });
  }

  private createFloatingPlatform(worldX: number, worldZ: number): void {
    const size = this.gameScene.tileSize * 0.85;
    const geo = new THREE.BoxGeometry(size, 0.35, size);
    const color = new THREE.Color(0x3366aa);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.55,
      roughness: 0.35,
      emissive: color.clone().multiplyScalar(0.3),
      transparent: true,
      opacity: 0.92
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(worldX, 0.3, worldZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const edges = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x44aaff,
      transparent: true,
      opacity: 0.7
    });
    const edgeLines = new THREE.LineSegments(edges, edgeMat);
    mesh.add(edgeLines);

    const beamGeo = new THREE.CylinderGeometry(0.06, 0.04, 2.5, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x44aaff,
      transparent: true,
      opacity: 0.3
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(worldX, -0.95, worldZ);
    this.scene.add(beam);

    this.scene.add(mesh);
    this.platforms.push({
      mesh,
      baseY: 0.3,
      amplitude: 2.0,
      period: 6.0,
      phase: Math.random() * Math.PI * 2,
      pressedAmount: 0,
      originalColor: color
    });
  }

  public update(delta: number, elapsed: number): void {
    for (const fence of this.fences) {
      fence.group.rotation.y += fence.rotationSpeed * this.speedMultiplier * delta;
    }

    for (const platform of this.platforms) {
      const floatOffset = Math.sin((elapsed / platform.period) * Math.PI * 2 + platform.phase) * platform.amplitude * 0.5;
      platform.pressedAmount *= Math.pow(0.001, delta);
      const targetY = platform.baseY + floatOffset - platform.pressedAmount;
      platform.mesh.position.y += (targetY - platform.mesh.position.y) * Math.min(1, delta * 15);

      const mat = platform.mesh.material as THREE.MeshStandardMaterial;
      const glowIntensity = 0.25 + Math.sin(elapsed * 2 + platform.phase) * 0.1;
      mat.emissive.copy(platform.originalColor).multiplyScalar(glowIntensity);
    }
  }

  public increaseDifficulty(amountDeg: number = 5): void {
    for (const fence of this.fences) {
      fence.rotationSpeed += THREE.MathUtils.degToRad(amountDeg);
    }
    this.speedMultiplier = 1 + (this.fences[0]?.rotationSpeed - this.fences[0]?.baseSpeed || 0) / THREE.MathUtils.degToRad(15);
  }

  public checkFenceCollision(ballPos: THREE.Vector3, ballRadius: number): boolean {
    for (const fence of this.fences) {
      const dx = ballPos.x - fence.pivot.x;
      const dz = ballPos.z - fence.pivot.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > fence.radius + ballRadius + 0.5) continue;

      const barCount = fence.group.children.length - 3;
      for (let i = 0; i < barCount; i++) {
        const angle = fence.group.rotation.y + (i / barCount) * Math.PI * 2;
        for (const end of [-1, 1]) {
          const barEndX = fence.pivot.x + Math.cos(angle) * fence.radius * end;
          const barEndZ = fence.pivot.z + Math.sin(angle) * fence.radius * end;

          const barStartX = fence.pivot.x - Math.cos(angle) * fence.radius * end;
          const barStartZ = fence.pivot.z - Math.sin(angle) * fence.radius * end;

          const closest = this.closestPointOnSegment(
            ballPos.x, ballPos.z,
            barStartX, barStartZ,
            barEndX, barEndZ
          );
          const ddx = ballPos.x - closest.x;
          const ddz = ballPos.z - closest.z;
          const dDist = Math.sqrt(ddx * ddx + ddz * ddz);

          if (dDist < ballRadius + 0.18 && ballPos.y < 2.2 && ballPos.y > 0.1) {
            return true;
          }
        }
      }
    }
    return false;
  }

  public checkPlatformCollision(ballPos: THREE.Vector3, ballRadius: number): { hit: boolean; pushY: number; platform: FloatingPlatform | null } {
    let result = { hit: false, pushY: 0, platform: null as FloatingPlatform | null };
    for (const platform of this.platforms) {
      const half = (this.gameScene.tileSize * 0.85) / 2;
      const px = platform.mesh.position.x;
      const py = platform.mesh.position.y;
      const pz = platform.mesh.position.z;

      if (
        ballPos.x >= px - half - ballRadius &&
        ballPos.x <= px + half + ballRadius &&
        ballPos.z >= pz - half - ballRadius &&
        ballPos.z <= pz + half + ballRadius
      ) {
        const topY = py + 0.175;
        const distToTop = ballPos.y - ballRadius - topY;
        if (distToTop < 0.15 && distToTop > -0.5) {
          result = { hit: true, pushY: topY + ballRadius, platform };
          break;
        }
      }
    }
    return result;
  }

  public pressPlatform(platform: FloatingPlatform): void {
    platform.pressedAmount = 0.5;
    this.soundFX.playPlatform();
  }

  private closestPointOnSegment(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): { x: number; z: number } {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const lenSq = dx * dx + dz * dz;
    if (lenSq === 0) return { x: x1, z: z1 };
    let t = ((px - x1) * dx + (pz - z1) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return { x: x1 + t * dx, z: z1 + t * dz };
  }

  public reset(): void {
    for (const fence of this.fences) {
      fence.rotationSpeed = fence.baseSpeed;
      fence.group.rotation.y = 0;
    }
    this.speedMultiplier = 1;
    for (const platform of this.platforms) {
      platform.pressedAmount = 0;
    }
  }
}
