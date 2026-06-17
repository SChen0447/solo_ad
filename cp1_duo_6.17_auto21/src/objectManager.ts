import * as THREE from 'three';
import { SimulationParams } from './eventBus';

type ObstacleType = 'sphere' | 'cylinder' | 'airfoil' | 'car' | 'pyramid' | 'flatplate' | 'wedge' | 'hemisphere' | 'concavemirror' | 'custom';
type DisplayMode = 'particles' | 'streamlines' | 'pressure' | 'overlay';

export class ObjectManager {
  private scene: THREE.Scene;
  private params: SimulationParams;
  private obstacleGroup: THREE.Group;
  private obstacleMesh: THREE.Object3D | null = null;
  private wireframeMesh: THREE.LineSegments | null = null;
  private streamlines: THREE.Line[] = [];
  private targetRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  private currentRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  private displayMode: DisplayMode = 'particles';
  private obstacleBoundingBox: THREE.Box3 = new THREE.Box3();
  private customGeometry: THREE.BufferGeometry | null = null;
  private pressureColors: Float32Array | null = null;
  private frameCounter: number = 0;

  constructor(scene: THREE.Scene, params: SimulationParams) {
    this.scene = scene;
    this.params = params;

    this.obstacleGroup = new THREE.Group();
    this.scene.add(this.obstacleGroup);

    this.setObstacle(params.obstacleType);
    this.updateRotation(params.rotationX, params.rotationY, params.rotationZ);
    this.setDisplayMode(params.displayMode);
  }

  setObstacle(type: string): void {
    this.clearObstacle();
    const obstacleType = type as ObstacleType;
    this.createObstacle(obstacleType);
    this.createWireframe();
    this.createStreamlines();
    this.updateBoundingBox();
  }

  updateRotation(rx: number, ry: number, rz: number): void {
    this.targetRotation.set(
      THREE.MathUtils.degToRad(rx),
      THREE.MathUtils.degToRad(ry),
      THREE.MathUtils.degToRad(rz)
    );
  }

  setDisplayMode(mode: string): void {
    this.displayMode = mode as DisplayMode;
    this.updateMaterialVisibility();
  }

  getObstacleMesh(): THREE.Object3D | null {
    return this.obstacleMesh;
  }

  getPressureAt(worldPoint: THREE.Vector3): number {
    if (!this.obstacleMesh) return 0;

    const center = new THREE.Vector3();
    this.obstacleMesh.getWorldPosition(center);

    const worldRot = new THREE.Quaternion();
    this.obstacleMesh.getWorldQuaternion(worldRot);
    const invRot = worldRot.clone().invert();

    const localPoint = worldPoint.clone().sub(center).applyQuaternion(invRot);
    const flowDir = new THREE.Vector3(1, 0, 0);

    const rVec = localPoint.clone();
    const r = rVec.length();
    if (r < 1e-8) return 1.0;

    const surfaceNormal = rVec.clone().normalize();
    const dot = THREE.MathUtils.clamp(surfaceNormal.dot(flowDir), -1, 1);
    const theta = Math.acos(dot);

    let cp: number;
    const pi9 = Math.PI / 9;
    const pi3 = Math.PI / 3;
    const pi23 = 2 * Math.PI / 3;
    const pi = Math.PI;

    if (theta < pi9) {
      const ratio = theta / pi9;
      cp = 1.0 - 2.5 * ratio * ratio;
    } else if (theta < pi3) {
      const cpPotential = 1 - 4 * Math.sin(theta) * Math.sin(theta);
      const curvatureSign = 1.0;
      const suctionCorrection = -0.6 * Math.exp(-Math.pow(theta - Math.PI / 6, 2) / 0.05) * curvatureSign;
      cp = cpPotential + suctionCorrection;
    } else if (theta < pi23) {
      const cpPotential = 1 - 4 * Math.sin(theta) * Math.sin(theta);
      const blRatio = (theta - pi3) / pi3;
      const blCorrection = 0.3 * Math.pow(blRatio, 1.5);
      cp = cpPotential + blCorrection;
    } else {
      const basePressure = -0.2 + 0.1 * Math.sin(theta * 3);
      const recoveryRatio = (theta - pi23) / (pi - pi23);
      const recovery = recoveryRatio * 0.3;
      cp = basePressure + recovery;
    }

    const curvature = this.estimateSurfaceCurvature(localPoint);
    const curvatureCorrection = -curvature * 0.5 * Math.cos(theta) * Math.exp(-Math.pow(theta - Math.PI / 4, 2) / 0.3);
    cp += curvatureCorrection;

    const Re = this.params.windSpeed * 3.0 / 1.5e-5;
    const reCorrectionFactor = 0.02 * Math.log10(Re / 1e5);
    cp *= (1 + reCorrectionFactor * Math.cos(theta));

    cp = THREE.MathUtils.clamp(cp, -1.5, 1.5);
    return cp;
  }

