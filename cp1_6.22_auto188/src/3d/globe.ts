import * as THREE from 'three';
import type { NodeData, TrafficPacket } from '@data/fetch';
import { eventBus } from '@data/fetch';

const GLOBE_RADIUS = 300;
const NODE_MIN_SIZE = 3;
const NODE_MAX_SIZE = 12;
const PULSE_PERIOD = 2;

const latLngToVector3 = (lat: number, lng: number, radius: number = GLOBE_RADIUS): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
};

const getTrafficColor = (traffic: number): THREE.Color => {
  const t = Math.min(1, Math.max(0, traffic / 100));
  const r = Math.round(170 * t);
  const g = Math.round(0 * (1 - t) + 0 * t);
  const b = Math.round(255 * (1 - t) + 255 * t);
  return new THREE.Color(r / 255, g / 255, b / 255);
};

const getPacketColor = (type: string): number => {
  switch (type) {
    case 'TCP':
      return 0x00aaff;
    case 'UDP':
      return 0x00ff66;
    case 'HTTP':
      return 0xff8800;
    default:
      return 0xffffff;
  }
};

export interface NodeMeshInfo {
  id: string;
  position: THREE.Vector3;
  name: string;
  mesh: THREE.Mesh;
  pulseMesh: THREE.Mesh;
  traffic: number;
  latency: number;
  region: string;
  highlighted: boolean;
}

export interface FlowLineInfo {
  id: string;
  from: THREE.Vector3;
  to: THREE.Vector3;
  curve: THREE.CatmullRomCurve3;
  line: THREE.Line;
  particles: THREE.Points;
  particlePositions: Float32Array;
  particleCount: number;
  progress: number;
  startTime: number;
  duration: number;
  color: number;
  type: string;
  isGrayed: boolean;
}

