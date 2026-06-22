import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

export interface LoadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export class ModelLoader {
  private loader: GLTFLoader;
  private onProgressCallback: ((progress: LoadProgress) => void) | null = null;

  constructor() {
    this.loader = new GLTFLoader();
  }

  onProgress(callback: (progress: LoadProgress) => void): void {
    this.onProgressCallback = callback;
  }

  async loadFromFile(file: File): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable && this.onProgressCallback) {
          const percent = Math.round((event.loaded / event.total) * 100);
          this.onProgressCallback({
            loaded: event.loaded,
            total: event.total,
            percent,
          });
        }
      };

      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          reject(new Error('Failed to read file'));
          return;
        }

        this.loader.parse(
          arrayBuffer,
          '',
          (gltf) => {
            if (this.onProgressCallback) {
              this.onProgressCallback({ loaded: 100, total: 100, percent: 100 });
            }
            const scene = this.processModel(gltf.scene);
            resolve(scene);
          },
          (error) => {
            reject(error);
          }
        );
      };

      reader.onerror = () => {
        reject(new Error('File reading error'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private processModel(scene: THREE.Group): THREE.Group {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return scene;
  }

  centerAndScaleModel(
    model: THREE.Group,
    camera: THREE.PerspectiveCamera,
    targetViewportHeightRatio: number = 0.8
  ): { center: THREE.Vector3; scale: number; boundingBox: THREE.Box3 } {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    model.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera.fov * Math.PI) / 180;
    const distance = camera.position.length();
    const visibleHeight = 2 * Math.tan(fov / 2) * distance;
    const targetHeight = visibleHeight * targetViewportHeightRatio;
    const scale = targetHeight / maxDim;

    model.scale.setScalar(scale);

    const newBox = new THREE.Box3().setFromObject(model);
    const newCenter = newBox.getCenter(new THREE.Vector3());
    model.position.sub(newCenter);

    return {
      center: new THREE.Vector3(0, 0, 0),
      scale,
      boundingBox: newBox,
    };
  }

  getModelInfo(model: THREE.Group): {
    vertexCount: number;
    meshCount: number;
    triangleCount: number;
    boundingBox: THREE.Box3;
  } {
    let vertexCount = 0;
    let meshCount = 0;
    let triangleCount = 0;

    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshCount++;
        const geometry = child.geometry;
        if (geometry.index) {
          triangleCount += geometry.index.count / 3;
        } else if (geometry.attributes.position) {
          triangleCount += geometry.attributes.position.count / 3;
        }
        if (geometry.attributes.position) {
          vertexCount += geometry.attributes.position.count;
        }
      }
    });

    const boundingBox = new THREE.Box3().setFromObject(model);

    return {
      vertexCount: Math.round(vertexCount),
      meshCount,
      triangleCount: Math.round(triangleCount),
      boundingBox,
    };
  }
}
