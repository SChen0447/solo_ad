import * as THREE from 'three';

export interface NeuronConfig {
  position: THREE.Vector3;
  isSender: boolean;
  color?: number;
}

export interface ActionPotentialState {
  active: boolean;
  progress: number;
  position: THREE.Vector3;
  intensity: number;
}

export class Neuron {
  public group: THREE.Group;
  public soma: THREE.Mesh;
  public nucleus: THREE.Mesh;
  public receiverNucleus: THREE.Mesh | null = null;
  public dendrites: THREE.Group;
  public axon: THREE.Group;
  public axonCurve: THREE.CatmullRomCurve3;
  public axonTerminal: THREE.Vector3;
  public dendriteTerminals: THREE.Vector3[];
  public dendriteTerminalMeshes: THREE.Mesh[] = [];
  public isSender: boolean;

  private somaMaterial: THREE.MeshPhongMaterial;
  private nucleusMaterial: THREE.MeshBasicMaterial;
  private receiverNucleusMaterial: THREE.MeshBasicMaterial | null = null;
  private pulseTime: number = 0;
  private activityLevel: number = 0;
  private basePulseFrequency: number = 1.0;

  private receiveResponseActive: boolean = false;
  private receiveResponseTime: number = 0;
  private receiveResponseDuration: number = 3.0;
  private receivedSignalIntensity: number = 5;
  private dendritePulseTime: number = 0;

  public actionPotential: ActionPotentialState = {
    active: false,
    progress: 0,
    position: new THREE.Vector3(),
    intensity: 1
  };

  private apPulseMesh: THREE.Mesh | null = null;
  private apTrailParticles: THREE.Points | null = null;
  private apTrailPositions: Float32Array | null = null;
  private trailLength: number = 20;
  private signalIntensity: number = 5;
  private signalSpeed: number = 1;