export class Globe {
  private scene: THREE.Scene;
  private globeMesh: THREE.Mesh | null = null;
  private nodeMeshes: Map<string, NodeMeshInfo> = new Map();
  private flowLines: Map<string, FlowLineInfo> = new Map();
  private labelCanvas: HTMLCanvasElement | null = null;
  private labelContext: CanvasRenderingContext2D | null = null;
  private particleDensity = 50;
  private showPulse = true;
  private selectedRegion: string | null = null;
  private searchQuery: string = '';
  private hoveredNode: NodeMeshInfo | null = null;
  private tooltipEl: HTMLElement | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createGlobe();
    this.createLabelCanvas();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('region:filter', (data) => {
      this.selectedRegion = data as string | null;
      this.updateNodeVisibility();
    });
    eventBus.on('search:query', (data) => {
      this.searchQuery = (data as string).toLowerCase();
      this.updateNodeVisibility();
    });
    eventBus.on('time:jump', () => {
      this.clearFlowLines();
    });
  }

  private createGlobe(): void {
    const geometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 1024, 512);
    gradient.addColorStop(0, '#0a1628');
    gradient.addColorStop(0.5, '#0f2847');
    gradient.addColorStop(1, '#0a1628');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = '#1a4d7a';
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = 10 + Math.random() * 60;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#2563eb';
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = 5 + Math.random() * 30;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
    for (let lat = -80; lat <= 80; lat += 20) {
      const y = ((90 - lat) / 180) * 512;
      ctx.fillRect(0, y, 1024, 0.5);
    }
    for (let lng = -180; lng <= 180; lng += 30) {
      const x = ((lng + 180) / 360) * 1024;
      ctx.fillRect(x, 0, 0.5, 512);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshPhongMaterial({
      map: texture,
      shininess: 15,
      specular: new THREE.Color(0x333333),
    });
    this.globeMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.globeMesh);

    const atmosphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS + 5, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity * 0.4;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.scene.add(atmosphere);
  }

  private createLabelCanvas(): void {
    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 2048;
    this.labelCanvas.height = 2048;
    this.labelCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:10;';
    this.labelContext = this.labelCanvas.getContext('2d')!;
  }

  getLabelCanvas(): HTMLCanvasElement | null {
    return this.labelCanvas;
  }

  updateLabelCanvasSize(width: number, height: number): void {
    if (this.labelCanvas) {
      this.labelCanvas.width = width;
      this.labelCanvas.height = height;
    }
  }

  updateNodes(nodes: NodeData[]): void {
    nodes.forEach((node) => {
      let meshInfo = this.nodeMeshes.get(node.id);
      if (!meshInfo) {
        meshInfo = this.createNode(node);
      }
      const scale = NODE_MIN_SIZE + (NODE_MAX_SIZE - NODE_MIN_SIZE) * (node.traffic / 100);
      meshInfo.mesh.scale.setScalar(scale);
      meshInfo.traffic = node.traffic;
      meshInfo.latency = node.latency;
      const color = getTrafficColor(node.traffic);
      (meshInfo.mesh.material as THREE.MeshBasicMaterial).color = color;
    });
    this.updateNodeVisibility();
  }

  private createNode(node: NodeData): NodeMeshInfo {
    const position = latLngToVector3(node.lat, node.lng);
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const color = getTrafficColor(node.traffic);
    const material = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    this.scene.add(mesh);

    const pulseGeometry = new THREE.RingGeometry(1.5, 3, 32);
    const pulseMaterial = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const pulseMesh = new THREE.Mesh(pulseGeometry, pulseMaterial);
    pulseMesh.position.copy(position);
    pulseMesh.lookAt(new THREE.Vector3(0, 0, 0));
    const scale = NODE_MIN_SIZE + (NODE_MAX_SIZE - NODE_MIN_SIZE) * (node.traffic / 100);
    pulseMesh.scale.setScalar(scale);
    this.scene.add(pulseMesh);

    const info: NodeMeshInfo = {
      id: node.id,
      position,
      name: node.name,
      mesh,
      pulseMesh,
      traffic: node.traffic,
      latency: node.latency,
      region: node.region,
      highlighted: false,
    };
    this.nodeMeshes.set(node.id, info);
    return info;
  }

  private updateNodeVisibility(): void {
    this.nodeMeshes.forEach((info) => {
      const inRegion = !this.selectedRegion || info.region === this.selectedRegion;
      const matchesSearch = !this.searchQuery || info.name.toLowerCase().includes(this.searchQuery);

      info.highlighted = matchesSearch && this.searchQuery !== '';

      if (!this.selectedRegion && !this.searchQuery) {
        info.mesh.visible = true;
        info.pulseMesh.visible = this.showPulse;
        (info.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
        (info.mesh.material as THREE.MeshBasicMaterial).transparent = false;
      } else if (inRegion || matchesSearch) {
        info.mesh.visible = true;
        info.pulseMesh.visible = this.showPulse;
        (info.mesh.material as THREE.MeshBasicMaterial).opacity = matchesSearch ? 1 : 0.6;
        (info.mesh.material as THREE.MeshBasicMaterial).transparent = true;
      } else {
        info.mesh.visible = true;
        info.pulseMesh.visible = false;
        (info.mesh.material as THREE.MeshBasicMaterial).opacity = 0.2;
        (info.mesh.material as THREE.MeshBasicMaterial).transparent = true;
      }
    });

    this.flowLines.forEach((line) => {
      const fromNode = this.nodeMeshes.get(line.id.split('_')[0]);
      const toNode = this.nodeMeshes.get(line.id.split('_')[1]);
      const inRegion =
        !this.selectedRegion ||
        (fromNode?.region === this.selectedRegion) ||
        (toNode?.region === this.selectedRegion);
      line.isGrayed = !inRegion;
      this.updateFlowLineAppearance(line);
    });
  }

  addFlowLine(packet: TrafficPacket): void {
    const fromNode = this.nodeMeshes.get(packet.from);
    const toNode = this.nodeMeshes.get(packet.to);
    if (!fromNode || !toNode) return;

    if (this.flowLines.has(packet.id)) return;

    const from = fromNode.position;
    const to = toNode.position;
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const height = 20 + Math.random() * 30;
    const controlPoint = mid.clone().normalize().multiplyScalar(GLOBE_RADIUS + height);

    const curve = new THREE.CatmullRomCurve3([
      from.clone(),
      controlPoint,
      to.clone(),
    ]);
    curve.curveType = 'catmullrom';
    curve.tension = 0.5;

    const curvePoints = curve.getPoints(50);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const color = getPacketColor(packet.type);
    const lineMaterial = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.scene.add(line);

    const particleCount = 20 + Math.floor(Math.random() * (this.particleDensity - 20));
    const particlePositions = new Float32Array(particleCount * 3);
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color,
      size: 3,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(particles);

    const info: FlowLineInfo = {
      id: packet.id,
      from,
      to,
      curve,
      line,
      particles,
      particlePositions,
      particleCount,
      progress: 0,
      startTime: Date.now(),
      duration: packet.duration,
      color,
      type: packet.type,
      isGrayed: false,
    };
    this.flowLines.set(packet.id, info);
  }

  private updateFlowLineAppearance(line: FlowLineInfo): void {
    if (line.isGrayed) {
      (line.line.material as THREE.LineBasicMaterial).color.setHex(0x666666);
      (line.line.material as THREE.LineBasicMaterial).opacity = 0.3;
      (line.particles.material as THREE.PointsMaterial).color.setHex(0x666666);
    } else {
      (line.line.material as THREE.LineBasicMaterial).color.setHex(line.color);
      (line.line.material as THREE.LineBasicMaterial).opacity = 0.8;
      (line.particles.material as THREE.PointsMaterial).color.setHex(line.color);
    }
  }

  private clearFlowLines(): void {
    this.flowLines.forEach((line) => {
      this.scene.remove(line.line);
      this.scene.remove(line.particles);
      line.line.geometry.dispose();
      (line.line.material as THREE.Material).dispose();
      line.particles.geometry.dispose();
      (line.particles.material as THREE.Material).dispose();
    });
    this.flowLines.clear();
  }

  update(time: number): void {
    const elapsed = time / 1000;

    this.nodeMeshes.forEach((info) => {
      if (this.showPulse && info.pulseMesh.visible) {
        const pulsePhase = (elapsed % PULSE_PERIOD) / PULSE_PERIOD;
        const pulseScale = 1 + pulsePhase * 1.5;
        const baseScale =
          NODE_MIN_SIZE + (NODE_MAX_SIZE - NODE_MIN_SIZE) * (info.traffic / 100);
        info.pulseMesh.scale.setScalar(baseScale * pulseScale);
        (info.pulseMesh.material as THREE.MeshBasicMaterial).opacity =
          0.2 + (1 - pulsePhase) * 0.8;
      }

      if (info.highlighted) {
        const blink = Math.sin(elapsed * Math.PI * 4) > 0;
        const mat = info.mesh.material as THREE.MeshBasicMaterial;
        if (blink) {
          mat.color.setHex(0xffff00);
        } else {
          mat.color.copy(getTrafficColor(info.traffic));
        }
      }
    });

    const toRemove: string[] = [];
    this.flowLines.forEach((line, id) => {
      const lineElapsed = Date.now() - line.startTime;
      const fadeProgress = lineElapsed / line.duration;

      if (fadeProgress >= 1) {
        toRemove.push(id);
        return;
      }

      line.progress = fadeProgress;
      const opacity = fadeProgress < 0.8 ? 0.8 : (1 - fadeProgress) * 4;
      (line.line.material as THREE.LineBasicMaterial).opacity = line.isGrayed ? 0.3 : opacity;
      (line.particles.material as THREE.PointsMaterial).opacity = line.isGrayed ? 0.2 : opacity * 0.9;

      for (let i = 0; i < line.particleCount; i++) {
        const t = (fadeProgress + i / line.particleCount) % 1;
        const point = line.curve.getPoint(t);
        line.particlePositions[i * 3] = point.x;
        line.particlePositions[i * 3 + 1] = point.y;
        line.particlePositions[i * 3 + 2] = point.z;
      }
      line.particles.geometry.attributes.position.needsUpdate = true;
    });

    toRemove.forEach((id) => {
      const line = this.flowLines.get(id);
      if (line) {
        this.scene.remove(line.line);
        this.scene.remove(line.particles);
        line.line.geometry.dispose();
        (line.line.material as THREE.Material).dispose();
        line.particles.geometry.dispose();
        (line.particles.material as THREE.Material).dispose();
        this.flowLines.delete(id);
      }
    });
  }

  updateFPS(fps: number): void {
    if (fps < 30) {
      this.particleDensity = 20;
      this.showPulse = false;
      this.nodeMeshes.forEach((info) => {
        info.pulseMesh.visible = false;
      });
    }
  }

  getNodeMeshes(): NodeMeshInfo[] {
    return Array.from(this.nodeMeshes.values());
  }

  setHoveredNode(node: NodeMeshInfo | null, event?: MouseEvent): void {
    this.hoveredNode = node;
    this.updateTooltip(node, event);
  }

  private updateTooltip(node: NodeMeshInfo | null, event?: MouseEvent): void {
    if (!this.tooltipEl) {
      this.tooltipEl = document.createElement('div');
      this.tooltipEl.style.cssText = `
        position: absolute;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 10px 14px;
        color: #ffffff;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        pointer-events: none;
        z-index: 100;
        opacity: 0;
        transition: opacity 0.2s;
        min-width: 160px;
      `;
      document.body.appendChild(this.tooltipEl);
    }

    if (node && event) {
      this.tooltipEl.innerHTML = `
        <div style="font-weight:600;margin-bottom:6px;color:#00d4ff">${node.name}</div>
        <div style="color:#94a3b8;margin-bottom:3px">流量: <span style="color:#fff">${node.traffic.toFixed(1)} Mbps</span></div>
        <div style="color:#94a3b8">延迟: <span style="color:#fff">${node.latency.toFixed(0)} ms</span></div>
      `;
      this.tooltipEl.style.left = `${event.clientX + 15}px`;
      this.tooltipEl.style.top = `${event.clientY + 15}px`;
      this.tooltipEl.style.opacity = '1';
    } else {
      this.tooltipEl.style.opacity = '0';
    }
  }

  drawLabels(camera: THREE.Camera, width: number, height: number): void {
    if (!this.labelContext || !this.labelCanvas) return;
    const ctx = this.labelContext;
    ctx.clearRect(0, 0, width, height);

    this.nodeMeshes.forEach((info) => {
      if (!info.mesh.visible) return;
      const mat = info.mesh.material as THREE.MeshBasicMaterial;
      if (mat.opacity < 0.3) return;

      const pos = info.mesh.position.clone().project(camera);
      const x = ((pos.x + 1) / 2) * width;
      const y = ((-pos.y + 1) / 2) * height;

      if (pos.z > 1 || pos.z < -1) return;

      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * mat.opacity})`;
      ctx.textAlign = 'center';
      ctx.fillText(info.name, x, y - 18);
    });
  }

  rotateGlobe(delta: number): void {
    if (this.globeMesh) {
      this.globeMesh.rotation.y += delta * 0.001;
      this.nodeMeshes.forEach((info) => {
        info.mesh.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), delta * 0.001);
        info.pulseMesh.position.copy(info.mesh.position);
        info.pulseMesh.lookAt(new THREE.Vector3(0, 0, 0));
        info.position.copy(info.mesh.position);
      });
    }
  }
}
