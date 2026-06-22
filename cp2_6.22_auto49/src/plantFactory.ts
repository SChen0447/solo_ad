import * as THREE from 'three';
import { PlantData, Season, PlantCategory } from './plantLibrary';

function makeColor(rgba: [number, number, number, number]): THREE.Color {
  return new THREE.Color(rgba[0], rgba[1], rgba[2]);
}

function createTreeGeometry(data: PlantData, season: Season): THREE.Group {
  const group = new THREE.Group();
  const s = data.seasons[season];
  const height = (data.heightRange[0] + data.heightRange[1]) / 2 * s.heightScale;
  const crownR = (data.crownRange[0] + data.crownRange[1]) / 2 * s.foliageScale;
  const color = makeColor(s.color);

  const trunkH = height * 0.45;
  const trunkR = Math.max(0.08, crownR * 0.1);
  const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 8);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  group.add(trunk);

  if (s.foliageScale > 0.05) {
    const isPine = data.id === 'pine';
    if (isPine) {
      for (let i = 0; i < 3; i++) {
        const coneH = crownR * (1.2 - i * 0.25);
        const coneR = crownR * (0.8 - i * 0.15);
        const coneGeo = new THREE.ConeGeometry(coneR, coneH, 8);
        const coneMat = new THREE.MeshLambertMaterial({ color });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.y = trunkH + i * crownR * 0.5 + coneH * 0.3;
        cone.castShadow = true;
        group.add(cone);
      }
    } else {
      const sphereGeo = new THREE.SphereGeometry(crownR, 12, 10);
      const sphereMat = new THREE.MeshLambertMaterial({ color });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.y = trunkH + crownR * 0.6;
      sphere.castShadow = true;
      group.add(sphere);

      if (s.foliageScale > 0.7) {
        for (let i = 0; i < 3; i++) {
          const subR = crownR * 0.55;
          const subGeo = new THREE.SphereGeometry(subR, 8, 6);
          const sub = new THREE.Mesh(subGeo, sphereMat.clone());
          const angle = (i / 3) * Math.PI * 2;
          sub.position.set(
            Math.cos(angle) * crownR * 0.5,
            trunkH + crownR * 0.3,
            Math.sin(angle) * crownR * 0.5
          );
          sub.castShadow = true;
          group.add(sub);
        }
      }
    }
  }

  return group;
}

function createShrubGeometry(data: PlantData, season: Season): THREE.Group {
  const group = new THREE.Group();
  const s = data.seasons[season];
  const height = (data.heightRange[0] + data.heightRange[1]) / 2 * s.heightScale;
  const crownR = (data.crownRange[0] + data.crownRange[1]) / 2 * s.foliageScale;
  const color = makeColor(s.color);

  if (s.foliageScale > 0.05) {
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.05, height * 0.3, 6);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = height * 0.15;
    group.add(stem);

    const mainGeo = new THREE.SphereGeometry(crownR, 10, 8);
    const mainMat = new THREE.MeshLambertMaterial({ color });
    const mainMesh = new THREE.Mesh(mainGeo, mainMat);
    mainMesh.position.y = height * 0.5 + crownR * 0.3;
    mainMesh.scale.y = 0.7;
    mainMesh.castShadow = true;
    group.add(mainMesh);

    for (let i = 0; i < 4; i++) {
      const subR = crownR * 0.5;
      const subGeo = new THREE.SphereGeometry(subR, 8, 6);
      const sub = new THREE.Mesh(subGeo, mainMat.clone());
      const angle = (i / 4) * Math.PI * 2 + 0.4;
      sub.position.set(
        Math.cos(angle) * crownR * 0.55,
        height * 0.4 + crownR * 0.15,
        Math.sin(angle) * crownR * 0.55
      );
      sub.scale.y = 0.65;
      sub.castShadow = true;
      group.add(sub);
    }
  } else {
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.04, height * 0.5, 6);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = height * 0.25;
    group.add(stem);
  }

  return group;
}

