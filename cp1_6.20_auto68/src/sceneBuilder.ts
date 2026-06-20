import * as THREE from 'three';

export interface Exhibit {
  mesh: THREE.Object3D;
  name: string;
  author: string;
  description: string;
}

export class SceneBuilder {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  build(): Exhibit[] {
    this.createLighting();
    this.createFloor();
    this.createWalls();
    const exhibits = this.createExhibits();
    return exhibits;
  }

  private createLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffd5a0, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(8, 12, 6);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffd5a0, 0.3);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);
  }

  private createFloor(): void {
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xd0d0d0,
      roughness: 0.3,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'floor';
    this.scene.add(floor);

    const tileSize = 3;
    const tileGeometry = new THREE.PlaneGeometry(tileSize - 0.05, tileSize - 0.05);
    const tileMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 0.25,
      metalness: 0.15
    });

    for (let x = -12; x <= 12; x += tileSize) {
      for (let z = -12; z <= 12; z += tileSize) {
        if (Math.abs(x) < 14 && Math.abs(z) < 14) {
          const tile = new THREE.Mesh(tileGeometry, tileMaterial);
          tile.rotation.x = -Math.PI / 2;
          tile.position.set(x, 0.001, z);
          tile.receiveShadow = true;
          this.scene.add(tile);
        }
      }
    }
  }

  private createWalls(): void {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0e6d3,
      roughness: 0.9,
      metalness: 0
    });

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 8),
      wallMaterial
    );
    backWall.position.set(0, 4, -15);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const frontWallLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 8),
      wallMaterial
    );
    frontWallLeft.position.set(-10, 4, 15);
    frontWallLeft.rotation.y = Math.PI;
    frontWallLeft.receiveShadow = true;
    this.scene.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 8),
      wallMaterial
    );
    frontWallRight.position.set(10, 4, 15);
    frontWallRight.rotation.y = Math.PI;
    frontWallRight.receiveShadow = true;
    this.scene.add(frontWallRight);

    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 8),
      wallMaterial
    );
    leftWall.position.set(-15, 4, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 8),
      wallMaterial
    );
    rightWall.position.set(15, 4, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({
        color: 0xfaf6f0,
        roughness: 0.9,
        metalness: 0
      })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 8;
    this.scene.add(ceiling);

    const baseboardMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8
    });

    const baseboardHeight = 0.3;
    const baseboardDepth = 0.1;

    const backBaseboard = new THREE.Mesh(
      new THREE.BoxGeometry(30, baseboardHeight, baseboardDepth),
      baseboardMaterial
    );
    backBaseboard.position.set(0, baseboardHeight / 2, -14.95);
    this.scene.add(backBaseboard);

    const leftBaseboard = new THREE.Mesh(
      new THREE.BoxGeometry(baseboardDepth, baseboardHeight, 30),
      baseboardMaterial
    );
    leftBaseboard.position.set(-14.95, baseboardHeight / 2, 0);
    this.scene.add(leftBaseboard);

    const rightBaseboard = new THREE.Mesh(
      new THREE.BoxGeometry(baseboardDepth, baseboardHeight, 30),
      baseboardMaterial
    );
    rightBaseboard.position.set(14.95, baseboardHeight / 2, 0);
    this.scene.add(rightBaseboard);
  }

  private createExhibits(): Exhibit[] {
    const exhibits: Exhibit[] = [];

    const sculpture1 = this.createSculpture('思想者', '罗丹', '1880年创作的著名雕塑作品');
    sculpture1.mesh.position.set(-8, 0, -8);
    exhibits.push(sculpture1);

    const sculpture2 = this.createSculpture('大卫', '米开朗基罗', '文艺复兴时期的经典雕塑');
    sculpture2.mesh.position.set(8, 0, -8);
    exhibits.push(sculpture2);

    const painting1 = this.createPainting('星夜', '梵高', '1889年的后印象派杰作');
    painting1.mesh.position.set(-14.5, 3, -5);
    painting1.mesh.rotation.y = Math.PI / 2;
    exhibits.push(painting1);

    const painting2 = this.createPainting('蒙娜丽莎', '达芬奇', '文艺复兴时期最著名的肖像画');
    painting2.mesh.position.set(-14.5, 3, 5);
    painting2.mesh.rotation.y = Math.PI / 2;
    exhibits.push(painting2);

    const painting3 = this.createPainting('日出印象', '莫奈', '印象派运动的开山之作');
    painting3.mesh.position.set(14.5, 3, -5);
    painting3.mesh.rotation.y = -Math.PI / 2;
    exhibits.push(painting3);

    const displayCase = this.createDisplayCase('古董花瓶', '宋代', '宋代官窑青瓷珍品');
    displayCase.mesh.position.set(0, 0, -10);
    exhibits.push(displayCase);

    const displayCase2 = this.createDisplayCase('青铜鼎', '商代', '商代晚期青铜礼器');
    displayCase2.mesh.position.set(0, 0, 8);
    exhibits.push(displayCase2);

    return exhibits;
  }

  private createSculpture(name: string, author: string, description: string): Exhibit {
    const group = new THREE.Group();
    group.name = 'sculpture-' + name;

    const baseGeometry = new THREE.CylinderGeometry(0.8, 1, 0.4, 32);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a5a5a,
      roughness: 0.7,
      metalness: 0.3
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.2;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      roughness: 0.4,
      metalness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    group.add(body);

    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.y = 1.9;
    head.castShadow = true;
    group.add(head);

    const armGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8);
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArm.position.set(-0.35, 1.5, 0);
    leftArm.rotation.z = 0.3;
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArm.position.set(0.35, 1.5, 0);
    rightArm.rotation.z = -0.3;
    rightArm.castShadow = true;
    group.add(rightArm);

    const pedestalGeometry = new THREE.BoxGeometry(1.4, 0.6, 1.4);
    const pedestalMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.8,
      metalness: 0.1
    });
    const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
    pedestal.position.y = -0.3;
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    group.add(pedestal);

    return { mesh: group, name: `雕塑-${name}`, author, description };
  }

  private createPainting(name: string, author: string, description: string): Exhibit {
    const group = new THREE.Group();
    group.name = 'painting-' + name;

    const frameGeometry = new THREE.BoxGeometry(2.4, 1.8, 0.15);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.6,
      metalness: 0.2
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.castShadow = true;
    group.add(frame);

    const canvasGeometry = new THREE.PlaneGeometry(2.1, 1.5);
    const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181];
    const colorIndex = Math.floor(Math.random() * colors.length);
    const canvasColor = colors[colorIndex];
    const canvasMaterial = new THREE.MeshStandardMaterial({
      color: canvasColor,
      roughness: 0.9,
      metalness: 0
    });
    const canvas = new THREE.Mesh(canvasGeometry, canvasMaterial);
    canvas.position.z = 0.08;
    group.add(canvas);

    const accentGeometry = new THREE.CircleGeometry(0.2, 16);
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8
    });
    const accent1 = new THREE.Mesh(accentGeometry, accentMaterial);
    accent1.position.set(-0.5, 0.2, 0.09);
    accent1.scale.set(1.5, 1, 1);
    group.add(accent1);

    const triShape = new THREE.Shape();
    triShape.moveTo(0, 0.3);
    triShape.lineTo(-0.25, -0.2);
    triShape.lineTo(0.25, -0.2);
    triShape.lineTo(0, 0.3);
    const triGeometry = new THREE.ShapeGeometry(triShape);
    const tri = new THREE.Mesh(triGeometry, accentMaterial);
    tri.position.set(0.5, -0.1, 0.09);
    group.add(tri);

    return { mesh: group, name: `油画-${name}`, author, description };
  }

  private createDisplayCase(name: string, author: string, description: string): Exhibit {
    const group = new THREE.Group();
    group.name = 'displaycase-' + name;

    const baseGeometry = new THREE.BoxGeometry(1.5, 0.2, 1.5);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.7,
      metalness: 0.2
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.1;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const glassGeometry = new THREE.BoxGeometry(1.3, 1.6, 1.3);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      roughness: 0,
      metalness: 0,
      transmission: 0.9
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.y = 1.1;
    group.add(glass);

    const frameMaterial2 = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.5,
      metalness: 0.3
    });

    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.08, 1.35),
      frameMaterial2
    );
    topFrame.position.y = 1.94;
    group.add(topFrame);

    const vaseGeometry = new THREE.CylinderGeometry(0.15, 0.25, 0.6, 16);
    const vaseMaterial = new THREE.MeshStandardMaterial({
      color: 0x228b22,
      roughness: 0.3,
      metalness: 0.4
    });
    const vase = new THREE.Mesh(vaseGeometry, vaseMaterial);
    vase.position.y = 0.7;
    vase.castShadow = true;
    group.add(vase);

    const vaseNeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.15, 0.15, 16),
      vaseMaterial
    );
    vaseNeck.position.y = 1.05;
    vaseNeck.castShadow = true;
    group.add(vaseNeck);

    return { mesh: group, name: `展品-${name}`, author, description };
  }
}