  update(elapsed: number): void {
    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.1;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.1;
    this.currentRotation.z += (this.targetRotation.z - this.currentRotation.z) * 0.1;

    if (this.obstacleMesh) {
      this.obstacleMesh.rotation.copy(this.currentRotation);
    }
    if (this.wireframeMesh) {
      this.wireframeMesh.rotation.copy(this.currentRotation);
    }

    this.streamlines.forEach((line, index) => {
      line.rotation.copy(this.currentRotation);
      const positions = line.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(elapsed * 2 + index + i * 0.1) * 0.002;
      }
      line.geometry.attributes.position.needsUpdate = true;
    });

    this.frameCounter++;
    this.updatePressureCloud(elapsed);
    this.updateBoundingBox();
  }

  setCustomGeometry(geometry: THREE.BufferGeometry): void {
    if (!geometry || !geometry.getAttribute('position') || geometry.getAttribute('position').count <= 3) {
      console.warn('setCustomGeometry: invalid geometry - position attribute missing or vertex count <= 3');
      return;
    }
    this.customGeometry = geometry;
    if (this.params.obstacleType === 'custom') {
      this.setObstacle('custom');
    }
  }

  createCustomGeometryExample(): THREE.BufferGeometry {
    const widthSegments = 48;
    const heightSegments = 32;
    const a = 2.0;
    const b = 1.2;
    const c = 1.5;

    const positions: number[] = [];
    const indices: number[] = [];

    for (let y = 0; y <= heightSegments; y++) {
      const v = y / heightSegments;
      const phi = v * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x <= widthSegments; x++) {
        const u = x / widthSegments;
        const theta = u * Math.PI * 2;

        const px = a * sinPhi * Math.cos(theta);
        const py = b * cosPhi;
        const pz = c * sinPhi * Math.sin(theta);

        positions.push(px, py, pz);
      }
    }

    for (let y = 0; y < heightSegments; y++) {
      for (let x = 0; x < widthSegments; x++) {
        const i = y * (widthSegments + 1) + x;
        indices.push(i, i + 1, i + widthSegments + 1);
        indices.push(i + 1, i + widthSegments + 2, i + widthSegments + 1);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  getObstacleBoundingBox(): THREE.Box3 {
    return this.obstacleBoundingBox.clone();
  }

  updatePressureCloud(elapsed: number): void {
    if (this.frameCounter % 10 !== 0) return;
    this.updatePressureColors();
  }

  private clearObstacle(): void {
    if (this.obstacleMesh) {
      this.obstacleGroup.remove(this.obstacleMesh);
      this.disposeObject(this.obstacleMesh);
      this.obstacleMesh = null;
    }
    if (this.wireframeMesh) {
      this.obstacleGroup.remove(this.wireframeMesh);
      this.wireframeMesh.geometry.dispose();
      (this.wireframeMesh.material as THREE.Material).dispose();
      this.wireframeMesh = null;
    }
    this.streamlines.forEach(line => {
      this.obstacleGroup.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.streamlines = [];
  }

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  private createObstacle(type: ObstacleType): void {
    let geometry: THREE.BufferGeometry;
    let mesh: THREE.Object3D;

    switch (type) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(1.5, 32, 16);
        mesh = this.createMeshWithColors(geometry);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(1.2, 1.2, 4, 24);
        mesh = this.createMeshWithColors(geometry);
        mesh.rotation.z = Math.PI / 2;
        break;
      case 'airfoil':
        geometry = this.createAirfoilGeometry();
        mesh = this.createMeshWithColors(geometry);
        break;
      case 'car':
        mesh = this.createCarModel();
        break;
      case 'pyramid':
        geometry = new THREE.ConeGeometry(1.5, 2, 4);
        mesh = this.createMeshWithColors(geometry);
        break;
      case 'flatplate':
        geometry = new THREE.BoxGeometry(4, 0.1, 3);
        mesh = this.createMeshWithColors(geometry);
        break;
      case 'wedge':
        geometry = this.createWedgeGeometry();
        mesh = this.createMeshWithColors(geometry);
        break;
      case 'hemisphere':
        geometry = new THREE.SphereGeometry(1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        mesh = this.createMeshWithColors(geometry);
        break;
      case 'concavemirror':
        geometry = this.createConcaveMirrorGeometry();
        mesh = this.createMeshWithColors(geometry);
        break;
      case 'custom':
        geometry = this.customGeometry || new THREE.BufferGeometry();
        mesh = this.createMeshWithColors(geometry);
        break;
      default:
        geometry = new THREE.SphereGeometry(1.5, 32, 16);
        mesh = this.createMeshWithColors(geometry);
    }

    this.obstacleMesh = mesh;
    this.obstacleGroup.add(mesh);
    this.updatePressureColors();
  }

  private createMeshWithColors(geometry: THREE.BufferGeometry): THREE.Mesh {
    const positionAttr = geometry.getAttribute('position');
    const vertexCount = positionAttr.count;
    const colors = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      const x = positionAttr.getX(i);
      const y = positionAttr.getY(i);
      const z = positionAttr.getZ(i);
      const point = new THREE.Vector3(x, y, z);
      const cp = this.calculateVertexPressure(point);
      const color = this.cpToRgb(cp);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.pressureColors = colors;

    const material = new THREE.MeshPhongMaterial({
      color: 0x45A29E,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      vertexColors: true,
      shininess: 50
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createAirfoilGeometry(): THREE.BufferGeometry {
    const chord = 4;
    const t = 0.12;
    const numPoints = 200;
    const r = 1.1019 * t * t;

    const upperPoints: THREE.Vector2[] = [];
    const lowerPoints: THREE.Vector2[] = [];

    for (let i = 0; i <= numPoints; i++) {
      let xNorm: number;
      let beta: number;

      if (i < numPoints) {
        beta = (i / numPoints) * Math.PI;
        xNorm = 0.5 * (1 - Math.cos(beta));
      } else {
        xNorm = 1.0;
      }

      let yt: number;
      let xActual = xNorm;

      if (xNorm < 0.005) {
        const thetaArc = Math.acos(1 - xNorm / r);
        xActual = r * (1 - Math.cos(thetaArc));
        yt = r * Math.sin(thetaArc);
      } else {
        const x = xNorm;
        yt = 5 * t * (
          0.2969 * Math.sqrt(x) -
          0.1260 * x -
          0.3516 * x * x +
          0.2843 * x * x * x -
          0.1015 * x * x * x * x
        );
      }

      if (i > numPoints - 10) {
        const tailIdx = numPoints - 10;
        const tailBeta = (tailIdx / numPoints) * Math.PI;
        const tailXNorm = 0.5 * (1 - Math.cos(tailBeta));
        const tailX = tailXNorm * chord;
        const tailYT = 5 * t * (
          0.2969 * Math.sqrt(tailXNorm) -
          0.1260 * tailXNorm -
          0.3516 * tailXNorm * tailXNorm +
          0.2843 * tailXNorm * tailXNorm * tailXNorm -
          0.1015 * tailXNorm * tailXNorm * tailXNorm * tailXNorm
        ) * chord;
        const linearT = (i - tailIdx) / 10;
        upperPoints.push(new THREE.Vector2(
          tailX + linearT * (chord - tailX),
          tailYT * (1 - linearT)
        ));
        lowerPoints.push(new THREE.Vector2(
          tailX + linearT * (chord - tailX),
          -tailYT * (1 - linearT)
        ));
      } else {
        upperPoints.push(new THREE.Vector2(xActual * chord, yt * chord));
        lowerPoints.push(new THREE.Vector2(xActual * chord, -yt * chord));
      }
    }

    let valid = true;
    for (let i = 1; i < upperPoints.length - 1; i++) {
      const dx1 = upperPoints[i].x - upperPoints[i - 1].x;
      const dy1 = upperPoints[i].y - upperPoints[i - 1].y;
      const dx2 = upperPoints[i + 1].x - upperPoints[i].x;
      const dy2 = upperPoints[i + 1].y - upperPoints[i].y;
      if (dx1 > 1e-8 && dx2 > 1e-8) {
        const s1 = dy1 / dx1;
        const s2 = dy2 / dx2;
        if (Math.abs(s2 - s1) > 0.05) {
          valid = false;
          break;
        }
      }
    }

    const allAirfoilPoints: THREE.Vector2[] = [];
    for (let i = 0; i < upperPoints.length; i++) {
      allAirfoilPoints.push(upperPoints[i]);
    }
    for (let i = lowerPoints.length - 2; i >= 1; i--) {
      allAirfoilPoints.push(lowerPoints[i]);
    }

    const splinePoints3D: THREE.Vector3[] = allAirfoilPoints.map(
      p => new THREE.Vector3(p.x, p.y, 0)
    );
    const catmull = new THREE.CatmullRomCurve3(splinePoints3D, true);
    const smoothedPoints = catmull.getPoints(400);

    const shape = new THREE.Shape();
    shape.moveTo(smoothedPoints[0].x, smoothedPoints[0].y);
    for (let i = 1; i < smoothedPoints.length; i++) {
      shape.lineTo(smoothedPoints[i].x, smoothedPoints[i].y);
    }

    const extrudeSettings = {
      steps: 1,
      depth: 1.5,
      bevelEnabled: false
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(-chord / 2, 0, -0.75);
    return geometry;
  }

  private createCarModel(): THREE.Group {
    const group = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(3, 0.8, 1.5);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0x45A29E,
      transparent: true,
      opacity: 0.6,
      vertexColors: false
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    group.add(body);

    const roofGeo = new THREE.BoxGeometry(1.8, 0.6, 1.3);
    const roofMat = new THREE.MeshPhongMaterial({
      color: 0x66B2A8,
      transparent: true,
      opacity: 0.6,
      vertexColors: false
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(-0.3, 1.1, 0);
    group.add(roof);

    const wheelPositions = [
      [-1, 0.3, 0.75], [1, 0.3, 0.75],
      [-1, 0.3, -0.75], [1, 0.3, -0.75]
    ];

    wheelPositions.forEach(pos => {
      const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
      const wheelMat = new THREE.MeshPhongMaterial({
        color: 0x2a2a3a,
        transparent: true,
        opacity: 0.8
      });
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      group.add(wheel);
    });

    return group;
  }

  private createWedgeGeometry(): THREE.BufferGeometry {
    const vertices = new Float32Array([
      -2, -0.5, -1,
      2, -0.5, -1,
      2, -0.5, 1,
      -2, -0.5, 1,
      -2, 1.5, 0,
      2, 1.5, 0
    ]);

    const indices = [
      0, 1, 2, 0, 2, 3,
      0, 4, 5, 0, 5, 1,
      1, 5, 2,
      2, 5, 4, 2, 4, 3,
      3, 4, 0
    ];

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  private createConcaveMirrorGeometry(): THREE.BufferGeometry {
    const width = 4;
    const height = 3;
    const depth = 1;
    const segments = 32;

    const vertices: number[] = [];
    const indices: number[] = [];

    for (let y = 0; y <= segments; y++) {
      const v = y / segments;
      const py = (v - 0.5) * height;

      for (let x = 0; x <= segments; x++) {
        const u = x / segments;
        const px = (u - 0.5) * width;
        const distFromCenter = Math.sqrt(px * px + py * py);
        const maxDist = Math.sqrt(width * width + height * height) / 2;
        const pz = -Math.cos(distFromCenter / maxDist * Math.PI / 2) * depth;

        vertices.push(px, py, pz);
      }
    }

    for (let y = 0; y < segments; y++) {
      for (let x = 0; x < segments; x++) {
        const i = y * (segments + 1) + x;
        indices.push(i, i + 1, i + segments + 1);
        indices.push(i + 1, i + segments + 2, i + segments + 1);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  private createWireframe(): void {
    if (!this.obstacleMesh) return;

    let geometry: THREE.BufferGeometry;

    if (this.obstacleMesh instanceof THREE.Group) {
      const mergedGeo = new THREE.BufferGeometry();
      const positions: number[] = [];
      this.obstacleMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const posAttr = child.geometry.getAttribute('position');
          for (let i = 0; i < posAttr.count; i++) {
            const v = new THREE.Vector3(
              posAttr.getX(i),
              posAttr.getY(i),
              posAttr.getZ(i)
            );
            v.applyMatrix4(child.matrixWorld);
            positions.push(v.x, v.y, v.z);
          }
        }
      });
      mergedGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry = mergedGeo;
    } else if (this.obstacleMesh instanceof THREE.Mesh) {
      geometry = this.obstacleMesh.geometry;
    } else {
      return;
    }

    const edges = new THREE.EdgesGeometry(geometry, 20);
    const material = new THREE.LineBasicMaterial({
      color: 0x66FFF0,
      transparent: true,
      opacity: 0.4
    });
    this.wireframeMesh = new THREE.LineSegments(edges, material);
    this.obstacleGroup.add(this.wireframeMesh);
  }

  private createStreamlines(): void {
    const bbox = new THREE.Box3().setFromObject(this.obstacleGroup);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const streamlineCount = 8;
    const radius = maxDim * 1.5;

    for (let i = 0; i < streamlineCount; i++) {
      const angle = (i / streamlineCount) * Math.PI * 2;
      const startY = Math.sin(angle) * radius;
      const startZ = Math.cos(angle) * radius;

      const curvePoints: THREE.Vector3[] = [];
      const segments = 50;

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const x = -maxDim * 2 + t * maxDim * 4;
        const deflection = Math.sin(t * Math.PI) * 0.5;
        const y = startY + deflection * Math.sin(angle);
        const z = startZ + deflection * Math.cos(angle);
        curvePoints.push(new THREE.Vector3(x, y, z));
      }

      const curve = new THREE.CatmullRomCurve3(curvePoints);
      const tubePoints = curve.getPoints(100);
      const geometry = new THREE.BufferGeometry().setFromPoints(tubePoints);

      const gradientColors = new Float32Array(tubePoints.length * 3);
      for (let j = 0; j < tubePoints.length; j++) {
        const t = j / tubePoints.length;
        gradientColors[j * 3] = 0.3 + t * 0.7;
        gradientColors[j * 3 + 1] = 0.8 - t * 0.3;
        gradientColors[j * 3 + 2] = 1.0 - t * 0.3;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(gradientColors, 3));

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.5
      });

      const line = new THREE.Line(geometry, material);
      this.streamlines.push(line);
      this.obstacleGroup.add(line);
    }
  }

  private updateMaterialVisibility(): void {
    if (!this.obstacleMesh) return;

    const showSolid = this.displayMode === 'particles' || this.displayMode === 'overlay';
    const showPressure = this.displayMode === 'pressure' || this.displayMode === 'overlay';
    const showStreamlines = this.displayMode === 'streamlines' || this.displayMode === 'overlay';

    this.obstacleMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshPhongMaterial;
        if (mat.vertexColors) {
          mat.visible = showPressure;
        } else {
          mat.visible = showSolid;
        }
      }
    });

    if (this.wireframeMesh) {
      this.wireframeMesh.visible = showSolid || showPressure;
    }

    this.streamlines.forEach(line => {
      line.visible = showStreamlines;
    });
  }

  private updatePressureColors(): void {
    if (!this.obstacleMesh) return;

    this.obstacleMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;
        const positionAttr = geometry.getAttribute('position');
        if (!positionAttr) return;

        const vertexCount = positionAttr.count;
        const colors = new Float32Array(vertexCount * 3);

        for (let i = 0; i < vertexCount; i++) {
          const x = positionAttr.getX(i);
          const y = positionAttr.getY(i);
          const z = positionAttr.getZ(i);
          const point = new THREE.Vector3(x, y, z);
          const cp = this.calculateVertexPressure(point);
          const color = this.cpToRgb(cp);
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.pressureColors = colors;
      }
    });
  }

  private calculateVertexPressure(point: THREE.Vector3): number {
    const flowDir = new THREE.Vector3(1, 0, 0);

    const rVec = point.clone();
    const r = rVec.length();
    if (r < 1e-8) return 1.0;

    const surfaceNormal = rVec.clone().normalize();
    const dot = THREE.MathUtils.clamp(surfaceNormal.dot(flowDir), -1, 1);
    const theta = Math.acos(dot);
    const x_s = r * (1 - Math.cos(theta));

    let cp: number;
    const pi9 = Math.PI / 9;
    const pi3 = Math.PI / 3;
    const pi23 = 2 * Math.PI / 3;
    const pi = Math.PI;

    if (theta < pi9) {
      const ratio = theta / pi9;
      cp = 1.0 - 2.5 * ratio * ratio;
    } else if (theta < pi3) {
      const cpPotential = 1 - 4 * Math.sin(theta) * Math.sin(theta);
      const curvatureSign = 1.0;
      const suctionCorrection = -0.6 * Math.exp(-Math.pow(theta - Math.PI / 6, 2) / 0.05) * curvatureSign;
      cp = cpPotential + suctionCorrection;
    } else if (theta < pi23) {
      const cpPotential = 1 - 4 * Math.sin(theta) * Math.sin(theta);
      const blRatio = (theta - pi3) / pi3;
      const blCorrection = 0.3 * Math.pow(blRatio, 1.5);
      cp = cpPotential + blCorrection;
    } else {
      const basePressure = -0.2 + 0.1 * Math.sin(theta * 3);
      const recoveryRatio = (theta - pi23) / (pi - pi23);
      const recovery = recoveryRatio * 0.3;
      cp = basePressure + recovery;
    }

    const curvature = this.estimateSurfaceCurvature(point);
    const curvatureCorrection = -curvature * 0.5 * Math.cos(theta) * Math.exp(-Math.pow(theta - Math.PI / 4, 2) / 0.3);
    cp += curvatureCorrection;

    const Re = this.params.windSpeed * 3.0 / 1.5e-5;
    const reCorrectionFactor = 0.02 * Math.log10(Re / 1e5);
    cp *= (1 + reCorrectionFactor * Math.cos(theta));

    cp = THREE.MathUtils.clamp(cp, -1.5, 1.5);
    return cp;
  }

  private estimateSurfaceCurvature(point: THREE.Vector3): number {
    const vertices: THREE.Vector3[] = [];

    if (this.obstacleMesh && this.obstacleMesh instanceof THREE.Mesh) {
      const posAttr = this.obstacleMesh.geometry.getAttribute('position');
      if (posAttr) {
        for (let i = 0; i < posAttr.count; i++) {
          vertices.push(new THREE.Vector3(
            posAttr.getX(i),
            posAttr.getY(i),
            posAttr.getZ(i)
          ));
        }
      }
    }

    if (vertices.length < 8) {
      return 0.0;
    }

    const distances: { idx: number; dist: number }[] = [];
    for (let i = 0; i < vertices.length; i++) {
      distances.push({ idx: i, dist: vertices[i].distanceTo(point) });
    }
    distances.sort((a, b) => a.dist - b.dist);

    const nearestCount = Math.min(8, distances.length);
    const nearest: THREE.Vector3[] = [];
    for (let i = 0; i < nearestCount; i++) {
      nearest.push(vertices[distances[i].idx]);
    }

    const normal = point.clone().normalize();
    const tangent1 = new THREE.Vector3();
    if (Math.abs(normal.x) < 0.9) {
      tangent1.crossVectors(normal, new THREE.Vector3(1, 0, 0)).normalize();
    } else {
      tangent1.crossVectors(normal, new THREE.Vector3(0, 1, 0)).normalize();
    }
    const tangent2 = new THREE.Vector3().crossVectors(normal, tangent1).normalize();

    const points2D: { u: number; v: number; w: number }[] = [];
    for (const v of nearest) {
      const diff = v.clone().sub(point);
      const u = diff.dot(tangent1);
      const vCoord = diff.dot(tangent2);
      const w = diff.dot(normal);
      points2D.push({ u, v: vCoord, w });
    }

    const n = points2D.length;
    if (n < 6) return 0.0;

    const A: number[][] = [];
    const B: number[] = [];
    for (const p of points2D) {
      A.push([p.u * p.u, p.u * p.v, p.v * p.v, p.u, p.v, 1]);
      B.push(p.w);
    }

    const ATA: number[][] = [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]];
    const ATB: number[] = [0, 0, 0, 0, 0, 0];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 6; j++) {
        for (let k = 0; k < 6; k++) {
          ATA[j][k] += A[i][j] * A[i][k];
        }
        ATB[j] += A[i][j] * B[i];
      }
    }

    for (let col = 0; col < 6; col++) {
      let maxRow = col;
      for (let row = col + 1; row < 6; row++) {
        if (Math.abs(ATA[row][col]) > Math.abs(ATA[maxRow][col])) {
          maxRow = row;
        }
      }
      if (maxRow !== col) {
        [ATA[col], ATA[maxRow]] = [ATA[maxRow], ATA[col]];
        [ATB[col], ATB[maxRow]] = [ATB[maxRow], ATB[col]];
      }
      const pivot = ATA[col][col];
      if (Math.abs(pivot) < 1e-12) return 0.0;
      for (let row = col + 1; row < 6; row++) {
        const factor = ATA[row][col] / pivot;
        for (let k = col; k < 6; k++) {
          ATA[row][k] -= factor * ATA[col][k];
        }
        ATB[row] -= factor * ATB[col];
      }
    }

    const x = new Array(6).fill(0);
    for (let row = 5; row >= 0; row--) {
      let sum = ATB[row];
      for (let k = row + 1; k < 6; k++) {
        sum -= ATA[row][k] * x[k];
      }
      x[row] = sum / ATA[row][row];
    }

    const a = x[0];
    const b = x[1];
    const c = x[2];

    const H = a + c;

    let curvature = H;
    curvature = THREE.MathUtils.clamp(curvature, -0.5, 0.5);
    return curvature;
  }

  private cpToRgb(cp: number): { r: number; g: number; b: number } {
    const t = Math.max(0, Math.min(1, (cp + 1.5) / 3.0));
    const r = t;
    const b = 1 - t;
    const g = (1 - Math.abs(t - 0.5) * 2) * 0.5;
    return { r, g, b };
  }

  private updateBoundingBox(): void {
    if (this.obstacleMesh) {
      this.obstacleBoundingBox.setFromObject(this.obstacleMesh);
    }
  }
}
