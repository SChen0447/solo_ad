import * as THREE from 'three';
import { Plant, PlantSpecies } from './PlantModel';

export class PlantManager {
  private scene: THREE.Scene;
  private plants: Plant[] = [];
  private selectedSpecies: PlantSpecies = 'pothos';
  private selectedPlant: Plant | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private groundMesh: THREE.Mesh | null = null;
  private windowPosition: THREE.Vector3;
  private ghostCircle: THREE.Mesh | null = null;
  private isPlacingMode: boolean = true;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.windowPosition = new THREE.Vector3(-5, 3, 0);
  }

  public setGround(mesh: THREE.Mesh): void {
    this.groundMesh = mesh;
  }

  public setWindowPosition(pos: THREE.Vector3): void {
    this.windowPosition.copy(pos);
  }

  public setSelectedSpecies(species: PlantSpecies): void {
    this.selectedSpecies = species;
    this.isPlacingMode = true;
    this.selectedPlant = null;
  }

  public getSelectedSpecies(): PlantSpecies {
    return this.selectedSpecies;
  }

  public getSelectedPlant(): Plant | null {
    return this.selectedPlant;
  }

  public getPlants(): Plant[] {
    return this.plants;
  }

  public getGhostCircle(): THREE.Mesh | null {
    return this.ghostCircle;
  }

  public createGhostCircle(): void {
    if (this.ghostCircle) return;
    const geometry = new THREE.CircleGeometry(0.3, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4CAF50,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    this.ghostCircle = new THREE.Mesh(geometry, material);
    this.ghostCircle.rotation.x = -Math.PI / 2;
    this.ghostCircle.position.y = 0.01;
    this.ghostCircle.visible = false;
    this.scene.add(this.ghostCircle);
  }

  public updateGhostPosition(clientX: number, clientY: number, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement): boolean {
    if (!this.groundMesh || !this.ghostCircle || !this.isPlacingMode) return false;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const intersects = this.raycaster.intersectObject(this.groundMesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.ghostCircle.position.x = point.x;
      this.ghostCircle.position.z = point.z;
      this.ghostCircle.visible = true;
      return true;
    }

    this.ghostCircle.visible = false;
    return false;
  }

  public placePlant(clientX: number, clientY: number, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement): Plant | null {
    if (!this.groundMesh || !this.isPlacingMode) return null;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const intersects = this.raycaster.intersectObject(this.groundMesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const position = new THREE.Vector3(point.x, 0, point.z);
      const plant = new Plant(this.selectedSpecies, position);
      this.plants.push(plant);
      this.scene.add(plant.group);
      
      this.selectedPlant = plant;
      return plant;
    }

    return null;
  }

  public selectPlant(clientX: number, clientY: number, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement): Plant | null {
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    
    const plantMeshes: THREE.Object3D[] = [];
    this.plants.forEach((plant) => {
      plantMeshes.push(plant.group);
    });

    const intersects = this.raycaster.intersectObjects(plantMeshes, true);

    if (intersects.length > 0) {
      let intersectedPlant: Plant | null = null;
      for (const plant of this.plants) {
        if (intersects[0].object === plant.group || plant.group.children.includes(intersects[0].object as THREE.Mesh) || this.isDescendant(plant.group, intersects[0].object)) {
          intersectedPlant = plant;
          break;
        }
      }
      if (intersectedPlant) {
        this.selectedPlant = intersectedPlant;
        this.isPlacingMode = false;
        return intersectedPlant;
      }
    }

    return null;
  }

  private isDescendant(parent: THREE.Object3D, child: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = child;
    while (current) {
      if (current === parent) return true;
      current = current.parent;
    }
    return false;
  }

  public calculateLightAtPosition(position: THREE.Vector3, globalLightIntensity: number): number {
    const windowPos = this.windowPosition;
    const distance = position.distanceTo(windowPos);
    const maxDistance = 15;
    const distanceFactor = Math.max(0, 1 - distance / maxDistance);

    const directionToWindow = new THREE.Vector3().subVectors(windowPos, position).normalize();
    const normal = new THREE.Vector3(-1, 0, 0);
    const angleFactor = Math.max(0, directionToWindow.dot(normal));

    const ambientFactor = 0.2;
    const directFactor = 0.8 * distanceFactor * (0.5 + angleFactor * 0.5);

    const rawLux = (ambientFactor + directFactor) * globalLightIntensity * 4;
    return Math.max(5, Math.min(500, rawLux));
  }

  public updateAllPlants(globalLightIntensity: number, deltaTime: number, time: number): void {
    for (const plant of this.plants) {
      const lightAtPlant = this.calculateLightAtPosition(plant.position, globalLightIntensity);
      plant.updateTargetState(lightAtPlant);
      plant.updateCurrentState(deltaTime);
      plant.applyVisualState(time);
    }
  }

  public deselectPlant(): void {
    this.selectedPlant = null;
    this.isPlacingMode = true;
  }

  public isPlacing(): boolean {
    return this.isPlacingMode;
  }

  public setPlacingMode(placing: boolean): void {
    this.isPlacingMode = placing;
    if (placing) {
      this.selectedPlant = null;
    }
  }
}
