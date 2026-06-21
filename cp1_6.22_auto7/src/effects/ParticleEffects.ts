import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

export class ParticleEffects {
  private scene: THREE.Scene;
  private backgroundParticles: THREE.Points;
  private dissolveParticles: THREE.Points | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.backgroundParticles = this.createBackgroundParticles();
    this.scene.add(this.backgroundParticles);
  }

  private createBackgroundParticles(): THREE.Points {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;

      const color = new THREE.Color().setHSL(0.12, 0.8, 0.5 + Math.random() * 0.3);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geometry, material);
  }

  public createDissolveEffect(mesh: THREE.Mesh, color: number): void {
    const geometry = mesh.geometry;
    const positionAttribute = geometry.getAttribute('position');
    const count = Math.min(positionAttribute.count, 300);

    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    const worldMatrix = mesh.matrixWorld;
    const tempVec = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * positionAttribute.count);
      tempVec.fromBufferAttribute(positionAttribute, idx);
      tempVec.applyMatrix4(worldMatrix);

      positions[i * 3] = tempVec.x;
      positions[i * 3 + 1] = tempVec.y;
      positions[i * 3 + 2] = tempVec.z;

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        Math.random() * 0.1 + 0.02,
        (Math.random() - 0.5) * 0.1
      );
      velocities.push(velocity);
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.06,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });

    this.dissolveParticles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.dissolveParticles);

    const data = { opacity: 1, scale: 1 };

    new TWEEN.Tween(data)
      .to({ opacity: 0, scale: 2 }, 500)
      .easing(TWEEN.Easing.Cubic.Out)
      .onUpdate(() => {
        if (this.dissolveParticles) {
          (this.dissolveParticles.material as THREE.PointsMaterial).opacity = data.opacity;
          (this.dissolveParticles.material as THREE.PointsMaterial).size = 0.06 * data.scale;

          const posAttr = this.dissolveParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < count; i++) {
            posAttr.setX(i, posAttr.getX(i) + velocities[i].x);
            posAttr.setY(i, posAttr.getY(i) + velocities[i].y);
            posAttr.setZ(i, posAttr.getZ(i) + velocities[i].z);
          }
          posAttr.needsUpdate = true;
        }
      })
      .onComplete(() => {
        if (this.dissolveParticles) {
          this.scene.remove(this.dissolveParticles);
          this.dissolveParticles.geometry.dispose();
          (this.dissolveParticles.material as THREE.Material).dispose();
          this.dissolveParticles = null;
        }
      })
      .start();
  }

  public update(delta: number): void {
    if (this.backgroundParticles) {
      const positions = this.backgroundParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        let y = positions.getY(i);
        y += 0.01 * delta * 60;
        if (y > 10) y = -10;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
    }
  }

  public dispose(): void {
    if (this.backgroundParticles) {
      this.scene.remove(this.backgroundParticles);
      this.backgroundParticles.geometry.dispose();
      (this.backgroundParticles.material as THREE.Material).dispose();
    }
    if (this.dissolveParticles) {
      this.scene.remove(this.dissolveParticles);
      this.dissolveParticles.geometry.dispose();
      (this.dissolveParticles.material as THREE.Material).dispose();
    }
  }
}
