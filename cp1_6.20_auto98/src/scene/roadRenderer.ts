import * as THREE from 'three';
import type { RoadNetworkData } from '../data/dataProvider';

const NODE_RADIUS = 0.6;
const ROAD_RADIUS = 0.2;
const GRID_SIZE = 5;
const GRID_COLOR = 0x3a4a5a;
const NODE_COLOR = 0x888888;
const ROAD_COLOR = 0xaaaaaa;

export interface RoadRenderResult {
  roadMeshes: Map<number, THREE.Mesh>;
  nodeMeshes: THREE.Mesh[];
  group: THREE.Group;
}

export function renderRoadNetwork(
  scene: THREE.Scene,
  network: RoadNetworkData
): RoadRenderResult {
  const group = new THREE.Group();
  const roadMeshes = new Map<number, THREE.Mesh>();
  const nodeMeshes: THREE.Mesh[] = [];

  const gridHelper = new THREE.GridHelper(100, 100 / GRID_SIZE, GRID_COLOR, GRID_COLOR);
  (gridHelper.material as THREE.Material).opacity = 0.4;
  (gridHelper.material as THREE.Material).transparent = true;
  group.add(gridHelper);

  const nodeGeo = new THREE.SphereGeometry(NODE_RADIUS, 16, 16);
  const nodeMat = new THREE.MeshStandardMaterial({
    color: NODE_COLOR,
    roughness: 0.7,
    metalness: 0.2,
  });

  const nodeMap = new Map<number, THREE.Vector3>();
  for (const node of network.nodes) {
    const mesh = new THREE.Mesh(nodeGeo, nodeMat);
    mesh.position.set(node.x, 0, node.z);
    mesh.userData = { type: 'node', id: node.id };
    group.add(mesh);
    nodeMeshes.push(mesh);
    nodeMap.set(node.id, new THREE.Vector3(node.x, 0, node.z));
  }

  for (const seg of network.segments) {
    const fromPos = nodeMap.get(seg.from);
    const toPos = nodeMap.get(seg.to);
    if (!fromPos || !toPos) continue;

    const direction = new THREE.Vector3().subVectors(toPos, fromPos);
    const length = direction.length();
    direction.normalize();

    const roadGeo = new THREE.CylinderGeometry(ROAD_RADIUS, ROAD_RADIUS, length, 8, 1);
    const roadMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLOR,
      roughness: 0.6,
      metalness: 0.3,
    });

    const mesh = new THREE.Mesh(roadGeo, roadMat);
    const midPoint = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
    mesh.position.copy(midPoint);

    const axis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction);
    mesh.quaternion.copy(quaternion);

    mesh.userData = { type: 'segment', id: seg.id };
    group.add(mesh);
    roadMeshes.set(seg.id, mesh);
  }

  scene.add(group);

  return { roadMeshes, nodeMeshes, group };
}
