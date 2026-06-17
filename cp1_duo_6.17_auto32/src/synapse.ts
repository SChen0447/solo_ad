import * as THREE from 'three';
import { Neuron } from './neuron';

export type SignalPhase = 'waiting' | 'propagating' | 'releasing' | 'receiving' | 'complete';

export interface SynapseStatus {
  phase: SignalPhase;
  phaseText: string;
}

interface Vesicle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
  hasTriggeredHalo: boolean;
}

interface DendriteSpark {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

interface Neurotransmitter {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
}

interface HaloExplosion {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  active: boolean;
  maxRadius: number;
}

export class Synapse {
  public group: THREE.Group;
  private presynapticMembrane: THREE.Mesh;
  private synapticCleft: THREE.Mesh;
  private postsynapticMembrane: THREE.Mesh;
  private postsynapticMaterial: THREE.ShaderMaterial;

  private senderNeuron: Neuron;
  private receiverNeuron: Neuron;

  private vesicles: Vesicle[] = [];
  private maxVesicles: number = 20;

  private neurotransmitters: Neurotransmitter[] = [];
  private maxNeurotransmitters: number = 50;

  private dendriteSparks: DendriteSpark[] = [];
  private maxDendriteSparks: number = 30;

  private haloExplosions: HaloExplosion[] = [];
  private maxHaloExplosions: number = 20;

  public status: SynapseStatus = {
    phase: 'waiting',
    phaseText: '等待'
  };

  private signalSpeed: number = 1;
  private signalIntensity: number = 5;

  private rippleTime: number = 0;
  private rippleActive: boolean = false;

  private releaseTimer: number = 0;
  private vesiclesReleased: number = 0;

  private phaseTimer: number = 0;

  constructor(sender: Neuron, receiver: Neuron) {
    this.group = new THREE.Group();
    this.senderNeuron = sender;
    this.receiverNeuron = receiver;

    const senderTerminal = sender.getAxonTerminalWorld();
    const receiverTerminal = receiver.getDendriteTerminalWorld(0);

    const center = senderTerminal.clone().add(receiverTerminal).multiplyScalar(0.5);
    this.group.position.copy(center);

    const direction = receiverTerminal.clone().sub(senderTerminal).normalize();
    this.group.lookAt(receiverTerminal);

    const cleftDistance = senderTerminal.distanceTo(receiverTerminal);
    this.createSynapseStructure(cleftDistance);
  }

