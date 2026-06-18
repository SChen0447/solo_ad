import * as THREE from 'three';
import { ThreeScene } from './ThreeScene';
import { NeuronManager, Neuron, Connection } from './NeuronManager';

interface SignalPulse {
  id: string;
  connectionId: string;
  progress: number;
  speed: number;
  intensity: number;
  color: THREE.Color;
  mesh: THREE.Mesh;
  trail: THREE.Points;
  trailPositions: Float32Array;
}

interface HighlightedConnection {
  connectionId: string;
  timer: number;
  duration: number;
}

export interface GlobalSignalParams {
  propagationSpeed: number;
  signalStrength: number;
  randomBifurcationWeight: number;
}

export class SignalSimulator {
  public globalParams: GlobalSignalParams = {
    propagationSpeed: 2.5,
    signalStrength: 100,
    randomBifurcationWeight: 0.5,
  };

  private threeScene: ThreeScene;
  private neuronManager: NeuronManager;
  private pulses: Map<string, SignalPulse> = new Map();
  private highlightedConnections: Map<string, HighlightedConnection> = new Map();
  private nextPulseId: number = 1;

  private pulsePool: SignalPulse[] = [];

  constructor(threeScene: ThreeScene, neuronManager: NeuronManager) {
    this.threeScene = threeScene;
    this.neuronManager = neuronManager;
    this.threeScene.onUpdate = this.update.bind(this);
  }

  public triggerSignal(neuronId: string): void {
    const neuron = this.neuronManager.neurons.get(neuronId);
    if (!neuron || neuron.isRefractory) return;

    neuron.membranePotential = 40;
    neuron.signalIntensity = this.globalParams.signalStrength;
    neuron.isRefractory = true;
    neuron.refractoryTimer = neuron.params.refractoryPeriod;
    neuron.lastSignalTime = performance.now();

    this.flashNeuron(neuron);
    this.propagateSignal(neuronId, this.globalParams.signalStrength);
  }

  private flashNeuron(neuron: Neuron): void {
    const material = neuron.mesh.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = 1.5;

    const glowMaterial = neuron.glowMesh.material as THREE.MeshBasicMaterial;
    glowMaterial.opacity = 0.4;

    setTimeout(() => {
      if (neuron.id === this.neuronManager.selectedNeuronId) {
        material.emissiveIntensity = 0.8;
      } else {
        material.emissiveIntensity = 0.3;
      }
      glowMaterial.opacity = 0.15;
    }, 200);
  }

  private propagateSignal(fromNeuronId: string, intensity: number): void {
    const outgoing = this.neuronManager.getOutgoingConnections(fromNeuronId);
    if (outgoing.length === 0) return;

    if (outgoing.length === 1) {
      this.startPulse(outgoing[0], intensity);
      return;
    }

    const weights = outgoing.map((c) => {
      const baseWeight = c.weight;
      const randomFactor = 1 + (Math.random() - 0.5) * this.globalParams.randomBifurcationWeight;
      return baseWeight * randomFactor;
    });
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    outgoing.forEach((conn, idx) => {
      const splitIntensity = intensity * (weights[idx] / totalWeight);
      if (splitIntensity > 10) {
        this.startPulse(conn, splitIntensity);
      }
    });
  }

