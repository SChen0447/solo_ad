import * as THREE from 'three';
import { TowerType, Game } from './main';
import { Enemy } from './enemyManager';

interface TowerStats {
  range: number;
  damage: number;
  fireRate: number;
  cost: number;
  color: number;
}

interface Tower {
  group: THREE.Group;
  type: TowerType;
  slotIndex: number;
  stats: TowerStats;
  cooldown: number;
  rangeRing: THREE.Mesh;
  buildProgress: number;
  target: Enemy | null;
  barrel?: THREE.Object3D;
  antenna?: THREE.Object3D;
}

interface Projectile {
  mesh: THREE.Object3D;
  type: TowerType;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  target: Enemy | null;
  damage: number;
  life: number;
  trail?: THREE.Points;
  trailPositions?: Float32Array;
}

const TOWER_STATS: Record<TowerType, TowerStats> = {
  laser: { range: 6, damage: 1, fireRate: 0.4, cost: 50, color: 0x00ddff },
  missile: { range: 8, damage: 2, fireRate: 1.2, cost: 80, color: 0xff4444 },
  electromagnetic: { range: 10, damage: 3, fireRate: 1.8, cost: 120, color: 0xcc66ff }
};

export class TowerManager {
  scene: THREE.Scene;
  game: Game;
  towers: Tower[] = [];
  projectiles: Projectile[] = [];

  constructor(scene: THREE.Scene, game: Game) {
    this.scene = scene;
    this.game = game;
  }

  getTowerCost(type: TowerType): number {
    return TOWER_STATS[type].cost;
  }

  getTowerMeshes(): THREE.Object3D[] {
    return this.towers.map(t => t.group);
  }

  noProjectiles(): boolean {
    return this.projectiles.length === 0;
  }

  hideAllRanges() {
    this.towers.forEach(t => t.rangeRing.visible = false);
  }

  toggleRange(index: number) {
    const tower = this.towers.find(t => t.slotIndex === index);
    if (tower) {
      const newVisible = !tower.rangeRing.visible;
      this.hideAllRanges();
      tower.rangeRing.visible = newVisible;
    }
  }

  createTower(position: THREE.Vector3, slotIndex: number, type: TowerType) {
    const stats = TOWER_STATS[type];
    const group = new THREE.Group();
    group.position.copy(position);
    group.userData.towerIndex = slotIndex;
    group.visible = false;

    this.buildTowerVisual(group, type);

    const ringGeom = new THREE.RingGeometry(stats.range - 0.05, stats.range, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: stats.color,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    ring.visible = false;
    group.add(ring);

    const baseGeom = new THREE.CylinderGeometry(0.9, 1.0, 0.25, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x333355,
      metalness: 0.7,
      roughness: 0.4
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = 0.125;
    base.castShadow = true;
    group.add(base);

    this.scene.add(group);

    const tower: Tower = {
      group,
      type,
      slotIndex,
      stats,
      cooldown: 0,
      rangeRing: ring,
      buildProgress: 0,
      target: null
    };

    this.towers.push(tower);
    this.playBuildAnimation(tower);
  }

  buildTowerVisual(group: THREE.Group, type: TowerType) {
    if (type === 'laser') {
      const barrelGroup = new THREE.Group();
      const bodyGeom = new THREE.CylinderGeometry(0.18, 0.3, 1.6, 12);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x224466,
        metalness: 0.8,
        roughness: 0.3,
        emissive: 0x003366,
        emissiveIntensity: 0.3
      });
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 1.1;
      body.castShadow = true;
      barrelGroup.add(body);

      const tipGeom = new THREE.ConeGeometry(0.22, 0.4, 12);
      const tipMat = new THREE.MeshBasicMaterial({
        color: 0x00ddff,
        transparent: true,
        opacity: 0.9
      });
      const tip = new THREE.Mesh(tipGeom, tipMat);
      tip.position.y = 2.1;
      barrelGroup.add(tip);

      const glowGeom = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ddff,
        transparent: true,
        opacity: 0.4
      });
      const glow = new THREE.Mesh(glowGeom, glowMat);
      glow.position.y = 1.3;
      barrelGroup.add(glow);

