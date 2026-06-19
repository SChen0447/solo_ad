import * as THREE from 'three';

export class GridHelper {
  private gridHelper: THREE.GridHelper;
  private axesHelper: THREE.AxesHelper;
  private centerMarker: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.gridHelper = new THREE.GridHelper(80, 20, 0x444444, 0x333333);
    this.gridHelper.position.y = 0.01;
    scene.add(this.gridHelper);

    this.axesHelper = new THREE.AxesHelper(5);
    this.axesHelper.position.set(-40, 0.02, -40);
    scene.add(this.axesHelper);

    const centerGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const centerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.centerMarker = new THREE.Mesh(centerGeometry, centerMaterial);
    this.centerMarker.position.set(0, 0.2, 0);
    scene.add(this.centerMarker);
  }

  public setVisible(visible: boolean): void {
    this.gridHelper.visible = visible;
    this.axesHelper.visible = visible;
    this.centerMarker.visible = visible;
  }

  public dispose(): void {
    this.gridHelper.dispose();
    this.axesHelper.dispose();
    (this.centerMarker.material as THREE.Material).dispose();
    this.centerMarker.geometry.dispose();
  }
}

export default GridHelper;