  constructor(config: NeuronConfig) {
    this.group = new THREE.Group();
    this.group.position.copy(config.position);
    this.isSender = config.isSender;
    this.dendriteTerminals = [];

    const somaColor = config.color ?? (config.isSender ? 0x4a90d9 : 0x4ad98a);

    this.somaMaterial = new THREE.MeshPhongMaterial({
      color: somaColor,
      transparent: true,
      opacity: 0.7,
      shininess: 60,
      emissive: somaColor,
      emissiveIntensity: 0.1
    });

    this.soma = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 32, 32),
      this.somaMaterial
    );
    this.soma.userData.isSoma = true;
    this.soma.userData.neuron = this;
    this.group.add(this.soma);

    this.nucleusMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc66,
      transparent: true,
      opacity: 0.9
    });
    this.nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 24, 24),
      this.nucleusMaterial
    );
    this.group.add(this.nucleus);

    if (!this.isSender) {
      this.receiverNucleusMaterial = new THREE.MeshBasicMaterial({
        color: 0xaa66ff,
        transparent: true,
        opacity: 0.8
      });
      this.receiverNucleus = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 20, 20),
        this.receiverNucleusMaterial
      );
      this.receiverNucleus.position.set(0.1, 0.05, 0.1);
      this.group.add(this.receiverNucleus);
    }

    this.dendrites = this.createDendrites();
    this.group.add(this.dendrites);

    const axonResult = this.createAxon();
    this.axon = axonResult.group;
    this.axonCurve = axonResult.curve;
    this.axonTerminal = axonResult.terminal;
    this.group.add(this.axon);
  }

  private createDendrites(): THREE.Group {
    const group = new THREE.Group();
    const branchCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < branchCount; i++) {
      const branch = this.createDendriteBranch(i, branchCount);
      group.add(branch);
    }

    return group;
  }

  private createDendriteBranch(index: number, total: number): THREE.Group {
    const group = new THREE.Group();
    const angle = (index / total) * Math.PI * 2 + Math.random() * 0.5;
    const elevation = -0.3 + Math.random() * 0.6;

    const startDir = new THREE.Vector3(
      Math.cos(angle) * Math.cos(elevation),
      Math.sin(elevation),
      Math.sin(angle) * Math.cos(elevation)
    ).normalize();

    const points: THREE.Vector3[] = [];
    let currentPos = startDir.clone().multiplyScalar(0.6);
    points.push(currentPos.clone());

    const segments = 4 + Math.floor(Math.random() * 3);
    const segmentLength = 0.35 + Math.random() * 0.25;

    for (let i = 0; i < segments; i++) {
      const dirVariation = new THREE.Vector3(
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 0.6
      );
      const newDir = startDir.clone().add(dirVariation).normalize();
      currentPos = currentPos.clone().add(newDir.multiplyScalar(segmentLength));
      points.push(currentPos.clone());
    }

    const terminalPos = points[points.length - 1].clone();
    this.dendriteTerminals.push(terminalPos);

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 40, 0.06, 8, false);

    const material = new THREE.MeshPhongMaterial({
      color: this.isSender ? 0x5aa9e6 : 0x5ae69a,
      transparent: true,
      opacity: 0.8,
      shininess: 40
    });

    const tube = new THREE.Mesh(tubeGeometry, material);
    group.add(tube);

    const terminalMaterial = new THREE.MeshPhongMaterial({
      color: this.isSender ? 0x7cc4f0 : 0x7cf0a4,
      transparent: true,
      opacity: 0.9,
      emissive: this.isSender ? 0x3a7ab5 : 0x3ab576,
      emissiveIntensity: 0.2
    });
    const terminal = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      terminalMaterial
    );
    terminal.position.copy(terminalPos);
    group.add(terminal);
    this.dendriteTerminalMeshes.push(terminal);

    return group;
  }

  private createAxon(): {
    group: THREE.Group;
    curve: THREE.CatmullRomCurve3;
    terminal: THREE.Vector3;
  } {
    const group = new THREE.Group();
    const axonDir = new THREE.Vector3(
      this.isSender ? 1 : -1,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3
    ).normalize();

    const points: THREE.Vector3[] = [];
    let currentPos = axonDir.clone().multiplyScalar(0.6);
    points.push(currentPos.clone());

    const segments = 8;
    const segmentLength = 0.45;

    for (let i = 0; i < segments; i++) {
      const dirVariation = new THREE.Vector3(
        0,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4
      );
      const newDir = axonDir.clone().add(dirVariation).normalize();
      currentPos = currentPos.clone().add(newDir.multiplyScalar(segmentLength));
      points.push(currentPos.clone());
    }

    const terminal = points[points.length - 1].clone();

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 60, 0.07, 8, false);

    const material = new THREE.MeshPhongMaterial({
      color: 0xf0e68c,
      transparent: true,
      opacity: 0.75,
      shininess: 30
    });

    const tube = new THREE.Mesh(tubeGeometry, material);
    group.add(tube);

    const terminalBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 20, 20),
      new THREE.MeshPhongMaterial({
        color: 0xffd966,
        transparent: true,
        opacity: 0.85,
        emissive: 0xffaa00,
        emissiveIntensity: 0.15
      })
    );
    terminalBulb.position.copy(terminal);
    group.add(terminalBulb);

    return { group, curve, terminal };
  }

  public triggerActionPotential(intensity: number = 5, speed: number = 1): boolean {
    if (this.actionPotential.active) return false;
    this.signalIntensity = intensity;
    this.signalSpeed = speed;
    this.actionPotential.active = true;
    this.actionPotential.progress = 0;
    this.actionPotential.intensity = intensity;
    this.activityLevel = 1;

    this.createAPPulse();
    return true;
  }

  private createAPPulse(): void {
    const pulseGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const pulseMaterial = new THREE.MeshBasicMaterial({
      color: 0x44aaff,
      transparent: true,
      opacity: 0.9
    });
    this.apPulseMesh = new THREE.Mesh(pulseGeometry, pulseMaterial);
    this.group.add(this.apPulseMesh);

    this.apTrailPositions = new Float32Array(this.trailLength * 3);
    const trailColors = new Float32Array(this.trailLength * 3);
    const trailSizes = new Float32Array(this.trailLength);

    for (let i = 0; i < this.trailLength; i++) {
      trailColors[i * 3] = 0.27;
      trailColors[i * 3 + 1] = 0.67;
      trailColors[i * 3 + 2] = 1.0;
      trailSizes[i] = 0.05 * (1 - i / this.trailLength);
    }

    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.apTrailPositions, 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

    const trailMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });

    this.apTrailParticles = new THREE.Points(trailGeometry, trailMaterial);
    this.group.add(this.apTrailParticles);
  }

  public update(deltaTime: number): boolean {
    this.pulseTime += deltaTime;

    const pulseFreq = this.basePulseFrequency + this.activityLevel * 3;
    const nucleusScale = 1 + Math.sin(this.pulseTime * pulseFreq) * 0.15;
    this.nucleus.scale.setScalar(nucleusScale);
    (this.nucleusMaterial as THREE.MeshBasicMaterial).opacity = 0.75 + Math.sin(this.pulseTime * pulseFreq) * 0.15;

    this.somaMaterial.emissiveIntensity = 0.1 + this.activityLevel * 0.4;

    if (this.receiveResponseActive && !this.isSender) {
      this.receiveResponseTime += deltaTime;
      this.dendritePulseTime += deltaTime;

      const fadeFactor = 1 - Math.min(1, this.receiveResponseTime / this.receiveResponseDuration);

      if (this.receiverNucleus && this.receiverNucleusMaterial) {
        const receiverPulseFreq = 1.5 + (this.receivedSignalIntensity / 10) * 4;
        const receiverNucleusScale = 1 + Math.sin(this.receiveResponseTime * receiverPulseFreq * Math.PI * 2) * 0.25;
        this.receiverNucleus.scale.setScalar(receiverNucleusScale * (0.7 + fadeFactor * 0.3));
        this.receiverNucleusMaterial.opacity = 0.5 + Math.sin(this.receiveResponseTime * receiverPulseFreq * Math.PI * 2) * 0.3;
        const colorIntensity = 0.6 + (this.receivedSignalIntensity / 10) * 0.4;
        this.receiverNucleusMaterial.color.setRGB(
          0.6 * colorIntensity * fadeFactor,
          0.3 * colorIntensity,
          1.0 * colorIntensity
        );
      }

      const dendritePulseFreq = 1.0;
      const dendritePulse = Math.sin(this.dendritePulseTime * dendritePulseFreq * Math.PI * 2) * 0.5 + 0.5;
      this.dendriteTerminalMeshes.forEach((mesh, index) => {
        const phaseOffset = index * 0.2;
        const phasePulse = Math.sin((this.dendritePulseTime + phaseOffset) * dendritePulseFreq * Math.PI * 2) * 0.5 + 0.5;
        const material = mesh.material as THREE.MeshPhongMaterial;
        material.emissiveIntensity = 0.2 + phasePulse * 0.8 * fadeFactor;
        material.emissive.setRGB(
          0.4 * fadeFactor,
          1.0 * (0.6 + phasePulse * 0.4),
          0.6 * fadeFactor
        );
        mesh.scale.setScalar(1 + phasePulse * 0.3 * fadeFactor);
      });

      if (this.receiveResponseTime >= this.receiveResponseDuration) {
        this.receiveResponseActive = false;
        this.dendriteTerminalMeshes.forEach((mesh) => {
          const material = mesh.material as THREE.MeshPhongMaterial;
          material.emissiveIntensity = 0.2;
          material.emissive.setHex(0x3ab576);
          mesh.scale.setScalar(1);
        });
      }
    }

    if (this.actionPotential.active) {
      this.actionPotential.progress += (deltaTime * 0.5 * this.signalSpeed) / 5.0;

      if (this.actionPotential.progress >= 1) {
        this.actionPotential.progress = 1;
        this.actionPotential.active = false;
        this.clearAPPulse();
        return true;
      }

      const pos = this.axonCurve.getPoint(this.actionPotential.progress);
      this.actionPotential.position.copy(pos);

      if (this.apPulseMesh) {
        this.apPulseMesh.position.copy(pos);
        const brightness = 0.6 + (this.signalIntensity / 10) * 0.4;
        (this.apPulseMesh.material as THREE.MeshBasicMaterial).opacity = brightness;
        this.apPulseMesh.scale.setScalar(1 + (this.signalIntensity / 10) * 0.5);
      }

      if (this.apTrailParticles && this.apTrailPositions) {
        for (let i = this.trailLength - 1; i > 0; i--) {
          this.apTrailPositions[i * 3] = this.apTrailPositions[(i - 1) * 3];
          this.apTrailPositions[i * 3 + 1] = this.apTrailPositions[(i - 1) * 3 + 1];
          this.apTrailPositions[i * 3 + 2] = this.apTrailPositions[(i - 1) * 3 + 2];
        }
        this.apTrailPositions[0] = pos.x;
        this.apTrailPositions[1] = pos.y;
        this.apTrailPositions[2] = pos.z;
        (this.apTrailParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    this.activityLevel = Math.max(0, this.activityLevel - deltaTime * 0.3);

    return false;
  }

  private clearAPPulse(): void {
    if (this.apPulseMesh) {
      this.group.remove(this.apPulseMesh);
      this.apPulseMesh.geometry.dispose();
      (this.apPulseMesh.material as THREE.Material).dispose();
      this.apPulseMesh = null;
    }
    if (this.apTrailParticles) {
      this.group.remove(this.apTrailParticles);
      this.apTrailParticles.geometry.dispose();
      (this.apTrailParticles.material as THREE.Material).dispose();
      this.apTrailParticles = null;
      this.apTrailPositions = null;
    }
  }

  public getAxonTerminalWorld(): THREE.Vector3 {
    const worldPos = new THREE.Vector3();
    this.axonTerminal.clone().add(this.group.position);
    this.group.localToWorld(worldPos.copy(this.axonTerminal));
    return worldPos;
  }

  public getDendriteTerminalWorld(index: number): THREE.Vector3 {
    const worldPos = new THREE.Vector3();
    if (index >= 0 && index < this.dendriteTerminals.length) {
      this.group.localToWorld(worldPos.copy(this.dendriteTerminals[index]));
    }
    return worldPos;
  }

  public getSomaWorldPosition(): THREE.Vector3 {
    return this.soma.getWorldPosition(new THREE.Vector3());
  }

  public setActivityLevel(level: number): void {
    this.activityLevel = Math.max(0, Math.min(1, level));
  }

  public triggerReceiveResponse(intensity: number = 5): void {
    if (this.isSender) return;
    this.receiveResponseActive = true;
    this.receiveResponseTime = 0;
    this.receivedSignalIntensity = intensity;
    this.dendritePulseTime = 0;
    this.activityLevel = 1;
  }

  public dispose(): void {
    this.clearAPPulse();
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