function createFlowerGeometry(data: PlantData, season: Season): THREE.Group {
  const group = new THREE.Group();
  const s = data.seasons[season];
  const height = (data.heightRange[0] + data.heightRange[1]) / 2 * s.heightScale;
  const crownR = (data.crownRange[0] + data.crownRange[1]) / 2 * s.foliageScale;
  const color = makeColor(s.color);

  const stemGeo = new THREE.CylinderGeometry(0.015, 0.025, height, 6);
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x2E7D32 });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = height / 2;
  group.add(stem);

  for (let i = 0; i < 2; i++) {
    const leafGeo = new THREE.SphereGeometry(0.06, 6, 4);
    leafGeo.scale(1, 0.3, 1);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x388E3C });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    const ly = height * (0.3 + i * 0.15);
    const side = i === 0 ? 1 : -1;
    leaf.position.set(side * 0.06, ly, 0);
    leaf.rotation.z = side * -0.4;
    group.add(leaf);
  }

  if (s.foliageScale > 0.2) {
    const petalCount = 6;
    const petalGeo = new THREE.SphereGeometry(crownR * 0.6, 6, 4);
    petalGeo.scale(1, 0.4, 1);
    const petalMat = new THREE.MeshLambertMaterial({ color });

    const flowerCenter = new THREE.Group();
    for (let i = 0; i < petalCount; i++) {
      const petal = new THREE.Mesh(petalGeo, petalMat);
      const angle = (i / petalCount) * Math.PI * 2;
      petal.position.set(
        Math.cos(angle) * crownR * 0.4,
        0,
        Math.sin(angle) * crownR * 0.4
      );
      petal.rotation.z = (Math.cos(angle)) * 0.3;
      petal.rotation.x = (Math.sin(angle)) * 0.3;
      flowerCenter.add(petal);
    }

    const centerGeo = new THREE.SphereGeometry(crownR * 0.3, 6, 6);
    const centerMat = new THREE.MeshLambertMaterial({ color: 0xFDD835 });
    const center = new THREE.Mesh(centerGeo, centerMat);
    flowerCenter.add(center);

    flowerCenter.position.y = height + crownR * 0.2;
    group.add(flowerCenter);
  }

  return group;
}

export function createPlant(data: PlantData, season: Season): THREE.Group {
  let group: THREE.Group;

  switch (data.category) {
    case 'tree':
      group = createTreeGeometry(data, season);
      break;
    case 'shrub':
      group = createShrubGeometry(data, season);
      break;
    case 'flower':
      group = createFlowerGeometry(data, season);
      break;
    default:
      group = new THREE.Group();
  }

  group.userData = {
    plantId: data.id,
    plantData: data,
    currentSeason: season,
  };

  return group;
}

export function updatePlantSeason(plantGroup: THREE.Group, season: Season): void {
  const data = plantGroup.userData.plantData as PlantData;
  const s = data.seasons[season];
  const color = makeColor(s.color);

  plantGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
      const isTrunkOrStem =
        child.material.color.getHex() === 0x5D4037 ||
        child.material.color.getHex() === 0x2E7D32 ||
        child.material.color.getHex() === 0x388E3C ||
        child.material.color.getHex() === 0xFDD835;
      if (!isTrunkOrStem) {
        child.material.color.copy(color);
      }
    }
  });

  const height = (data.heightRange[0] + data.heightRange[1]) / 2 * s.heightScale;
  const crownR = (data.crownRange[0] + data.crownRange[1]) / 2 * s.foliageScale;

  plantGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry.type === 'SphereGeometry' || child.geometry.type === 'ConeGeometry') {
        const origScale = child.scale.clone();
        const targetScale = s.foliageScale > 0.05 ? s.foliageScale : 0.05;
        child.scale.set(
          origScale.x > 0 ? targetScale : origScale.x,
          origScale.y > 0 ? targetScale * (child.geometry.type === 'SphereGeometry' ? 0.7 : 1) : origScale.y,
          origScale.z > 0 ? targetScale : origScale.z
        );
      }
    }
  });

  plantGroup.userData.currentSeason = season;
}

