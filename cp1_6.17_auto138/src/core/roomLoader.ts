import * as THREE from 'three';
import { getSceneManager } from './scene';
import { RoomData, LightData, FurnitureData } from '../api/sceneApi';

export interface LightObject {
  id: string;
  name: string;
  type: string;
  light: THREE.Light;
  mesh: THREE.Mesh | THREE.Group;
  color: string;
  intensity: number;
  temperature: number;
  helper?: THREE.Mesh;
}

class RoomLoader {
  private roomGroup: THREE.Group | null = null;
  private lights: LightObject[] = [];
  private currentRoomId: string = '';

  async loadRoom(roomData: RoomData): Promise<{ group: THREE.Group; lights: LightObject[] }> {
    this.clearRoom();
    this.currentRoomId = roomData.id;

    this.roomGroup = new THREE.Group();
    this.roomGroup.name = 'room';

    this.createWalls(roomData);
    this.createFurniture(roomData.furniture);
    this.createLights(roomData.lights);

    const sceneManager = getSceneManager();
    sceneManager.scene.add(this.roomGroup);

    sceneManager.setCameraPosition(
      roomData.cameraPosition.x,
      roomData.cameraPosition.y,
      roomData.cameraPosition.z,
      new THREE.Vector3(
        roomData.cameraTarget.x,
        roomData.cameraTarget.y,
        roomData.cameraTarget.z
      )
    );

    return {
      group: this.roomGroup,
      lights: this.lights
    };
  }

  private createWalls(roomData: RoomData): void {
    if (!this.roomGroup) return;

    const { width, height, depth } = roomData.dimensions;
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    const floorGeometry = new THREE.PlaneGeometry(width, depth);
    const floor = new THREE.Mesh(floorGeometry, wallMaterial.clone());
    floor.material.color.setHex(0xd4c4a8);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'floor';
    this.roomGroup.add(floor);

    const ceilingGeometry = new THREE.PlaneGeometry(width, depth);
    const ceiling = new THREE.Mesh(ceilingGeometry, wallMaterial.clone());
    ceiling.material.color.setHex(0xf5f5f5);
    ceiling.position.y = height;
    ceiling.rotation.x = Math.PI / 2;
    ceiling.receiveShadow = true;
    ceiling.name = 'ceiling';
    this.roomGroup.add(ceiling);

    const backWallGeometry = new THREE.PlaneGeometry(width, height);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial.clone());
    backWall.material.color.setHex(0xf0f0f0);
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.receiveShadow = true;
    backWall.name = 'backWall';
    this.roomGroup.add(backWall);