      barrelGroup.position.y = 0.3;
      group.add(barrelGroup);
      (group as any).barrel = barrelGroup;
    } else if (type === 'missile') {
      const barrelGroup = new THREE.Group();
      const bodyGeom = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 10);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x662222,
        metalness: 0.6,
        roughness: 0.5,
        emissive: 0x441111,
        emissiveIntensity: 0.2
      });
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 0.95;
      body.castShadow = true;
      barrelGroup.add(body);

      for (let i = 0; i < 3; i++) {
        const tubeGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.9, 8);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: 0x883333,
          metalness: 0.7,
          roughness: 0.4
        });
        const tube = new THREE.Mesh(tubeGeom, tubeMat);
        const angle = (i / 3) * Math.PI * 2;
        tube.position.set(Math.cos(angle) * 0.22, 1.4, Math.sin(angle) * 0.22);
        tube.castShadow = true;
        barrelGroup.add(tube);
      }

      const topGeom = new THREE.CylinderGeometry(0.35, 0.4, 0.2, 10);
      const topMat = new THREE.MeshStandardMaterial({
        color: 0xaa3333,
        metalness: 0.8,
        roughness: 0.3,
        emissive: 0xff2222,
        emissiveIntensity: 0.2
      });
      const top = new THREE.Mesh(topGeom, topMat);
      top.position.y = 1.65;
      barrelGroup.add(top);

      barrelGroup.position.y = 0.3;
      group.add(barrelGroup);
      (group as any).barrel = barrelGroup;
    } else if (type === 'electromagnetic') {
      const barrelGroup = new THREE.Group();
      const baseBodyGeom = new THREE.CylinderGeometry(0.35, 0.45, 0.8, 12);
      const baseBodyMat = new THREE.MeshStandardMaterial({
        color: 0x332244,
        metalness: 0.7,
        roughness: 0.4
      });
      const baseBody = new THREE.Mesh(baseBodyGeom, baseBodyMat);
      baseBody.position.y = 0.7;
      baseBody.castShadow = true;
      barrelGroup.add(baseBody);

      const poleGeom = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8);
      const poleMat = new THREE.MeshStandardMaterial({
        color: 0x553366,
        metalness: 0.8,
        roughness: 0.3
      });
      const pole = new THREE.Mesh(poleGeom, poleMat);
      pole.position.y = 1.8;
      barrelGroup.add(pole);

      const antennaGroup = new THREE.Group();
      const dishGeom = new THREE.TorusGeometry(0.5, 0.06, 8, 24);
      const dishMat = new THREE.MeshStandardMaterial({
        color: 0xaa66ff,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x8844cc,
        emissiveIntensity: 0.4
      });
      const dish = new THREE.Mesh(dishGeom, dishMat);
      dish.rotation.x = Math.PI / 2;
      antennaGroup.add(dish);

      const dishInner = new THREE.Mesh(
        new THREE.CircleGeometry(0.48, 24),
        new THREE.MeshBasicMaterial({
          color: 0xcc88ff,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide
        })
      );
      dishInner.rotation.x = -Math.PI / 2;
      dishInner.position.y = 0.02;
      antennaGroup.add(dishInner);

      const coreSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 12),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.9
        })
      );
      antennaGroup.add(coreSphere);

      antennaGroup.position.y = 2.6;
      barrelGroup.add(antennaGroup);
      (group as any).antenna = antennaGroup;

      barrelGroup.position.y = 0.3;
      group.add(barrelGroup);
      (group as any).barrel = barrelGroup;
    }
  }

  playBuildAnimation(tower: Tower) {
    const group = tower.group;
    group.visible = true;
    const children: THREE.Object3D[] = [];
    group.traverse(child => {
      if (child !== group && child !== tower.rangeRing && child.type !== 'Group') {
        children.push(child);
      }
    });
    children.forEach(child => {
      (child as any).origY = child.position.y;
      child.position.y = -2 - Math.random() * 0.5;
      (child as any).visible = false;
    });

    const totalDuration = 0.8;
    const startTime = performance.now();
    const anim = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(elapsed / totalDuration, 1);
      tower.buildProgress = t;

      children.forEach((child, i) => {
        const delay = (i / children.length) * 0.3;
        const localT = Math.max(0, Math.min((t - delay) / (1 - delay), 1));
        if (localT > 0) {
          (child as any).visible = true;
          const ease = 1 - Math.pow(1 - localT, 3);
          const origY = (child as any).origY;
          child.position.y = -2 + (origY + 2) * ease;
          child.scale.setScalar(0.5 + ease * 0.5);
        }
      });

      if (t < 1) {
        requestAnimationFrame(anim);
      } else {
        children.forEach(child => {
          child.scale.setScalar(1);
        });
      }
    };
    anim();
  }

  findTarget(tower: Tower, enemies: Enemy[]): Enemy | null {
    let closest: Enemy | null = null;
    let closestDist = Infinity;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const dx = enemy.group.position.x - tower.group.position.x;
      const dz = enemy.group.position.z - tower.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= tower.stats.range && dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    }
    return closest;
  }

  fireLaser(tower: Tower, target: Enemy) {
    const start = new THREE.Vector3();
    tower.group.traverse(c => {
      if ((c as any).isMesh && c.parent && (c.parent as any).position.y > 1.5) {
        start.copy(c.getWorldPosition(new THREE.Vector3()));
      }
    });
    if (start.lengthSq() === 0) {
      start.copy(tower.group.position);
      start.y += 2;
    }
    const end = target.group.position.clone();
    end.y += 0.5;

    const geom = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 1.0,
      linewidth: 3
    });
    const line = new THREE.Line(geom, mat);
    this.scene.add(line);

    const glowGeom = new THREE.BufferGeometry().setFromPoints([start, end]);
    const glowMat = new THREE.LineBasicMaterial({
      color: 0x88ffff,
      transparent: true,
      opacity: 0.5
    });
    const glow = new THREE.Line(glowGeom, glowMat);
    this.scene.add(glow);

    const life = { t: 0.2 };
    const anim = () => {
      life.t -= 0.016;
      mat.opacity = Math.max(0, life.t / 0.2);
      glowMat.opacity = Math.max(0, (life.t / 0.2) * 0.5);
      if (life.t > 0) {
        requestAnimationFrame(anim);
      } else {
        this.scene.remove(line);
        this.scene.remove(glow);
        geom.dispose();
        mat.dispose();
        glowGeom.dispose();
        glowMat.dispose();
      }
    };
    anim();

    this.hitEnemy(target, tower.stats.damage);
  }

  fireMissile(tower: Tower, target: Enemy) {
    const geom = new THREE.ConeGeometry(0.12, 0.35, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = Math.PI / 2;
    const start = tower.group.position.clone();
    start.y += 1.6;
    mesh.position.copy(start);
    this.scene.add(mesh);

    const trailCount = 12;
    const trailPositions = new Float32Array(trailCount * 3);
    for (let i = 0; i < trailCount; i++) {
      trailPositions[i * 3] = start.x;
      trailPositions[i * 3 + 1] = start.y;
      trailPositions[i * 3 + 2] = start.z;
    }
    const trailGeom = new THREE.BufferGeometry();
    trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({
      color: 0xffaa44,
      size: 0.15,
      transparent: true,
      opacity: 0.8
    });
    const trail = new THREE.Points(trailGeom, trailMat);
    this.scene.add(trail);

    this.projectiles.push({
      mesh,
      type: 'missile',
      position: start.clone(),
      velocity: new THREE.Vector3(),
      target,
      damage: tower.stats.damage,
      life: 4.0,
      trail,
      trailPositions
    });
  }

  fireEM(tower: Tower, target: Enemy) {
    const geom = new THREE.SphereGeometry(0.22, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95
    });
    const mesh = new THREE.Mesh(geom, mat);
    const start = tower.group.position.clone();
    start.y += 2.6;
    mesh.position.copy(start);
    this.scene.add(mesh);

    const haloGeom = new THREE.SphereGeometry(0.35, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xcc88ff,
      transparent: true,
      opacity: 0.35
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    mesh.add(halo);

    const light = new THREE.PointLight(0xcc88ff, 1.5, 4, 2);
    mesh.add(light);

    const dir = new THREE.Vector3()
      .subVectors(target.group.position.clone().add(new THREE.Vector3(0, 0.5, 0)), start)
      .normalize()
      .multiplyScalar(12);

    this.projectiles.push({
      mesh,
      type: 'electromagnetic',
      position: start.clone(),
      velocity: dir,
      target,
      damage: tower.stats.damage,
      life: 2.5
    });
  }

  hitEnemy(enemy: Enemy, damage: number) {
    enemy.takeDamage(damage);
    if (enemy.dead) {
      this.spawnExplosion(enemy.group.position, enemy.color);
      this.game.addCoins(10);
    }
  }

  spawnExplosion(pos: THREE.Vector3, color: number) {
    const count = 24;
    for (let i = 0; i < count; i++) {
      const geom = new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1
      });
      const p = new THREE.Mesh(geom, mat);
      p.position.copy(pos);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 1.5 + Math.random() * 2.5;
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta) * 0.5 + 0.3,
        Math.cos(phi)
      ).multiplyScalar(speed);
      this.scene.add(p);
      const startTime = performance.now();
      const duration = 500;
      const anim = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        const t = elapsed / (duration / 1000);
        if (t < 1) {
          p.position.x += dir.x * 0.016;
          p.position.y += dir.y * 0.016;
          p.position.z += dir.z * 0.016;
          dir.y -= 0.06;
          mat.opacity = 1 - t;
          p.scale.setScalar(1 - t * 0.5);
          requestAnimationFrame(anim);
        } else {
          this.scene.remove(p);
          geom.dispose();
          mat.dispose();
        }
      };
      anim();
    }

    const flashGeom = new THREE.SphereGeometry(0.5, 16, 16);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });
    const flash = new THREE.Mesh(flashGeom, flashMat);
    flash.position.copy(pos);
    this.scene.add(flash);
    const startT = performance.now();
    const flashAnim = () => {
      const t = (performance.now() - startT) / 300;
      if (t < 1) {
        flash.scale.setScalar(1 + t * 4);
        flashMat.opacity = (1 - t) * 0.9;
        requestAnimationFrame(flashAnim);
      } else {
        this.scene.remove(flash);
        flashGeom.dispose();
        flashMat.dispose();
      }
    };
    flashAnim();
  }

  update(delta: number, enemies: Enemy[]) {
    for (const tower of this.towers) {
      if (tower.buildProgress < 1) continue;

      if (tower.type === 'electromagnetic') {
        const antenna = (tower.group as any).antenna;
        if (antenna) antenna.rotation.y += delta * 1.5;
      }

      tower.cooldown = Math.max(0, tower.cooldown - delta);

      if (!tower.target || tower.target.dead ||
          tower.group.position.distanceTo(tower.target.group.position) > tower.stats.range) {
        tower.target = this.findTarget(tower, enemies);
      }

      if (tower.target) {
        const barrel = (tower.group as any).barrel;
        if (barrel) {
          const dx = tower.target.group.position.x - tower.group.position.x;
          const dz = tower.target.group.position.z - tower.group.position.z;
          const targetYaw = Math.atan2(dx, dz);
          const currentYaw = barrel.rotation.y;
          let diff = targetYaw - currentYaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          barrel.rotation.y = currentYaw + diff * Math.min(1, delta * 8);
        }

        if (tower.cooldown <= 0) {
          if (tower.type === 'laser') {
            this.fireLaser(tower, tower.target);
          } else if (tower.type === 'missile') {
            this.fireMissile(tower, tower.target);
          } else if (tower.type === 'electromagnetic') {
            this.fireEM(tower, tower.target);
          }
          tower.cooldown = tower.stats.fireRate;
        }
      }
    }

    this.updateProjectiles(delta);
  }

  updateProjectiles(delta: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;

      if (p.type === 'missile') {
        if (p.target && !p.target.dead) {
          const targetPos = p.target.group.position.clone();
          targetPos.y += 0.5;
          const desired = new THREE.Vector3().subVectors(targetPos, p.position);
          const dist = desired.length();
          desired.normalize();
          const currentSpeed = p.velocity.length();
          const newSpeed = Math.min(currentSpeed + delta * 20, 14);
          const turnSpeed = 4;
          p.velocity.lerp(desired.multiplyScalar(newSpeed), turnSpeed * delta);
        }
        p.position.add(p.velocity.clone().multiplyScalar(delta));
        p.mesh.position.copy(p.position);

        if (p.velocity.lengthSq() > 0) {
          const dir = p.velocity.clone().normalize();
          p.mesh.rotation.z = Math.atan2(dir.x, dir.z);
          p.mesh.rotation.x = -Math.asin(dir.y);
        }

        if (p.trail && p.trailPositions) {
          for (let j = p.trailPositions.length / 3 - 1; j > 0; j--) {
            p.trailPositions[j * 3] = p.trailPositions[(j - 1) * 3];
            p.trailPositions[j * 3 + 1] = p.trailPositions[(j - 1) * 3 + 1];
            p.trailPositions[j * 3 + 2] = p.trailPositions[(j - 1) * 3 + 2];
          }
          p.trailPositions[0] = p.position.x;
          p.trailPositions[1] = p.position.y;
          p.trailPositions[2] = p.position.z;
          p.trail.geometry.attributes.position.needsUpdate = true;
        }

        if (p.target && !p.target.dead &&
            p.position.distanceTo(p.target.group.position) < 0.8) {
          this.hitEnemy(p.target, p.damage);
          this.removeProjectile(i);
          continue;
        }
      } else if (p.type === 'electromagnetic') {
        p.position.add(p.velocity.clone().multiplyScalar(delta));
        p.mesh.position.copy(p.position);
        p.mesh.rotation.x += delta * 5;
        p.mesh.rotation.y += delta * 3;

        for (const enemy of this.game.enemyManager.enemies) {
          if (!enemy.dead && p.position.distanceTo(enemy.group.position) < 1.0) {
            this.hitEnemy(enemy, p.damage);
            this.removeProjectile(i);
            break;
          }
        }
      }

      if (p.life <= 0) {
        this.removeProjectile(i);
      }
    }
  }

  removeProjectile(index: number) {
    const p = this.projectiles[index];
    this.scene.remove(p.mesh);
    if (p.trail) {
      this.scene.remove(p.trail);
      (p.trail.geometry as THREE.BufferGeometry).dispose();
      ((p.trail as THREE.Points).material as THREE.Material).dispose();
    }
    p.mesh.traverse(c => {
      if ((c as any).isMesh) {
        ((c as THREE.Mesh).geometry as THREE.BufferGeometry).dispose();
        if (Array.isArray((c as THREE.Mesh).material)) {
          (c as THREE.Mesh).material.forEach(m => m.dispose());
        } else {
          ((c as THREE.Mesh).material as THREE.Material).dispose();
        }
      }
    });
    this.projectiles.splice(index, 1);
  }
}