  private startPulse(connection: Connection, intensity: number): void {
    const fromNeuron = this.neuronManager.neurons.get(connection.fromId);
    const toNeuron = this.neuronManager.neurons.get(connection.toId);
    if (!fromNeuron || !toNeuron) return;

    const id = `pulse_${this.nextPulseId++}`;

    const color = this.getIntensityColor(intensity);

    const pulseGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const pulseMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1.0,
    });
    const mesh = new THREE.Mesh(pulseGeometry, pulseMaterial);

    const trailLength = 20;
    const trailPositions = new Float32Array(trailLength * 3);
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));

    const trailColors = new Float32Array(trailLength * 3);
    for (let i = 0; i < trailLength; i++) {
      const alpha = 1 - i / trailLength;
      trailColors[i * 3] = color.r * alpha;
      trailColors[i * 3 + 1] = color.g * alpha;
      trailColors[i * 3 + 2] = color.b * alpha;
    }
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

    const trailSizes = new Float32Array(trailLength);
    for (let i = 0; i < trailLength; i++) {
      trailSizes[i] = (1 - i / trailLength) * 0.12;
    }

    const trailMaterial = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    const trail = new THREE.Points(trailGeometry, trailMaterial);

    const pulse: SignalPulse = {
      id,
      connectionId: connection.id,
      progress: 0,
      speed: this.globalParams.propagationSpeed,
      intensity,
      color: color.clone(),
      mesh,
      trail,
      trailPositions,
    };

    this.pulses.set(id, pulse);
    this.threeScene.addToScene(mesh);
    this.threeScene.addToScene(trail);

    this.highlightConnection(connection.id, 0.6);
  }

  private getIntensityColor(intensity: number): THREE.Color {
    const t = Math.min(intensity / 100, 1);
    const r = Math.floor(0x44 + (0xff - 0x44) * t);
    const g = Math.floor(0x88 + (0xcc - 0x88) * t);
    const b = Math.floor(0xff - 0x44 * t);
    return new THREE.Color(r / 255, g / 255, b / 255);
  }

  private highlightConnection(connectionId: string, duration: number): void {
    const connection = this.neuronManager.connections.get(connectionId);
    if (!connection) return;

    const existing = this.highlightedConnections.get(connectionId);
    if (existing) {
      existing.timer = duration;
      return;
    }

    if (!connection.highlightMaterial) {
      connection.highlightMaterial = new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
    }
    connection.tube.material = connection.highlightMaterial;

    this.highlightedConnections.set(connectionId, {
      connectionId,
      timer: duration,
      duration,
    });
  }

  private updatePulsePosition(pulse: SignalPulse): void {
    const connection = this.neuronManager.connections.get(pulse.connectionId);
    if (!connection) return;

    const fromNeuron = this.neuronManager.neurons.get(connection.fromId);
    const toNeuron = this.neuronManager.neurons.get(connection.toId);
    if (!fromNeuron || !toNeuron) return;

    const from = fromNeuron.position;
    const to = toNeuron.position;
    const length = from.distanceTo(to);
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const direction = new THREE.Vector3().subVectors(to, from).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const perpendicular = new THREE.Vector3().crossVectors(direction, up).normalize();
    if (perpendicular.length() < 0.01) perpendicular.set(1, 0, 0);
    const curveOffset = perpendicular.multiplyScalar(length * 0.12);
    const controlPoint = new THREE.Vector3().addVectors(mid, curveOffset);
    controlPoint.y += length * 0.08;

    const t = pulse.progress;
    const t2 = t * t;
    const mt = 1 - t;
    const mt2 = mt * mt;

    const pos = new THREE.Vector3();
    pos.x = mt2 * from.x + 2 * mt * t * controlPoint.x + t2 * to.x;
    pos.y = mt2 * from.y + 2 * mt * t * controlPoint.y + t2 * to.y;
    pos.z = mt2 * from.z + 2 * mt * t * controlPoint.z + t2 * to.z;

    pulse.mesh.position.copy(pos);

    const trailCount = pulse.trailPositions.length / 3;
    for (let i = trailCount - 1; i > 0; i--) {
      pulse.trailPositions[i * 3] = pulse.trailPositions[(i - 1) * 3];
      pulse.trailPositions[i * 3 + 1] = pulse.trailPositions[(i - 1) * 3 + 1];
      pulse.trailPositions[i * 3 + 2] = pulse.trailPositions[(i - 1) * 3 + 2];
    }
    pulse.trailPositions[0] = pos.x;
    pulse.trailPositions[1] = pos.y;
    pulse.trailPositions[2] = pos.z;

    (pulse.trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private removePulse(pulseId: string): void {
    const pulse = this.pulses.get(pulseId);
    if (!pulse) return;

    this.threeScene.removeFromScene(pulse.mesh);
    this.threeScene.removeFromScene(pulse.trail);
    pulse.mesh.geometry.dispose();
    (pulse.mesh.material as THREE.Material).dispose();
    pulse.trail.geometry.dispose();
    (pulse.trail.material as THREE.Material).dispose();

    this.pulses.delete(pulseId);
    this.pulsePool.push(pulse);
  }

  private update(delta: number): void {
    const toRemove: string[] = [];

    this.pulses.forEach((pulse) => {
      const connection = this.neuronManager.connections.get(pulse.connectionId);
      if (!connection) {
        toRemove.push(pulse.id);
        return;
      }

      const fromNeuron = this.neuronManager.neurons.get(connection.fromId);
      const toNeuron = this.neuronManager.neurons.get(connection.toId);
      if (!fromNeuron || !toNeuron) {
        toRemove.push(pulse.id);
        return;
      }

      const distance = fromNeuron.position.distanceTo(toNeuron.position);
      const progressIncrement = (pulse.speed * delta) / Math.max(distance, 0.1);
      pulse.progress += progressIncrement;

      this.updatePulsePosition(pulse);

      if (pulse.progress >= 1.0) {
        toRemove.push(pulse.id);
        this.onPulseReachedEnd(pulse, connection);
      }
    });

    toRemove.forEach((id) => this.removePulse(id));

    this.highlightedConnections.forEach((hl) => {
      hl.timer -= delta;
      if (hl.timer <= 0) {
        const connection = this.neuronManager.connections.get(hl.connectionId);
        if (connection) {
          connection.tube.material = connection.baseMaterial;
        }
        this.highlightedConnections.delete(hl.connectionId);
      } else {
        const connection = this.neuronManager.connections.get(hl.connectionId);
        if (connection && connection.highlightMaterial) {
          connection.highlightMaterial.opacity = 0.4 + 0.5 * (hl.timer / hl.duration);
        }
      }
    });

    this.neuronManager.neurons.forEach((neuron) => {
      if (neuron.isRefractory) {
        neuron.refractoryTimer -= delta;
        if (neuron.refractoryTimer <= 0) {
          neuron.isRefractory = false;
          neuron.membranePotential = -70;
        }
      }

      if (neuron.signalIntensity > 0) {
        neuron.signalIntensity = Math.max(0, neuron.signalIntensity - delta * 80);
      }
    });

    this.neuronManager.updateLabels(this.threeScene.camera, this.threeScene.renderer);
  }

  private onPulseReachedEnd(pulse: SignalPulse, connection: Connection): void {
    const toNeuron = this.neuronManager.neurons.get(connection.toId);
    if (!toNeuron) return;

    const receivedIntensity = pulse.intensity * connection.weight;
    toNeuron.membranePotential += receivedIntensity * 0.5;
    toNeuron.signalIntensity = Math.max(toNeuron.signalIntensity, receivedIntensity);

    this.flashNeuron(toNeuron);

    if (!toNeuron.isRefractory && toNeuron.membranePotential >= toNeuron.params.membraneThreshold) {
      toNeuron.isRefractory = true;
      toNeuron.refractoryTimer = toNeuron.params.refractoryPeriod;
      toNeuron.membranePotential = 40;
      toNeuron.lastSignalTime = performance.now();
      this.propagateSignal(toNeuron.id, receivedIntensity);
    }
  }

  public setPropagationSpeed(speed: number): void {
    this.globalParams.propagationSpeed = speed;
    this.pulses.forEach((pulse) => {
      pulse.speed = speed;
    });
  }

  public setSignalStrength(strength: number): void {
    this.globalParams.signalStrength = strength;
  }

  public setRandomBifurcationWeight(weight: number): void {
    this.globalParams.randomBifurcationWeight = weight;
  }

  public clearAllSignals(): void {
    const ids: string[] = [];
    this.pulses.forEach((_, id) => ids.push(id));
    ids.forEach((id) => this.removePulse(id));

    this.highlightedConnections.forEach((hl) => {
      const connection = this.neuronManager.connections.get(hl.connectionId);
      if (connection) {
        connection.tube.material = connection.baseMaterial;
      }
    });
    this.highlightedConnections.clear();

    this.neuronManager.neurons.forEach((neuron) => {
      neuron.isRefractory = false;
      neuron.refractoryTimer = 0;
      neuron.membranePotential = -70;
      neuron.signalIntensity = 0;
    });
  }

  public dispose(): void {
    this.clearAllSignals();
  }
}