    const frontWallGeometry = new THREE.PlaneGeometry(width, height);
    const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial.clone());
    frontWall.material.color.setHex(0xf0f0f0);
    frontWall.position.set(0, height / 2, depth / 2);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    frontWall.name = 'frontWall';
    this.roomGroup.add(frontWall);

    const leftWallGeometry = new THREE.PlaneGeometry(depth, height);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial.clone());
    leftWall.material.color.setHex(0xe8e8e8);
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    leftWall.name = 'leftWall';
    this.roomGroup.add(leftWall);

    const rightWallGeometry = new THREE.PlaneGeometry(depth, height);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial.clone());
    rightWall.material.color.setHex(0xe8e8e8);
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    rightWall.name = 'rightWall';
    this.roomGroup.add(rightWall);
  }

  private createFurniture(furniture: FurnitureData[]): void {
    if (!this.roomGroup) return;

    furniture.forEach(item => {
      const mesh = this.createFurnitureMesh(item);
      if (mesh) {
        this.roomGroup!.add(mesh);
      }
    });
  }

  private createFurnitureMesh(item: FurnitureData): THREE.Mesh | null {
    let geometry: THREE.BufferGeometry | null = null;
    let color = 0x8b7355;

    switch (item.type) {
      case 'sofa':
        geometry = new THREE.BoxGeometry(
          item.dimensions.width,
          item.dimensions.height,
          item.dimensions.depth
        );
        color = 0x6b5b50;
        break;
      case 'coffeeTable':
        geometry = new THREE.BoxGeometry(
          item.dimensions.width,
          item.dimensions.height,
          item.dimensions.depth
        );
        color = 0x5d4037;
        break;
      case 'tvCabinet':
        geometry = new THREE.BoxGeometry(
          item.dimensions.width,
          item.dimensions.height,
          item.dimensions.depth
        );
        color = 0x3e2723;
        break;
      case 'bed':
        geometry = new THREE.BoxGeometry(
          item.dimensions.width,
          item.dimensions.height,
          item.dimensions.depth
        );
        color = 0xd7ccc8;
        break;
      case 'nightstand':
        geometry = new THREE.BoxGeometry(
          item.dimensions.width,
          item.dimensions.height,
          item.dimensions.depth
        );
        color = 0x5d4037;
        break;
      case 'wardrobe':
        geometry = new THREE.BoxGeometry(
          item.dimensions.width,
          item.dimensions.height,
          item.dimensions.depth
        );
        color = 0x8d6e63;
        break;
      case 'desk':
        geometry = new THREE.BoxGeometry(
          item.dimensions.width,
          item.dimensions.height,
          item.dimensions.depth
        );
        color = 0x6d4c41;
        break;
      case 'bookshelf':
        geometry = new THREE.BoxGeometry(
          item.dimensions.width,
          item.dimensions.height,
          item.dimensions.depth
        );
        color = 0x4e342e;
        break;
      case 'officeChair':
        geometry = new THREE.CylinderGeometry(
          item.dimensions.width / 2,
          item.dimensions.width / 2,
          item.dimensions.height,
          16
        );
        color = 0x37474f;
        break;
      default:
        geometry = new THREE.BoxGeometry(
          item.dimensions.width,
          item.dimensions.height,
          item.dimensions.depth
        );
    }

    if (!geometry) return null;

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      item.position.x,
      item.position.y + item.dimensions.height / 2,
      item.position.z
    );
    mesh.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = item.type;

    return mesh;
  }

  private createLights(lightsData: LightData[]): void {
    if (!this.roomGroup) return;

    this.lights = [];

    lightsData.forEach(lightData => {
      const lightObject = this.createLight(lightData);
      if (lightObject) {
        this.lights.push(lightObject);
      }
    });
  }

  private createLight(lightData: LightData): LightObject | null {
    if (!this.roomGroup) return null;

    let light: THREE.Light | null = null;
    let mesh: THREE.Mesh | THREE.Group | null = null;

    const color = new THREE.Color(lightData.color);

    switch (lightData.type) {
      case 'chandelier':
        light = new THREE.PointLight(color, lightData.intensity, lightData.range || 10);
        light.castShadow = lightData.castShadow;
        light.position.set(lightData.position.x, lightData.position.y, lightData.position.z);
        mesh = this.createChandelierMesh(lightData);
        break;

      case 'tablelamp':
        light = new THREE.PointLight(color, lightData.intensity, lightData.range || 5);
        light.castShadow = lightData.castShadow;
        light.position.set(lightData.position.x, lightData.position.y, lightData.position.z);
        mesh = this.createTableLampMesh(lightData);
        break;

      case 'spotlight':
        light = new THREE.SpotLight(color, lightData.intensity);
        light.angle = (lightData.angle || 30) * Math.PI / 180;
        light.penumbra = lightData.penumbra || 0.3;
        light.castShadow = lightData.castShadow;
        light.position.set(lightData.position.x, lightData.position.y, lightData.position.z);
        if (lightData.target) {
          (light as THREE.SpotLight).target.position.set(
            lightData.target.x,
            lightData.target.y,
            lightData.target.z
          );
          this.roomGroup.add((light as THREE.SpotLight).target);
        }
        mesh = this.createSpotlightMesh(lightData);
        break;

      case 'ledstrip':
        light = new THREE.PointLight(color, lightData.intensity, 3);
        light.position.set(lightData.position.x, lightData.position.y, lightData.position.z);
        mesh = this.createLEDStripMesh(lightData);
        break;

      case 'floorlamp':
        light = new THREE.PointLight(color, lightData.intensity, lightData.range || 5);
        light.castShadow = lightData.castShadow;
        light.position.set(lightData.position.x, lightData.position.y + 1.5, lightData.position.z);
        mesh = this.createFloorLampMesh(lightData);
        break;

      default:
        return null;
    }

    if (!light || !mesh) return null;

    light.userData = { lightId: lightData.id, lightType: lightData.type };
    mesh.userData = { lightId: lightData.id, lightType: lightData.type, isSelectable: true };

    this.roomGroup.add(light);
    this.roomGroup.add(mesh);

    const helper = this.createSelectionHelper(mesh);
    helper.visible = false;
    this.roomGroup.add(helper);

    return {
      id: lightData.id,
      name: lightData.name,
      type: lightData.type,
      light,
      mesh,
      color: lightData.color,
      intensity: lightData.intensity,
      temperature: lightData.temperature,
      helper
    };
  }

  private createSelectionHelper(mesh: THREE.Mesh | THREE.Group): THREE.Mesh {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxSize = Math.max(size.x, size.y, size.z);

    const helperGeometry = new THREE.RingGeometry(maxSize * 0.6, maxSize * 0.8, 32);
    const helperMaterial = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });

    const helper = new THREE.Mesh(helperGeometry, helperMaterial);
    helper.rotation.x = -Math.PI / 2;
    helper.position.copy(mesh.position);
    helper.position.y = box.min.y + 0.01;
    helper.name = 'selectionHelper';

    return helper;
  }

  private createChandelierMesh(lightData: LightData): THREE.Group {
    const group = new THREE.Group();

    const stemGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.3 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = -0.15;
    group.add(stem);

    const shadeGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const shadeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(lightData.color),
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9
    });
    const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
    shade.position.y = -0.35;
    group.add(shade);

    group.position.set(lightData.position.x, lightData.position.y, lightData.position.z);
    group.name = `light-${lightData.id}`;

    return group;
  }

  private createTableLampMesh(lightData: LightData): THREE.Group {
    const group = new THREE.Group();

    const baseGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.05, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.7 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -lightData.position.y + 0.025;
    group.add(base);

    const poleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.6 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = -lightData.position.y + 0.2;
    group.add(pole);

    const shadeGeometry = new THREE.ConeGeometry(0.15, 0.2, 16, 1, true);
    const shadeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5e6c8,
      emissive: new THREE.Color(lightData.color),
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
    shade.position.y = -lightData.position.y + 0.4;
    group.add(shade);

    group.position.set(lightData.position.x, lightData.position.y, lightData.position.z);
    group.name = `light-${lightData.id}`;

    return group;
  }

  private createSpotlightMesh(lightData: LightData): THREE.Group {
    const group = new THREE.Group();

    const housingGeometry = new THREE.CylinderGeometry(0.06, 0.04, 0.1, 16);
    const housingMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 });
    const housing = new THREE.Mesh(housingGeometry, housingMaterial);
    housing.position.y = -0.05;
    group.add(housing);

    const lensGeometry = new THREE.CircleGeometry(0.04, 16);
    const lensMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(lightData.color),
      emissiveIntensity: 0.5
    });
    const lens = new THREE.Mesh(lensGeometry, lensMaterial);
    lens.position.y = -0.1;
    lens.rotation.x = -Math.PI / 2;
    group.add(lens);

    group.position.set(lightData.position.x, lightData.position.y, lightData.position.z);
    group.name = `light-${lightData.id}`;

    return group;
  }

  private createLEDStripMesh(lightData: LightData): THREE.Group {
    const group = new THREE.Group();

    if (lightData.path && lightData.path.length > 1) {
      const points = lightData.path.map(p => new THREE.Vector3(p.x, p.y, p.z));
      
      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        const distance = start.distanceTo(end);
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

        const stripGeometry = new THREE.BoxGeometry(0.05, 0.02, distance);
        const stripMaterial = new THREE.MeshStandardMaterial({
          color: 0x333333,
          emissive: new THREE.Color(lightData.color),
          emissiveIntensity: 0.3
        });
        const strip = new THREE.Mesh(stripGeometry, stripMaterial);
        strip.position.copy(midpoint);
        strip.lookAt(end);
        strip.rotateX(Math.PI / 2);
        group.add(strip);
      }
    }

    group.name = `light-${lightData.id}`;
    return group;
  }

  private createFloorLampMesh(lightData: LightData): THREE.Group {
    const group = new THREE.Group();

    const baseGeometry = new THREE.CylinderGeometry(0.15, 0.18, 0.05, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x2d2d2d, roughness: 0.6 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.025;
    group.add(base);

    const poleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.4 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 0.75;
    group.add(pole);

    const shadeGeometry = new THREE.CylinderGeometry(0.12, 0.2, 0.25, 16, 1, true);
    const shadeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5e6c8,
      emissive: new THREE.Color(lightData.color),
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
    shade.position.y = 1.5;
    group.add(shade);

    group.position.set(lightData.position.x, lightData.position.y, lightData.position.z);
    group.name = `light-${lightData.id}`;

    return group;
  }

  public clearRoom(): void {
    const sceneManager = getSceneManager();
    
    if (this.roomGroup) {
      sceneManager.scene.remove(this.roomGroup);
      this.roomGroup.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      this.roomGroup = null;
    }
    
    this.lights = [];
    this.currentRoomId = '';
  }

  public getLights(): LightObject[] {
    return this.lights;
  }

  public getLightById(id: string): LightObject | undefined {
    return this.lights.find(l => l.id === id);
  }

  public getCurrentRoomId(): string {
    return this.currentRoomId;
  }
}

const roomLoader = new RoomLoader();
export default roomLoader;
export { RoomLoader };