  private createSynapseStructure(cleftDistance: number): void {
    const membraneSize = 0.5;
    const cleftThickness = Math.max(0.08, cleftDistance * 0.15);

    const preGeometry = new THREE.SphereGeometry(membraneSize, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const preMaterial = new THREE.MeshPhongMaterial({
      color: 0x4a9eff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      shininess: 80,
      emissive: 0x2255aa,
      emissiveIntensity: 0.2
    });
    this.presynapticMembrane = new THREE.Mesh(preGeometry, preMaterial);
    this.presynapticMembrane.rotation.x = -Math.PI / 2;
    this.presynapticMembrane.position.z = -cleftDistance / 2 + cleftThickness / 2;
    this.group.add(this.presynapticMembrane);

    const cleftGeometry = new THREE.CylinderGeometry(membraneSize, membraneSize, cleftThickness, 32);
    const cleftMaterial = new THREE.MeshPhongMaterial({
      color: 0xb388ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    this.synapticCleft = new THREE.Mesh(cleftGeometry, cleftMaterial);
    this.synapticCleft.rotation.x = Math.PI / 2;
    this.group.add(this.synapticCleft);

    const rippleVertexShader = `
      uniform float uTime;
      uniform float uAmplitude;
      uniform float uFrequency;
      uniform float uActive;
      
      varying vec2 vUv;
      varying float vRipple;
      
      void main() {
        vUv = uv;
        vec3 pos = position;
        
        float dist = length(uv - 0.5);
        float ripple = sin(dist * uFrequency * 6.28 - uTime * uFrequency * 6.28) * uAmplitude;
        ripple *= uActive;
        ripple *= max(0.0, 1.0 - dist * 2.0);
        
        vRipple = ripple;
        pos += normal * ripple;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const rippleFragmentShader = `
      uniform float uActive;
      uniform float uTime;
      
      varying vec2 vUv;
      varying float vRipple;
      
      void main() {
        vec3 baseColor = vec3(0.29, 0.85, 0.55);
        float highlight = vRipple * 15.0 * uActive;
        vec3 color = baseColor + vec3(highlight * 0.5, highlight, highlight * 0.3);
        
        float alpha = 0.5 + uActive * 0.2;
        gl_FragColor = vec4(color, alpha);
      }
    `;

    this.postsynapticMaterial = new THREE.ShaderMaterial({
      vertexShader: rippleVertexShader,
      fragmentShader: rippleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: 0.02 },
        uFrequency: { value: 2.0 },
        uActive: { value: 0.0 }
      },
      transparent: true,
      side: THREE.DoubleSide
    });

    const postGeometry = new THREE.SphereGeometry(membraneSize, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    this.postsynapticMembrane = new THREE.Mesh(postGeometry, this.postsynapticMaterial);
    this.postsynapticMembrane.rotation.x = Math.PI / 2;
    this.postsynapticMembrane.position.z = cleftDistance / 2 - cleftThickness / 2;
    this.group.add(this.postsynapticMembrane);
  }

  public triggerSignal(intensity: number, speed: number): boolean {
    if (this.status.phase !== 'waiting' && this.status.phase !== 'complete') {
      return false;
    }

    this.signalIntensity = intensity;
    this.signalSpeed = speed;
    this.status.phase = 'propagating';
    this.status.phaseText = '传播中';
    this.phaseTimer = 0;
    this.rippleTime = 0;
    this.rippleActive = false;

    const success = this.senderNeuron.triggerActionPotential(intensity, speed);
    return success;
  }

  private startVesicleRelease(): void {
    this.status.phase = 'releasing';
    this.status.phaseText = '释放中';
    this.releaseTimer = 0;
    this.vesiclesReleased = 0;
  }

  private releaseVesicle(): void {
    if (this.vesicles.length >= this.maxVesicles) return;

    const size = 0.05 + Math.random() * 0.1;
    const geometry = new THREE.SphereGeometry(size, 12, 12);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff9944,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geometry, material);

    const localStart = this.presynapticMembrane.position.clone();
    localStart.z += 0.05;
    mesh.position.copy(localStart);

    const angle = Math.random() * Math.PI * 2;
    const radius = 0.1 + Math.random() * 0.25;
    const targetX = Math.cos(angle) * radius;
    const targetY = Math.sin(angle) * radius;
    const targetZ = this.postsynapticMembrane.position.z - 0.02;

    const targetPos = new THREE.Vector3(targetX, targetY, targetZ);

    const startPos = localStart.clone();

    this.vesicles.push({
      mesh,
      velocity: new THREE.Vector3(),
      startPos,
      targetPos,
      life: 0,
      maxLife: 1.5 / this.signalSpeed,
      active: true,
      hasTriggeredHalo: false
    });

    this.group.add(mesh);
    this.vesiclesReleased++;
  }

  private spawnNeurotransmitter(): void {
    if (this.neurotransmitters.length >= this.maxNeurotransmitters) return;

    const size = 0.025 + Math.random() * 0.02;
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.85
    });
    const mesh = new THREE.Mesh(geometry, material);

    const x = (Math.random() - 0.5) * 0.6;
    const y = (Math.random() - 0.5) * 0.6;
    const z = (Math.random() - 0.5) * 0.15;
    mesh.position.set(x, y, z);

    const angle = Math.random() * Math.PI * 2;
    const speed = 0.02;
    const velocity = new THREE.Vector3(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      (Math.random() - 0.5) * speed * 0.5
    );

    this.neurotransmitters.push({
      mesh,
      velocity,
      life: 0,
      maxLife: 3.5,
      active: true,
      colorStart: new THREE.Color(0xffaa44),
      colorEnd: new THREE.Color(0x44dd88)
    });

    this.group.add(mesh);
  }

  private startReceiving(): void {
    this.status.phase = 'receiving';
    this.status.phaseText = '接收中';
    this.rippleActive = true;
    this.postsynapticMaterial.uniforms.uActive.value = 1.0;
    this.receiverNeuron.setActivityLevel(1);
    this.receiverNeuron.triggerReceiveResponse(this.signalIntensity);

    for (let i = 0; i < 3; i++) {
      this.spawnDendriteSpark();
    }
  }

  private spawnDendriteSpark(): void {
    if (this.dendriteSparks.length >= this.maxDendriteSparks) return;

    const size = 0.04 + Math.random() * 0.05;
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x44ff88,
      transparent: true,
      opacity: 1.0
    });
    const mesh = new THREE.Mesh(geometry, material);

    const worldTerminal = this.receiverNeuron.getDendriteTerminalWorld(0);
    const localPos = this.group.worldToLocal(worldTerminal.clone());

    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3
    );
    mesh.position.copy(localPos.add(offset));

    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05
    );

    this.dendriteSparks.push({
      mesh,
      velocity,
      life: 0,
      maxLife: 2.0,
      active: true
    });

    this.group.add(mesh);
  }

  private createHaloExplosion(position: THREE.Vector3): void {
    if (this.haloExplosions.length >= this.maxHaloExplosions) return;

    const geometry = new THREE.RingGeometry(0.02, 0.04, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffbb44,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.lookAt(this.cameraPosition || new THREE.Vector3(0, 0, 10));

    this.haloExplosions.push({
      mesh,
      life: 0,
      maxLife: 0.5,
      active: true,
      maxRadius: 0.2
    });

    this.group.add(mesh);
  }

  private cameraPosition: THREE.Vector3 | null = null;

  public setCameraPosition(pos: THREE.Vector3): void {
    this.cameraPosition = pos.clone();
  }

  private completeSignal(): void {
    this.status.phase = 'complete';
    this.status.phaseText = '完成';
    this.phaseTimer = 0;
  }

  private resetToWaiting(): void {
    this.status.phase = 'waiting';
    this.status.phaseText = '等待';
    this.rippleActive = false;
    this.postsynapticMaterial.uniforms.uActive.value = 0.0;
  }

  public update(deltaTime: number): void {
    if (this.rippleActive) {
      this.rippleTime += deltaTime;
      this.postsynapticMaterial.uniforms.uTime.value = this.rippleTime;
    }

    this.phaseTimer += deltaTime;

    switch (this.status.phase) {
      case 'propagating':
        if (!this.senderNeuron.actionPotential.active) {
          this.startVesicleRelease();
        }
        break;

      case 'releasing':
        this.releaseTimer += deltaTime;
        const releaseInterval = 0.06 / this.signalSpeed;
        const expectedVesicles = Math.floor(this.releaseTimer / releaseInterval);

        while (this.vesiclesReleased < Math.min(this.maxVesicles, expectedVesicles)) {
          this.releaseVesicle();
        }

        if (this.phaseTimer > 1.8 / this.signalSpeed) {
          for (let i = 0; i < 5; i++) {
            this.spawnNeurotransmitter();
          }
          this.startReceiving();
        }
        break;

      case 'receiving':
        if (Math.random() < 0.15) {
          this.spawnDendriteSpark();
        }
        if (Math.random() < 0.1) {
          this.spawnNeurotransmitter();
        }
        if (this.phaseTimer > 2.5) {
          this.completeSignal();
        }
        break;

      case 'complete':
        if (this.phaseTimer > 1.0) {
          this.resetToWaiting();
        }
        break;
    }

    this.updateVesicles(deltaTime);
    this.updateNeurotransmitters(deltaTime);
    this.updateDendriteSparks(deltaTime);
    this.updateHaloExplosions(deltaTime);
  }

  private updateHaloExplosions(deltaTime: number): void {
    for (let i = this.haloExplosions.length - 1; i >= 0; i--) {
      const h = this.haloExplosions[i];
      if (!h.active) continue;

      h.life += deltaTime;
      const t = h.life / h.maxLife;

      if (t >= 1) {
        h.active = false;
        this.group.remove(h.mesh);
        h.mesh.geometry.dispose();
        (h.mesh.material as THREE.Material).dispose();
        this.haloExplosions.splice(i, 1);
        continue;
      }

      const easeT = t;
      const currentRadius = 0.02 + easeT * h.maxRadius;
      const ringWidth = 0.04 + easeT * 0.08;

      h.mesh.geometry.dispose();
      h.mesh.geometry = new THREE.RingGeometry(
        Math.max(0.01, currentRadius - ringWidth),
        currentRadius,
        32
      );

      const material = h.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 1.0 * (1 - t);
      material.color.setRGB(
        1.0,
        0.8 - t * 0.3,
        0.3 + t * 0.1
      );

      if (this.cameraPosition) {
        h.mesh.lookAt(this.cameraPosition);
      }
    }
  }

  private updateVesicles(deltaTime: number): void {
    for (let i = this.vesicles.length - 1; i >= 0; i--) {
      const v = this.vesicles[i];
      if (!v.active) continue;

      v.life += deltaTime;
      const t = v.life / v.maxLife;

      if (t >= 1) {
        if (!v.hasTriggeredHalo) {
          v.hasTriggeredHalo = true;
          this.createHaloExplosion(v.targetPos.clone());
        }
        v.active = false;
        this.group.remove(v.mesh);
        v.mesh.geometry.dispose();
        (v.mesh.material as THREE.Material).dispose();
        this.vesicles.splice(i, 1);
        continue;
      }

      const easeT = t * t * (3 - 2 * t);
      v.mesh.position.lerpVectors(v.startPos, v.targetPos, easeT);

      const arcHeight = Math.sin(t * Math.PI) * 0.15;
      v.mesh.position.y += arcHeight;

      const scale = 1 + Math.sin(t * Math.PI) * 0.3;
      v.mesh.scale.setScalar(scale);

      (v.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t * 0.3);
    }
  }

  private updateNeurotransmitters(deltaTime: number): void {
    for (let i = this.neurotransmitters.length - 1; i >= 0; i--) {
      const n = this.neurotransmitters[i];
      if (!n.active) continue;

      n.life += deltaTime;

      if (n.life >= n.maxLife) {
        n.active = false;
        this.group.remove(n.mesh);
        n.mesh.geometry.dispose();
        (n.mesh.material as THREE.Material).dispose();
        this.neurotransmitters.splice(i, 1);
        continue;
      }

      n.velocity.x += (Math.random() - 0.5) * 0.002;
      n.velocity.y += (Math.random() - 0.5) * 0.002;
      n.velocity.z += (Math.random() - 0.5) * 0.001;

      const maxSpeed = 0.04;
      if (n.velocity.length() > maxSpeed) {
        n.velocity.normalize().multiplyScalar(maxSpeed);
      }

      n.mesh.position.add(n.velocity.clone().multiplyScalar(deltaTime * 60));

      const t = n.life / n.maxLife;
      const color = new THREE.Color().lerpColors(n.colorStart, n.colorEnd, t);
      (n.mesh.material as THREE.MeshBasicMaterial).color.copy(color);
      (n.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - t * 0.6);
    }
  }

  private updateDendriteSparks(deltaTime: number): void {
    for (let i = this.dendriteSparks.length - 1; i >= 0; i--) {
      const s = this.dendriteSparks[i];
      if (!s.active) continue;

      s.life += deltaTime;

      if (s.life >= s.maxLife) {
        s.active = false;
        this.group.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
        this.dendriteSparks.splice(i, 1);
        continue;
      }

      s.mesh.position.add(s.velocity.clone().multiplyScalar(deltaTime * 60));

      const t = s.life / s.maxLife;
      const scale = 1 - t * 0.6;
      s.mesh.scale.setScalar(scale);

      const colorT = Math.min(1, t * 1.5);
      const color = new THREE.Color().lerpColors(
        new THREE.Color(0xaaffcc),
        new THREE.Color(0x22aa55),
        colorT
      );
      (s.mesh.material as THREE.MeshBasicMaterial).color.copy(color);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t;
    }
  }

  public dispose(): void {
    this.vesicles.forEach((v) => {
      v.mesh.geometry.dispose();
      (v.mesh.material as THREE.Material).dispose();
    });
    this.neurotransmitters.forEach((n) => {
      n.mesh.geometry.dispose();
      (n.mesh.material as THREE.Material).dispose();
    });
    this.dendriteSparks.forEach((s) => {
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
    });
    this.haloExplosions.forEach((h) => {
      h.mesh.geometry.dispose();
      (h.mesh.material as THREE.Material).dispose();
    });
    this.vesicles = [];
    this.neurotransmitters = [];
    this.dendriteSparks = [];
    this.haloExplosions = [];

    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