export function animateSeasonTransition(
  plantGroup: THREE.Group,
  fromSeason: Season,
  toSeason: Season,
  duration: number = 2000
): { update: (t: number) => void; isComplete: (t: number) => boolean } {
  const data = plantGroup.userData.plantData as PlantData;
  const fromColor = makeColor(data.seasons[fromSeason].color);
  const toColor = makeColor(data.seasons[toSeason].color);

  const fromScale = data.seasons[fromSeason].foliageScale;
  const toScale = data.seasons[toSeason].foliageScale;
  const fromHeight = data.seasons[fromSeason].heightScale;
  const toHeight = data.seasons[toSeason].heightScale;

  const startTime = performance.now();

  const foliageMeshes: THREE.Mesh[] = [];
  const trunkColors = [0x5D4037, 0x2E7D32, 0x388E3C, 0xFDD835];

  plantGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
      if (!trunkColors.includes(child.material.color.getHex())) {
        foliageMeshes.push(child);
      }
    }
  });

  function easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  return {
    update(now: number) {
      const elapsed = now - startTime;
      const raw = Math.min(elapsed / duration, 1);
      const t = easeInOut(raw);

      const currentColor = fromColor.clone().lerp(toColor, t);
      foliageMeshes.forEach((mesh) => {
        if (mesh.material instanceof THREE.MeshLambertMaterial) {
          mesh.material.color.copy(currentColor);
        }
      });

      const currentScale = fromScale + (toScale - fromScale) * t;
      foliageMeshes.forEach((mesh) => {
        if (mesh.geometry.type === 'SphereGeometry' || mesh.geometry.type === 'ConeGeometry') {
          mesh.scale.setScalar(Math.max(0.05, currentScale));
        }
      });

      const currentHeightScale = fromHeight + (toHeight - fromHeight) * t;
      plantGroup.scale.y = currentHeightScale;
    },
    isComplete(now: number) {
      return now - startTime >= duration;
    },
  };
}

export function getPlantColorHex(data: PlantData, season: Season): string {
  const c = data.seasons[season].color;
  const r = Math.round(c[0] * 255);
  const g = Math.round(c[1] * 255);
  const b = Math.round(c[2] * 255);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function createGroundShadow(crownRange: [number, number]): THREE.Mesh {
  const radius = (crownRange[0] + crownRange[1]) / 2;
  const geo = new THREE.CircleGeometry(radius, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.01;
  return mesh;
}

export function createSelectionRing(crownRange: [number, number]): THREE.Mesh {
  const radius = (crownRange[0] + crownRange[1]) / 2 + 0.1;
  const geo = new THREE.TorusGeometry(radius, 0.03, 8, 32);
  const mat = new THREE.MeshBasicMaterial({ color: 0x60A5FA, transparent: true, opacity: 0.8 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = 0.1;
  return mesh;
}

export function createSnowPlane(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(50, 50);
  const mat = new THREE.MeshLambertMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.4,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  mesh.name = 'snowPlane';
  return mesh;
}

export function createFallingLeavesParticle(): THREE.Points {
  const count = 60;
  const positions = new Float32Array(count * 3);
  const velocities: THREE.Vector3[] = [];

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = Math.random() * 8 + 1;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    velocities.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        -Math.random() * 0.02 - 0.01,
        (Math.random() - 0.5) * 0.02
      )
    );
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xE65100,
    size: 0.15,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  points.name = 'fallingLeaves';
  (points as any)._velocities = velocities;
  return points;
}

export function updateFallingLeaves(particles: THREE.Points): void {
  const positions = particles.geometry.attributes.position as THREE.BufferAttribute;
  const velocities = (particles as any)._velocities as THREE.Vector3[];

  for (let i = 0; i < velocities.length; i++) {
    positions.array[i * 3] += velocities[i].x;
    positions.array[i * 3 + 1] += velocities[i].y;
    positions.array[i * 3 + 2] += velocities[i].z;

    velocities[i].x += (Math.random() - 0.5) * 0.002;
    velocities[i].z += (Math.random() - 0.5) * 0.002;

    if (positions.array[i * 3 + 1] < 0) {
      positions.array[i * 3] = (Math.random() - 0.5) * 20;
      positions.array[i * 3 + 1] = Math.random() * 3 + 5;
      positions.array[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
  }

  positions.needsUpdate = true;
}

export function renderPlantThumbnail(data: PlantData, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const s = data.seasons.spring;
  const color = s.color;
  const cssColor = `rgba(${Math.round(color[0] * 255)},${Math.round(color[1] * 255)},${Math.round(color[2] * 255)},${color[3]})`;

  ctx.fillStyle = '#5D4037';
  if (data.category === 'tree') {
    ctx.fillRect(w * 0.45, h * 0.5, w * 0.1, h * 0.35);
    ctx.fillStyle = cssColor;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.38, w * 0.28, 0, Math.PI * 2);
    ctx.fill();
  } else if (data.category === 'shrub') {
    ctx.fillRect(w * 0.45, h * 0.55, w * 0.1, h * 0.2);
    ctx.fillStyle = cssColor;
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.5, w * 0.3, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(w * 0.48, h * 0.45, w * 0.04, h * 0.35);
    ctx.fillStyle = cssColor;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.38, w * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
}
