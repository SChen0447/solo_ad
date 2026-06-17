import * as THREE from 'three';
import {
  addBuilding,
  removeBuilding,
  updateBuilding,
  getBuilding,
  undoDelete,
  getDeleteHistoryCount,
  type BuildingType,
  type BuildingData,
} from './cityData';

type EventCallback = (...args: unknown[]) => void;
const eventBus: Map<string, EventCallback[]> = new Map();

export function on(event: string, cb: EventCallback) {
  if (!eventBus.has(event)) eventBus.set(event, []);
  eventBus.get(event)!.push(cb);
}

export function emit(event: string, ...args: unknown[]) {
  const cbs = eventBus.get(event);
  if (cbs) cbs.forEach((cb) => cb(...args));
}

export class CityBuilder {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private groundPlane: THREE.Mesh;
  private buildingMeshes: Map<string, THREE.Group> = new Map();
  private selectionBox: THREE.LineSegments | null = null;
  private selectionPulseTime = 0;
  private selectedId: string | null = null;
  private placementMode: BuildingType | null = null;
  private isDragging = false;
  private isRotating = false;
  private dragStart: THREE.Vector2 = new THREE.Vector2();
  private dragCurrent: THREE.Vector2 = new THREE.Vector2();
  private deleteAnimations: {
    mesh: THREE.Group;
    startTime: number;
    duration: number;
  }[] = [];
  private spawnAnimations: {
    mesh: THREE.Group;
    startTime: number;
    duration: number;
    fromY: number;
    toY: number;
    isUndo: boolean;
  }[] = [];
  private angleTooltip: HTMLDivElement | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera, groundPlane: THREE.Mesh) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = groundPlane;
    this.createAngleTooltip();
  }

  private createAngleTooltip() {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: #00bcd4; font-size: 18px; font-family: monospace;
      background: rgba(0,0,0,0.7); padding: 4px 12px; border-radius: 6px;
      pointer-events: none; display: none; z-index: 100;
    `;
    document.body.appendChild(el);
    this.angleTooltip = el;
  }

  setPlacementMode(type: BuildingType | null) {
    this.placementMode = type;
    this.deselect();
    if (type) {
      document.body.style.cursor = 'crosshair';
    } else {
      document.body.style.cursor = 'default';
    }
    emit('placementModeChanged', type);
  }

  getPlacementMode(): BuildingType | null {
    return this.placementMode;
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  private createResidentialBuilding(): THREE.Group {
    const group = new THREE.Group();
    const baseW = 2 + Math.random() * 2;
    const baseD = 2 + Math.random() * 2;
    const baseH = 3 + Math.random() * 5;

    const warmColors = [
      0xf5e6d3,
      0xfff0dc,
      0xffe4b5,
      0xffdab9,
      0xf5deb3,
      0xffcba4,
      0xffb6c1,
      0xffc0cb,
      0xffe4e1,
      0xe6cfa5,
    ];
    const primaryColor = warmColors[Math.floor(Math.random() * warmColors.length)];
    const roofColors = [0x8b4513, 0xa0522d, 0xcd853f, 0xd2691e, 0x8b0000, 0x654321];
    const roofColor = roofColors[Math.floor(Math.random() * roofColors.length)];
    const trimColor = 0xffffff;

    const baseGeo = new THREE.BoxGeometry(baseW, baseH, baseD);
    const baseMat = new THREE.MeshPhongMaterial({
      color: primaryColor,
      shininess: 20,
      specular: 0x222222,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = baseH / 2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    const trimGeo = new THREE.BoxGeometry(baseW + 0.02, 0.15, baseD + 0.02);
    const trimMat = new THREE.MeshPhongMaterial({ color: trimColor });
    const bottomTrim = new THREE.Mesh(trimGeo, trimMat);
    bottomTrim.position.y = 0.08;
    bottomTrim.castShadow = true;
    bottomTrim.receiveShadow = true;
    group.add(bottomTrim);
    const topTrim = new THREE.Mesh(trimGeo, trimMat);
    topTrim.position.y = baseH - 0.08;
    topTrim.castShadow = true;
    topTrim.receiveShadow = true;
    group.add(topTrim);

    const roofGeo = new THREE.ConeGeometry(Math.max(baseW, baseD) * 0.75, 2, 4);
    const roofMat = new THREE.MeshPhongMaterial({ color: roofColor, shininess: 10 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = baseH + 1;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    const windowCols = Math.max(2, Math.floor(baseW / 1.3));
    const windowRows = Math.max(2, Math.floor(baseH / 1.8));
    const winW = 0.5;
    const winH = 0.7;
    const frameDepth = 0.08;

    for (let face = 0; face < 2; face++) {
      const zSign = face === 0 ? 1 : -1;
      for (let r = 0; r < windowRows; r++) {
        for (let c = 0; c < windowCols; c++) {
          const frameGeo = new THREE.BoxGeometry(winW + 0.1, winH + 0.1, frameDepth);
          const frameMat = new THREE.MeshPhongMaterial({ color: 0x8b7355 });
          const frame = new THREE.Mesh(frameGeo, frameMat);
          frame.position.set(
            -baseW / 2 + (baseW / (windowCols + 1)) * (c + 1),
            0.8 + r * 1.8,
            (baseD / 2 + 0.01) * zSign,
          );
          frame.castShadow = true;
          frame.receiveShadow = true;
          group.add(frame);

          const glassGeo = new THREE.BoxGeometry(winW - 0.05, winH - 0.05, frameDepth + 0.02);
          const isLit = Math.random() > 0.4;
          const glassMat = new THREE.MeshPhongMaterial({
            color: isLit ? 0xffffcc : 0x444466,
            emissive: isLit ? 0x443300 : 0x000000,
            emissiveIntensity: isLit ? 0.4 : 0,
            transparent: true,
            opacity: 0.9,
          });
          const glass = new THREE.Mesh(glassGeo, glassMat);
          glass.position.copy(frame.position);
          glass.position.z += 0.001 * zSign;
          group.add(glass);
        }
      }
    }

    const doorW = 0.6;
    const doorH = 1.2;
    const doorGeo = new THREE.BoxGeometry(doorW, doorH, 0.08);
    const doorMat = new THREE.MeshPhongMaterial({ color: 0x654321 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, doorH / 2, baseD / 2 + 0.05);
    door.castShadow = true;
    door.receiveShadow = true;
    group.add(door);

    const knobGeo = new THREE.SphereGeometry(0.04);
    const knobMat = new THREE.MeshPhongMaterial({ color: 0xffd700 });
    const knob = new THREE.Mesh(knobGeo, knobMat);
    knob.position.set(doorW / 2 - 0.08, doorH / 2, baseD / 2 + 0.095);
    group.add(knob);

    group.userData.buildingType = 'residential';
    return group;
  }

  private createCommercialBuilding(): THREE.Group {
    const group = new THREE.Group();
    const baseW = 3 + Math.random() * 3;
    const baseD = 3 + Math.random() * 3;
    const baseH = 8 + Math.random() * 12;

    const coolColors = [
      0xb3cde0,
      0xaec6cf,
      0x779ecb,
      0x87ceeb,
      0xc0c0c0,
      0xd3d3d3,
      0xe6e6fa,
      0xd8bfd8,
      0x9370db,
      0x6495ed,
    ];
    const primaryColor = coolColors[Math.floor(Math.random() * coolColors.length)];
    const accentColor = 0x4682b4;

    const coreGeo = new THREE.BoxGeometry(baseW, baseH, baseD);
    const coreMat = new THREE.MeshPhongMaterial({
      color: primaryColor,
      shininess: 80,
      specular: 0x444444,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = baseH / 2;
    coreMesh.castShadow = true;
    coreMesh.receiveShadow = true;
    group.add(coreMesh);

    const glassRows = Math.max(4, Math.floor(baseH / 1.5));
    const glassCols = Math.max(3, Math.floor(baseW / 1.2));
    const glassPaneW = (baseW * 0.9) / glassCols;
    const glassPaneH = (baseH * 0.9) / glassRows;

    for (let face = 0; face < 2; face++) {
      const zSign = face === 0 ? 1 : -1;
      for (let r = 0; r < glassRows; r++) {
        for (let c = 0; c < glassCols; c++) {
          const frameGeo = new THREE.BoxGeometry(glassPaneW + 0.04, glassPaneH + 0.04, 0.08);
          const frameMat = new THREE.MeshPhongMaterial({ color: 0x333344 });
          const frame = new THREE.Mesh(frameGeo, frameMat);
          frame.position.set(
            -baseW / 2 + glassPaneW / 2 + c * glassPaneW + baseW * 0.05,
            baseH * 0.05 + glassPaneH / 2 + r * glassPaneH,
            (baseD / 2 + 0.05) * zSign,
          );
          frame.castShadow = true;
          frame.receiveShadow = true;
          group.add(frame);

          const reflectivity = 0.3 + Math.random() * 0.3;
          const glassGeo = new THREE.BoxGeometry(glassPaneW - 0.02, glassPaneH - 0.02, 0.06);
          const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0x87cefa,
            transparent: true,
            opacity: 0.55 + Math.random() * 0.2,
            metalness: 0.1,
            roughness: 0.1,
            reflectivity: reflectivity,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            envMapIntensity: 1.0,
          });
          const glass = new THREE.Mesh(glassGeo, glassMat);
          glass.position.copy(frame.position);
          glass.position.z += 0.02 * zSign;
          group.add(glass);
        }
      }
    }

    for (let i = 0; i < 3; i++) {
      const stripeGeo = new THREE.BoxGeometry(baseW + 0.1, 0.15, baseD + 0.1);
      const stripeMat = new THREE.MeshPhongMaterial({ color: accentColor, shininess: 60 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.y = baseH * (0.25 + i * 0.25);
      stripe.castShadow = true;
      stripe.receiveShadow = true;
      group.add(stripe);
    }

    const topGeo = new THREE.BoxGeometry(baseW * 0.7, 0.6, baseD * 0.7);
    const topMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = baseH + 0.3;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const antennaGeo = new THREE.CylinderGeometry(0.05, 0.05, 2);
    const antennaMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.set(baseW * 0.15, baseH + 1.6, baseD * 0.15);
    antenna.castShadow = true;
    group.add(antenna);

    const lightGeo = new THREE.SphereGeometry(0.15);
    const lightMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff0000 });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(baseW * 0.15, baseH + 2.7, baseD * 0.15);
    group.add(light);

    const entranceGeo = new THREE.BoxGeometry(baseW * 0.3, 1.5, 0.1);
    const entranceMat = new THREE.MeshPhysicalMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.6,
      metalness: 0.2,
      roughness: 0.1,
      clearcoat: 1.0,
    });
    const entrance = new THREE.Mesh(entranceGeo, entranceMat);
    entrance.position.set(0, 0.75, baseD / 2 + 0.1);
    entrance.castShadow = true;
    group.add(entrance);

    group.userData.buildingType = 'commercial';
    return group;
  }

  private createPark(): THREE.Group {
    const group = new THREE.Group();
    const groundRadius = 3 + Math.random() * 1.5;

    const groundColors = [0x2d5a1e, 0x228b22, 0x3a7a2a, 0x2e6a1e, 0x4a8a3a];
    const groundColor = groundColors[Math.floor(Math.random() * groundColors.length)];

    const groundGeo = new THREE.CylinderGeometry(groundRadius, groundRadius, 0.1, 16);
    const groundMat = new THREE.MeshPhongMaterial({ color: groundColor });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = 0.05;
    ground.receiveShadow = true;
    group.add(ground);

    const pathColor = 0xc4a35a;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const pathGeo = new THREE.BoxGeometry(groundRadius * 0.7, 0.08, 0.5);
      const pathMat = new THREE.MeshPhongMaterial({ color: pathColor });
      const path = new THREE.Mesh(pathGeo, pathMat);
      path.position.set(
        Math.cos(angle) * groundRadius * 0.35,
        0.09,
        Math.sin(angle) * groundRadius * 0.35,
      );
      path.rotation.y = angle;
      path.receiveShadow = true;
      group.add(path);
    }

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (groundRadius - 0.5);
      const grassGeo = new THREE.ConeGeometry(0.1 + Math.random() * 0.1, 0.2 + Math.random() * 0.3, 5);
      const grassMat = new THREE.MeshPhongMaterial({
        color: 0x2e8b2e + Math.floor(Math.random() * 0x111111),
      });
      const grass = new THREE.Mesh(grassGeo, grassMat);
      grass.position.set(
        Math.cos(angle) * dist,
        0.15 + Math.random() * 0.1,
        Math.sin(angle) * dist,
      );
      grass.rotation.x = (Math.random() - 0.5) * 0.3;
      grass.rotation.z = (Math.random() - 0.5) * 0.3;
      grass.castShadow = true;
      group.add(grass);
    }

    const flowerColors = [0xff69b4, 0xff4500, 0xffff00, 0xff0000, 0x9370db, 0xffffff];
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (groundRadius - 1);
      const flower = new THREE.Group();
      for (let p = 0; p < 5; p++) {
        const petalGeo = new THREE.SphereGeometry(0.08, 6, 4);
        const petalMat = new THREE.MeshPhongMaterial({
          color: flowerColors[Math.floor(Math.random() * flowerColors.length)],
        });
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.position.set(
          Math.cos((p / 5) * Math.PI * 2) * 0.08,
          0,
          Math.sin((p / 5) * Math.PI * 2) * 0.08,
        );
        flower.add(petal);
      }
      const centerGeo = new THREE.SphereGeometry(0.06);
      const centerMat = new THREE.MeshPhongMaterial({ color: 0xffff00 });
      const center = new THREE.Mesh(centerGeo, centerMat);
      flower.add(center);

      const stemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.3);
      const stemMat = new THREE.MeshPhongMaterial({ color: 0x228b22 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = -0.15;
      flower.add(stem);

      flower.position.set(
        Math.cos(angle) * dist,
        0.25,
        Math.sin(angle) * dist,
      );
      group.add(flower);
    }

    const treeCount = 3 + Math.floor(Math.random() * 4);
    const leafColors = [0x228b22, 0x2e8b57, 0x3cb371, 0x2e8b2e, 0x1a6b1a];
    for (let i = 0; i < treeCount; i++) {
      const tree = new THREE.Group();
      const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.5 + Math.random() * 0.8);
      const trunkMat = new THREE.MeshPhongMaterial({ color: 0x5c3a1e });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.75 + Math.random() * 0.4;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      tree.add(trunk);

      const leafColor = leafColors[Math.floor(Math.random() * leafColors.length)];
      const levels = 2 + Math.floor(Math.random() * 2);
      for (let l = 0; l < levels; l++) {
        const leafGeo = new THREE.SphereGeometry(0.9 - l * 0.15, 8, 6);
        const leafMat = new THREE.MeshPhongMaterial({ color: leafColor });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.y = 1.5 + l * 0.7 + Math.random() * 0.3;
        leaf.scale.set(1 - l * 0.15, 1 - l * 0.1, 1 - l * 0.15);
        leaf.castShadow = true;
        leaf.receiveShadow = true;
        tree.add(leaf);
      }

      const angle = (i / treeCount) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 1 + Math.random() * (groundRadius - 2);
      tree.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      tree.rotation.y = Math.random() * Math.PI;
      group.add(tree);
    }

    const benchGeo = new THREE.BoxGeometry(1.2, 0.15, 0.4);
    const benchMat = new THREE.MeshPhongMaterial({ color: 0x8b6914 });
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.set(1.5, 0.4, 0);
    bench.castShadow = true;
    bench.receiveShadow = true;
    group.add(bench);

    const benchLegGeo = new THREE.BoxGeometry(0.08, 0.3, 0.35);
    const benchLegMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
    const leg1 = new THREE.Mesh(benchLegGeo, benchLegMat);
    leg1.position.set(1.5 - 0.5, 0.15, 0);
    leg1.castShadow = true;
    group.add(leg1);
    const leg2 = new THREE.Mesh(benchLegGeo, benchLegMat);
    leg2.position.set(1.5 + 0.5, 0.15, 0);
    leg2.castShadow = true;
    group.add(leg2);

    group.userData.buildingType = 'park';
    return group;
  }

  private createStreetlight(): THREE.Group {
    const group = new THREE.Group();

    const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.2);
    const poleMat = new THREE.MeshPhongMaterial({ color: 0x2f2f2f, shininess: 100 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2.1;
    pole.castShadow = true;
    pole.receiveShadow = true;
    group.add(pole);

    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2);
    const armMat = new THREE.MeshPhongMaterial({ color: 0x2f2f2f, shininess: 100 });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(0.6, 4.1, 0);
    arm.rotation.z = Math.PI / 2;
    arm.castShadow = true;
    group.add(arm);

    const connectorGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.2);
    const connectorMat = new THREE.MeshPhongMaterial({ color: 0x2f2f2f });
    const connector = new THREE.Mesh(connectorGeo, connectorMat);
    connector.position.set(1.2, 3.9, 0);
    connector.castShadow = true;
    group.add(connector);

    const shadeGeo = new THREE.ConeGeometry(0.35, 0.2, 16, 1, true);
    const shadeMat = new THREE.MeshPhongMaterial({
      color: 0x444444,
      emissive: 0x111100,
      emissiveIntensity: 0.1,
      side: THREE.DoubleSide,
      shininess: 100,
    });
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.set(1.2, 3.75, 0);
    shade.rotation.x = Math.PI;
    shade.castShadow = true;
    group.add(shade);

    const yellowColors = [0xffffcc, 0xffffb3, 0xfffacd, 0xfff8dc, 0xfff44f];
    const glowColor = yellowColors[Math.floor(Math.random() * yellowColors.length)];

    const bulbGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const bulbMat = new THREE.MeshPhongMaterial({
      color: glowColor,
      emissive: glowColor,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.95,
    });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(1.2, 3.6, 0);
    group.add(bulb);

    const glowGeo = new THREE.SphereGeometry(0.28, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.25,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(1.2, 3.6, 0);
    group.add(glow);

    const baseGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.25);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.125;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const accentGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.05);
    const accentMat = new THREE.MeshPhongMaterial({ color: 0x8b6914 });
    const accent = new THREE.Mesh(accentGeo, accentMat);
    accent.position.y = 0.25;
    accent.castShadow = true;
    group.add(accent);

    const pointLight = new THREE.PointLight(glowColor, 0.8, 12);
    pointLight.position.set(1.2, 3.6, 0);
    pointLight.castShadow = true;
    group.add(pointLight);

    group.userData.buildingType = 'streetlight';
    return group;
  }

  private addShadowsToGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  createBuildingModel(type: BuildingType): THREE.Group {
    let group: THREE.Group;
    switch (type) {
      case 'residential':
        group = this.createResidentialBuilding();
        break;
      case 'commercial':
        group = this.createCommercialBuilding();
        break;
      case 'park':
        group = this.createPark();
        break;
      case 'streetlight':
        group = this.createStreetlight();
        break;
    }
    this.addShadowsToGroup(group);
    return group;
  }

  placeBuilding(type: BuildingType, position: THREE.Vector3): BuildingData | null {
    const data = addBuilding(type, { x: position.x, y: position.y, z: position.z });
    const model = this.createBuildingModel(type);
    model.position.set(position.x, position.y, position.z);
    model.userData.dataId = data.id;
    this.scene.add(model);
    this.buildingMeshes.set(data.id, model);
    updateBuilding(data.id, { meshId: data.id });

    this.spawnAnimations.push({
      mesh: model,
      startTime: performance.now(),
      duration: 500,
      fromY: position.y - 50,
      toY: position.y,
      isUndo: false,
    });

    return data;
  }

  restoreBuilding(data: BuildingData): THREE.Group | null {
    const model = this.createBuildingModel(data.type);
    model.position.set(data.position.x, data.position.y, data.position.z);
    model.rotation.y = data.rotation;
    model.scale.setScalar(data.scale);
    model.userData.dataId = data.id;
    this.scene.add(model);
    this.buildingMeshes.set(data.id, model);

    this.spawnAnimations.push({
      mesh: model,
      startTime: performance.now(),
      duration: 500,
      fromY: 0,
      toY: data.position.y,
      isUndo: true,
    });

    return model;
  }

  selectBuilding(id: string): boolean {
    const mesh = this.buildingMeshes.get(id);
    if (!mesh) return false;
    this.deselect();
    this.selectedId = id;

    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x + 0.2, size.y + 0.2, size.z + 0.2));
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x00bcd4, transparent: true, opacity: 0.8 });
    this.selectionBox = new THREE.LineSegments(edgesGeo, edgesMat);
    this.selectionBox.position.copy(center);
    this.scene.add(this.selectionBox);
    this.selectionPulseTime = 0;

    emit('buildingSelected', id);
    return true;
  }

  deselect() {
    if (this.selectionBox) {
      this.scene.remove(this.selectionBox);
      this.selectionBox.geometry.dispose();
      (this.selectionBox.material as THREE.Material).dispose();
      this.selectionBox = null;
    }
    const prevId = this.selectedId;
    this.selectedId = null;
    if (prevId) {
      emit('buildingDeselected', prevId);
    }
  }

  deleteSelected() {
    if (!this.selectedId) return;
    const mesh = this.buildingMeshes.get(this.selectedId);
    if (!mesh) return;

    const data = removeBuilding(this.selectedId);
    this.deselect();

    if (data) {
      this.deleteAnimations.push({
        mesh,
        startTime: performance.now(),
        duration: 300,
      });
    }

    emit('buildingDeleted');
    emit('deleteHistoryChanged', getDeleteHistoryCount());
  }

  performUndo() {
    const data = undoDelete();
    if (!data) return;
    this.restoreBuilding(data);
    emit('buildingRestored', data);
    emit('deleteHistoryChanged', getDeleteHistoryCount());
  }

  updateSelectedPosition(pos: { x: number; y: number; z: number }) {
    if (!this.selectedId) return;
    const mesh = this.buildingMeshes.get(this.selectedId);
    if (!mesh) return;
    mesh.position.set(pos.x, pos.y, pos.z);
    updateBuilding(this.selectedId, { position: { ...pos } });
    this.refreshSelectionBox(mesh);
    emit('buildingUpdated', this.selectedId);
  }

  updateSelectedScale(scale: number) {
    if (!this.selectedId) return;
    const clamped = Math.max(0.5, Math.min(2.0, scale));
    const mesh = this.buildingMeshes.get(this.selectedId);
    if (!mesh) return;
    mesh.scale.setScalar(clamped);
    updateBuilding(this.selectedId, { scale: clamped });
    this.refreshSelectionBox(mesh);
    emit('buildingUpdated', this.selectedId);
  }

  updateSelectedRotation(rotation: number) {
    if (!this.selectedId) return;
    const mesh = this.buildingMeshes.get(this.selectedId);
    if (!mesh) return;
    mesh.rotation.y = rotation;
    updateBuilding(this.selectedId, { rotation });
    this.refreshSelectionBox(mesh);
    if (this.angleTooltip) {
      const degrees = Math.round((rotation * 180) / Math.PI) % 360;
      this.angleTooltip.textContent = `${degrees}°`;
      this.angleTooltip.style.display = 'block';
    }
    emit('buildingUpdated', this.selectedId);
  }

  updateSelectedName(name: string) {
    if (!this.selectedId) return;
    updateBuilding(this.selectedId, { name });
    emit('buildingUpdated', this.selectedId);
  }

  private refreshSelectionBox(mesh: THREE.Group) {
    if (!this.selectionBox) return;
    this.scene.remove(this.selectionBox);
    this.selectionBox.geometry.dispose();
    (this.selectionBox.material as THREE.Material).dispose();

    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x + 0.2, size.y + 0.2, size.z + 0.2));
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x00bcd4, transparent: true, opacity: 0.8 });
    this.selectionBox = new THREE.LineSegments(edgesGeo, edgesMat);
    this.selectionBox.position.copy(center);
    this.scene.add(this.selectionBox);
  }

  onMouseDown(event: MouseEvent, mouse: THREE.Vector2) {
    if (this.placementMode) return;

    this.raycaster.setFromCamera(mouse, this.camera);
    const meshes = Array.from(this.buildingMeshes.values());
    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let target: THREE.Object3D | null = intersects[0].object;
      while (target && !target.userData.dataId) {
        target = target.parent;
      }
      if (target && target.userData.dataId) {
        this.selectBuilding(target.userData.dataId);
        this.isDragging = true;
        this.dragStart.copy(mouse);
        this.dragCurrent.copy(mouse);
      }
    } else {
      this.deselect();
    }
  }

  onMouseMove(event: MouseEvent, mouse: THREE.Vector2, shiftKey: boolean) {
    if (!this.isDragging || !this.selectedId) return;
    this.dragCurrent.copy(mouse);

    if (shiftKey) {
      this.isRotating = true;
      const dx = mouse.x - this.dragStart.x;
      const step = Math.PI / 4;
      const steps = Math.round(dx * 8);
      const newRot = steps * step;
      this.updateSelectedRotation(newRot);
    } else {
      this.isRotating = false;
      this.raycaster.setFromCamera(mouse, this.camera);
      const groundIntersects = this.raycaster.intersectObject(this.groundPlane);
      if (groundIntersects.length > 0) {
        const point = groundIntersects[0].point;
        this.updateSelectedPosition({ x: point.x, y: 0, z: point.z });
      }
    }
  }

  onMouseUp() {
    this.isDragging = false;
    this.isRotating = false;
    if (this.angleTooltip) {
      this.angleTooltip.style.display = 'none';
    }
  }

  onWheel(event: WheelEvent) {
    if (!this.selectedId) return;
    const data = getBuilding(this.selectedId);
    if (!data) return;
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.updateSelectedScale(data.scale + delta);
  }

  onGroundClick(mouse: THREE.Vector2) {
    if (!this.placementMode) return;
    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.groundPlane);
    if (intersects.length > 0) {
      this.placeBuilding(this.placementMode, intersects[0].point);
    }
  }

  getMeshById(id: string): THREE.Group | undefined {
    return this.buildingMeshes.get(id);
  }

  updateAnimations(deltaMs: number) {
    const now = performance.now();

    for (let i = this.deleteAnimations.length - 1; i >= 0; i--) {
      const anim = this.deleteAnimations[i];
      const elapsed = now - anim.startTime;
      const t = Math.min(elapsed / anim.duration, 1);
      anim.mesh.scale.setScalar(1 - t);
      (anim.mesh as THREE.Object3D).traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.Material;
          if ('opacity' in mat) {
            mat.transparent = true;
            (mat as THREE.MeshStandardMaterial).opacity = 1 - t;
          }
        }
      });
      if (t >= 1) {
        this.scene.remove(anim.mesh);
        anim.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
        this.deleteAnimations.splice(i, 1);
      }
    }

    for (let i = this.spawnAnimations.length - 1; i >= 0; i--) {
      const anim = this.spawnAnimations[i];
      const elapsed = now - anim.startTime;
      const t = Math.min(elapsed / anim.duration, 1);
      const easeOut = 1 - Math.pow(1 - t, 3);
      anim.mesh.position.y = anim.fromY + (anim.toY - anim.fromY) * easeOut;

      if (anim.isUndo) {
        const scaleT = easeOut;
        anim.mesh.scale.setScalar(scaleT);
      }

      if (t >= 1) {
        anim.mesh.position.y = anim.toY;
        if (anim.isUndo) {
          anim.mesh.scale.setScalar(1);
        }
        this.spawnAnimations.splice(i, 1);
      }
    }

    if (this.selectionBox) {
      this.selectionPulseTime += deltaMs;
      const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((this.selectionPulseTime / 1500) * Math.PI * 2));
      (this.selectionBox.material as THREE.LineBasicMaterial).opacity = pulse;
    }
  }
}
