import * as THREE from 'three';
import { ThreeScene } from './ThreeScene';

export type NeuronType = 'sensory' | 'inter' | 'motor';

export interface NeuronParams {
  membraneThreshold: number;
  refractoryPeriod: number;
}

export interface Neuron {
  id: string;
  type: NeuronType;
  position: THREE.Vector3;
  radius: number;
  params: NeuronParams;
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  label: HTMLDivElement;
  membranePotential: number;
  isRefractory: boolean;
  refractoryTimer: number;
  lastSignalTime: number;
  signalIntensity: number;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  weight: number;
  tube: THREE.Mesh;
  highlightMaterial: THREE.MeshBasicMaterial | null;
  baseMaterial: THREE.MeshBasicMaterial;
}

const NEURON_COLORS: Record<NeuronType, number> = {
  sensory: 0x44ff88,
  inter: 0x8866ff,
  motor: 0xff6688,
};

const NEURON_NAMES: Record<NeuronType, string> = {
  sensory: '感觉',
  inter: '中间',
  motor: '运动',
};

export class NeuronManager {
  public neurons: Map<string, Neuron> = new Map();
  public connections: Map<string, Connection> = new Map();
  public selectedNeuronId: string | null = null;
  public connectModeFromId: string | null = null;

  private threeScene: ThreeScene;
  private nextNeuronId: number = 1;
  private nextConnectionId: number = 1;

  public onNeuronSelected?: (neuron: Neuron | null) => void;
  public onNeuronCreated?: (neuron: Neuron) => void;
  public onNeuronDeleted?: (neuronId: string) => void;
  public onConnectionCreated?: (connection: Connection) => void;
  public onConnectionDeleted?: (connectionId: string) => void;

  constructor(threeScene: ThreeScene) {
    this.threeScene = threeScene;
    this.threeScene.onGroundClick = this.handleGroundClick.bind(this);
    this.threeScene.onObjectClick = this.handleObjectClick.bind(this);
  }

  private handleGroundClick(point: THREE.Vector3): void {
    if (this.connectModeFromId) {
      this.connectModeFromId = null;
      return;
    }
  }

  private handleObjectClick(intersects: THREE.Intersection[]): void {
    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData.neuronId) {
          this.handleNeuronClick(obj.userData.neuronId);
          return;
        }
        obj = obj.parent;
      }
    }
  }

  private handleNeuronClick(neuronId: string): void {
    if (this.connectModeFromId) {
      if (this.connectModeFromId !== neuronId) {
        this.createConnection(this.connectModeFromId, neuronId, 1.0);
      }
      this.connectModeFromId = null;
      return;
    }
    this.selectNeuron(neuronId);
  }

  public createNeuron(
    position: THREE.Vector3,
    type: NeuronType = 'inter',
    radius: number = 0.6
  ): Neuron {
    const id = `neuron_${this.nextNeuronId++}`;
    const color = NEURON_COLORS[type];

    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3,
      metalness: 0.3,
      roughness: 0.4,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData.neuronId = id;
    mesh.castShadow = true;

    const glowGeometry = new THREE.SphereGeometry(radius * 1.6, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.15,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.copy(position);
    glowMesh.userData.neuronId = id;

    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      padding: 2px 8px;
      background: rgba(20, 20, 60, 0.85);
      color: #aaccff;
      font-size: 11px;
      border-radius: 10px;
      border: 1px solid rgba(100, 140, 255, 0.4);
      pointer-events: none;
      transform: translate(-50%, -50%);
      white-space: nowrap;
      backdrop-filter: blur(4px);
      transition: opacity 0.3s;
    `;
    label.textContent = `${NEURON_NAMES[type]}#${this.nextNeuronId - 1}`;
    this.threeScene.container.appendChild(label);

    const neuron: Neuron = {
      id,
      type,
      position: position.clone(),
      radius,
      params: {
        membraneThreshold: -55,
        refractoryPeriod: 0.5,
      },
      mesh,
      glowMesh,
      label,
      membranePotential: -70,
      isRefractory: false,
      refractoryTimer: 0,
      lastSignalTime: 0,
      signalIntensity: 0,
    };

    this.neurons.set(id, neuron);
    this.threeScene.addToScene(mesh);
    this.threeScene.addToScene(glowMesh);

    this.onNeuronCreated?.(neuron);
    return neuron;
  }

  public deleteNeuron(neuronId: string): void {
    const neuron = this.neurons.get(neuronId);
    if (!neuron) return;

    const connectionsToRemove: string[] = [];
    this.connections.forEach((conn) => {
      if (conn.fromId === neuronId || conn.toId === neuronId) {
        connectionsToRemove.push(conn.id);
      }
    });
    connectionsToRemove.forEach((id) => this.deleteConnection(id));

    this.threeScene.removeFromScene(neuron.mesh);
    this.threeScene.removeFromScene(neuron.glowMesh);
    neuron.mesh.geometry.dispose();
    (neuron.mesh.material as THREE.Material).dispose();
    neuron.glowMesh.geometry.dispose();
    (neuron.glowMesh.material as THREE.Material).dispose();

    if (neuron.label.parentNode) {
      neuron.label.parentNode.removeChild(neuron.label);
    }

    this.neurons.delete(neuronId);

    if (this.selectedNeuronId === neuronId) {
      this.selectedNeuronId = null;
      this.onNeuronSelected?.(null);
    }

    this.onNeuronDeleted?.(neuronId);
  }

  public selectNeuron(neuronId: string | null): void {
    if (this.selectedNeuronId && this.selectedNeuronId !== neuronId) {
      const prev = this.neurons.get(this.selectedNeuronId);
      if (prev) {
        (prev.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
      }
    }

    this.selectedNeuronId = neuronId;

    if (neuronId) {
      const neuron = this.neurons.get(neuronId);
      if (neuron) {
        (neuron.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
      }
    }

    this.onNeuronSelected?.(neuronId ? this.neurons.get(neuronId) ?? null : null);
  }

  public startConnectMode(neuronId: string): void {
    this.connectModeFromId = neuronId;
    const neuron = this.neurons.get(neuronId);
    if (neuron) {
      (neuron.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
    }
  }

  public createConnection(fromId: string, toId: string, weight: number): Connection | null {
    const fromNeuron = this.neurons.get(fromId);
    const toNeuron = this.neurons.get(toId);
    if (!fromNeuron || !toNeuron) return null;

    const existingKey = `${fromId}_${toId}`;
    let exists = false;
    this.connections.forEach((c) => {
      if (`${c.fromId}_${c.toId}` === existingKey) exists = true;
    });
    if (exists) return null;

    const id = `conn_${this.nextConnectionId++}`;
    const { tube, baseMaterial } = this.createTube(fromNeuron.position, toNeuron.position);

    const connection: Connection = {
      id,
      fromId,
      toId,
      weight,
      tube,
      highlightMaterial: null,
      baseMaterial,
    };

    tube.userData.connectionId = id;
    this.connections.set(id, connection);
    this.threeScene.addToScene(tube);
    this.onConnectionCreated?.(connection);
    return connection;
  }

  private createTube(
    from: THREE.Vector3,
    to: THREE.Vector3
  ): { tube: THREE.Mesh; baseMaterial: THREE.MeshBasicMaterial } {
    const direction = new THREE.Vector3().subVectors(to, from);
    const length = direction.length();
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);

    const curvePoints = this.createCurvePoints(from, to, length);
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeometry = new THREE.TubeGeometry(curve, 40, 0.06, 12, false);

    const colors: number[] = [];
    const color1 = new THREE.Color(0x4488ff);
    const color2 = new THREE.Color(0xaa44ff);
    const segments = tubeGeometry.attributes.position.count;
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const color = new THREE.Color().lerpColors(color1, color2, t);
      colors.push(color.r, color.g, color.b);
    }
    tubeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const baseMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });

    const tube = new THREE.Mesh(tubeGeometry, baseMaterial);
    return { tube, baseMaterial };
  }

  private createCurvePoints(from: THREE.Vector3, to: THREE.Vector3, length: number): THREE.Vector3[] {
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const direction = new THREE.Vector3().subVectors(to, from).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const perpendicular = new THREE.Vector3().crossVectors(direction, up).normalize();
    if (perpendicular.length() < 0.01) {
      perpendicular.set(1, 0, 0);
    }
    const curveOffset = perpendicular.multiplyScalar(length * 0.12);
    const controlPoint = new THREE.Vector3().addVectors(mid, curveOffset);
    controlPoint.y += length * 0.08;
    return [from.clone(), controlPoint, to.clone()];
  }

  public deleteConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    this.threeScene.removeFromScene(conn.tube);
    conn.tube.geometry.dispose();
    conn.baseMaterial.dispose();
    if (conn.highlightMaterial) conn.highlightMaterial.dispose();
    this.connections.delete(connectionId);
    this.onConnectionDeleted?.(connectionId);
  }

  public getOutgoingConnections(neuronId: string): Connection[] {
    const result: Connection[] = [];
    this.connections.forEach((conn) => {
      if (conn.fromId === neuronId) result.push(conn);
    });
    return result;
  }

  public updateNeuronRadius(neuronId: string, radius: number): void {
    const neuron = this.neurons.get(neuronId);
    if (!neuron) return;

    neuron.radius = radius;
    neuron.mesh.geometry.dispose();
    neuron.mesh.geometry = new THREE.SphereGeometry(radius, 32, 32);
    neuron.glowMesh.geometry.dispose();
    neuron.glowMesh.geometry = new THREE.SphereGeometry(radius * 1.6, 32, 32);
  }

  public updateNeuronType(neuronId: string, type: NeuronType): void {
    const neuron = this.neurons.get(neuronId);
    if (!neuron) return;

    neuron.type = type;
    const color = NEURON_COLORS[type];
    (neuron.mesh.material as THREE.MeshStandardMaterial).color.setHex(color);
    (neuron.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(color);
    (neuron.glowMesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    neuron.label.textContent = `${NEURON_NAMES[type]}#${neuron.id.split('_')[1]}`;
  }

  public updateLabels(camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    this.neurons.forEach((neuron) => {
      const screenPos = neuron.position.clone().project(camera);
      const x = (screenPos.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
      const y = (-screenPos.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
      const offsetY = (neuron.radius + 0.5) * 30;
      neuron.label.style.left = `${x}px`;
      neuron.label.style.top = `${y - offsetY}px`;

      if (neuron.signalIntensity > 0.01) {
        neuron.label.innerHTML = `${NEURON_NAMES[neuron.type]}#${neuron.id.split('_')[1]}<br><span style="color:#ffcc66;font-weight:bold;">${neuron.signalIntensity.toFixed(1)} mV</span>`;
      } else {
        neuron.label.textContent = `${NEURON_NAMES[neuron.type]}#${neuron.id.split('_')[1]}`;
      }
    });
  }

  public getNeuronMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.neurons.forEach((n) => {
      meshes.push(n.mesh);
      meshes.push(n.glowMesh);
    });
    return meshes;
  }

  public triggerNeuronSignal(neuronId: string): void {
    const neuron = this.neurons.get(neuronId);
    if (!neuron) return;
    neuron.membranePotential = 40;
    neuron.signalIntensity = 100;
  }
}
