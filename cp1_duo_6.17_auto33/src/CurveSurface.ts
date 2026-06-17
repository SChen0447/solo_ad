import * as THREE from 'three';

export interface ControlPoint3D {
    x: number;
    y: number;
    z: number;
}

export interface PanelMesh extends THREE.Mesh {
    panelIndex: number;
    isSelected: boolean;
    baseMaterial: THREE.MeshStandardMaterial;
    highlightMaterial: THREE.MeshStandardMaterial;
}

export class CurveSurface {
    private scene: THREE.Scene;
    private controlPoints: ControlPoint3D[];
    private rows: number;
    private cols: number;
    private uDivisions: number;
    private vDivisions: number;
    private surfaceGroup: THREE.Group;
    private panelMeshes: PanelMesh[];
    private controlPointMeshes: THREE.Mesh[];

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.rows = 2;
        this.cols = 3;
        this.uDivisions = 18;
        this.vDivisions = 22;
        this.panelMeshes = [];
        this.controlPointMeshes = [];
        this.surfaceGroup = new THREE.Group();
        this.surfaceGroup.name = 'surfaceGroup';
        this.scene.add(this.surfaceGroup);

        this.controlPoints = this.generateDefaultControlPoints();
        this.createControlPointMeshes();
        this.generateSurface();
    }

    private generateDefaultControlPoints(): ControlPoint3D[] {
        const points: ControlPoint3D[] = [];
        const width = 8;
        const height = 6;

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const x = (col / (this.cols - 1) - 0.5) * width;
                const y = (row / (this.rows - 1) - 0.5) * height;
                const z = Math.sin(col * 1.5) * 1.5 + Math.cos(row * 2) * 0.8;
                points.push({ x, y, z });
            }
        }
        return points;
    }

    private createControlPointMeshes(): void {
        const geometry = new THREE.SphereGeometry(0.3, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.9,
            roughness: 0.2,
            emissive: 0xd4af37,
            emissiveIntensity: 0.2
        });

        this.controlPoints.forEach((point, index) => {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(point.x, point.y, point.z);
            mesh.name = `controlPoint_${index}`;
            mesh.userData.index = index;
            mesh.castShadow = true;
            this.surfaceGroup.add(mesh);
            this.controlPointMeshes.push(mesh);
        });
    }

    private catmullRom(p0: ControlPoint3D, p1: ControlPoint3D, p2: ControlPoint3D, p3: ControlPoint3D, t: number): ControlPoint3D {
        const t2 = t * t;
        const t3 = t2 * t;

        const x = 0.5 * (
            2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );

        const y = 0.5 * (
            2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );

        const z = 0.5 * (
            2 * p1.z +
            (-p0.z + p2.z) * t +
            (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
            (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3
        );

        return { x, y, z };
    }

    private getPoint(row: number, col: number): ControlPoint3D {
        if (row < 0) row = 0;
        if (row >= this.rows) row = this.rows - 1;
        if (col < 0) col = 0;
        if (col >= this.cols) col = this.cols - 1;
        return this.controlPoints[row * this.cols + col];
    }

    private getSurfacePoint(u: number, v: number): ControlPoint3D {
        const uIndex = u * (this.cols - 1);
        const vIndex = v * (this.rows - 1);

        const u0 = Math.floor(uIndex);
        const u1 = u0 + 1;
        const uT = uIndex - u0;

        const v0 = Math.floor(vIndex);
        const v1 = v0 + 1;
        const vT = vIndex - v0;

        const rowPoints: ControlPoint3D[] = [];

        for (let row = v0 - 1; row <= v1 + 1; row++) {
            const p0 = this.getPoint(row, u0 - 1);
            const p1 = this.getPoint(row, u0);
            const p2 = this.getPoint(row, u1);
            const p3 = this.getPoint(row, u1 + 1);
            rowPoints.push(this.catmullRom(p0, p1, p2, p3, uT));
        }

        return this.catmullRom(rowPoints[0], rowPoints[1], rowPoints[2], rowPoints[3], vT);
    }

    private computeNormal(u: number, v: number): THREE.Vector3 {
        const eps = 0.001;
        const p = this.getSurfacePoint(u, v);
        const pu = this.getSurfacePoint(Math.min(u + eps, 1), v);
        const pv = this.getSurfacePoint(u, Math.min(v + eps, 1));

        const dpdu = new THREE.Vector3(pu.x - p.x, pu.y - p.y, pu.z - p.z);
        const dpdv = new THREE.Vector3(pv.x - p.x, pv.y - p.y, pv.z - p.z);

        const normal = new THREE.Vector3().crossVectors(dpdv, dpdu).normalize();
        return normal;
    }

    private clearSurfacePanels(): void {
        this.panelMeshes.forEach(mesh => {
            this.surfaceGroup.remove(mesh);
            (mesh.baseMaterial as THREE.Material).dispose();
            (mesh.highlightMaterial as THREE.Material).dispose();
            mesh.geometry.dispose();
        });
        this.panelMeshes = [];
    }

    private generateSurface(): void {
        this.clearSurfacePanels();

        const defaultColor = 0x4a90d9;

        for (let vi = 0; vi < this.vDivisions; vi++) {
            for (let ui = 0; ui < this.uDivisions; ui++) {
                const u0 = ui / this.uDivisions;
                const u1 = (ui + 1) / this.uDivisions;
                const v0 = vi / this.vDivisions;
                const v1 = (vi + 1) / this.vDivisions;

                const p00 = this.getSurfacePoint(u0, v0);
                const p10 = this.getSurfacePoint(u1, v0);
                const p11 = this.getSurfacePoint(u1, v1);
                const p01 = this.getSurfacePoint(u0, v1);

                const geometry = new THREE.BufferGeometry();
                const vertices = new Float32Array([
                    p00.x, p00.y, p00.z,
                    p10.x, p10.y, p10.z,
                    p11.x, p11.y, p11.z,
                    p01.x, p01.y, p01.z
                ]);

                const indices = [0, 1, 2, 0, 2, 3];

                const n00 = this.computeNormal(u0, v0);
                const n10 = this.computeNormal(u1, v0);
                const n11 = this.computeNormal(u1, v1);
                const n01 = this.computeNormal(u0, v1);

                const normals = new Float32Array([
                    n00.x, n00.y, n00.z,
                    n10.x, n10.y, n10.z,
                    n11.x, n11.y, n11.z,
                    n01.x, n01.y, n01.z
                ]);

                const uvs = new Float32Array([
                    u0, v0,
                    u1, v0,
                    u1, v1,
                    u0, v1
                ]);

                geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
                geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
                geometry.setIndex(indices);

                const baseMaterial = new THREE.MeshStandardMaterial({
                    color: defaultColor,
                    transparent: true,
                    opacity: 0.7,
                    metalness: 0.6,
                    roughness: 0.3,
                    side: THREE.DoubleSide
                });

                const highlightMaterial = new THREE.MeshStandardMaterial({
                    color: 0xffd700,
                    transparent: true,
                    opacity: 0.9,
                    metalness: 0.9,
                    roughness: 0.1,
                    emissive: 0xffd700,
                    emissiveIntensity: 0.3,
                    side: THREE.DoubleSide
                });

                const mesh = new THREE.Mesh(geometry, baseMaterial) as unknown as PanelMesh;
                mesh.panelIndex = vi * this.uDivisions + ui;
                mesh.isSelected = false;
                mesh.baseMaterial = baseMaterial;
                mesh.highlightMaterial = highlightMaterial;
                mesh.name = `panel_${mesh.panelIndex}`;
                mesh.userData.panelIndex = mesh.panelIndex;

                this.surfaceGroup.add(mesh);
                this.panelMeshes.push(mesh);
            }
        }

        console.log(`Generated ${this.panelMeshes.length} panels`);
    }

    public updateControlPoint(index: number, x: number, y: number, z: number): void {
        if (index < 0 || index >= this.controlPoints.length) return;

        this.controlPoints[index] = { x, y, z };

        if (this.controlPointMeshes[index]) {
            this.controlPointMeshes[index].position.set(x, y, z);
        }

        this.updateSurfaceGeometry();
    }

    private updateSurfaceGeometry(): void {
        let panelIndex = 0;
        for (let vi = 0; vi < this.vDivisions; vi++) {
            for (let ui = 0; ui < this.uDivisions; ui++) {
                const u0 = ui / this.uDivisions;
                const u1 = (ui + 1) / this.uDivisions;
                const v0 = vi / this.vDivisions;
                const v1 = (vi + 1) / this.vDivisions;

                const p00 = this.getSurfacePoint(u0, v0);
                const p10 = this.getSurfacePoint(u1, v0);
                const p11 = this.getSurfacePoint(u1, v1);
                const p01 = this.getSurfacePoint(u0, v1);

                const mesh = this.panelMeshes[panelIndex];
                const positions = mesh.geometry.attributes.position.array as Float32Array;

                positions[0] = p00.x; positions[1] = p00.y; positions[2] = p00.z;
                positions[3] = p10.x; positions[4] = p10.y; positions[5] = p10.z;
                positions[6] = p11.x; positions[7] = p11.y; positions[8] = p11.z;
                positions[9] = p01.x; positions[10] = p01.y; positions[11] = p01.z;

                mesh.geometry.attributes.position.needsUpdate = true;

                const n00 = this.computeNormal(u0, v0);
                const n10 = this.computeNormal(u1, v0);
                const n11 = this.computeNormal(u1, v1);
                const n01 = this.computeNormal(u0, v1);

                const normals = mesh.geometry.attributes.normal.array as Float32Array;
                normals[0] = n00.x; normals[1] = n00.y; normals[2] = n00.z;
                normals[3] = n10.x; normals[4] = n10.y; normals[5] = n10.z;
                normals[6] = n11.x; normals[7] = n11.y; normals[8] = n11.z;
                normals[9] = n01.x; normals[10] = n01.y; normals[11] = n01.z;

                mesh.geometry.attributes.normal.needsUpdate = true;
                mesh.geometry.computeBoundingBox();
                mesh.geometry.computeBoundingSphere();

                panelIndex++;
            }
        }
    }

    public getControlPoints(): ControlPoint3D[] {
        return [...this.controlPoints];
    }

    public getControlPointMeshes(): THREE.Mesh[] {
        return this.controlPointMeshes;
    }

    public getPanelMeshes(): PanelMesh[] {
        return this.panelMeshes;
    }

    public setPanelMaterial(panelIndices: number[], params: {
        color?: string;
        opacity?: number;
        metalness?: number;
        roughness?: number;
    }): void {
        const duration = 200;
        const startTime = performance.now();

        const panels = panelIndices
            .map(i => this.panelMeshes[i])
            .filter(Boolean);

        const startValues = panels.map(mesh => ({
            color: mesh.baseMaterial.color.getHex(),
            opacity: mesh.baseMaterial.opacity,
            metalness: mesh.baseMaterial.metalness,
            roughness: mesh.baseMaterial.roughness
        }));

        const endColor = params.color ? new THREE.Color(params.color).getHex() : null;

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            const easeT = 1 - Math.pow(1 - t, 3);

            panels.forEach((mesh, i) => {
                const start = startValues[i];
                const mat = mesh.baseMaterial;
                const hlightMat = mesh.highlightMaterial;

                if (endColor !== null) {
                    const color = new THREE.Color(start.color).lerp(new THREE.Color(endColor), easeT);
                    mat.color.copy(color);
                    if (!mesh.isSelected) {
                        hlightMat.color.copy(color).multiplyScalar(1.2);
                    }
                }

                if (params.opacity !== undefined) {
                    mat.opacity = start.opacity + (params.opacity - start.opacity) * easeT;
                }

                if (params.metalness !== undefined) {
                    mat.metalness = start.metalness + (params.metalness - start.metalness) * easeT;
                    hlightMat.metalness = mat.metalness + 0.3;
                }

                if (params.roughness !== undefined) {
                    mat.roughness = start.roughness + (params.roughness - start.roughness) * easeT;
                    hlightMat.roughness = Math.max(0, mat.roughness - 0.2);
                }

                mat.needsUpdate = true;
                hlightMat.needsUpdate = true;
            });

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    public selectPanels(panelIndices: number[]): void {
        this.panelMeshes.forEach(mesh => {
            mesh.isSelected = false;
            mesh.material = mesh.baseMaterial;
        });

        panelIndices.forEach(index => {
            const mesh = this.panelMeshes[index];
            if (mesh) {
                mesh.isSelected = true;
                mesh.material = mesh.highlightMaterial;
            }
        });
    }

    public getSurfaceGroup(): THREE.Group {
        return this.surfaceGroup;
    }

    public getPanelCount(): number {
        return this.panelMeshes.length;
    }

    public setEnvMap(envMap: THREE.Texture | null): void {
        this.panelMeshes.forEach(mesh => {
            mesh.baseMaterial.envMap = envMap;
            mesh.baseMaterial.envMapIntensity = 1.0;
            mesh.baseMaterial.needsUpdate = true;
            mesh.highlightMaterial.envMap = envMap;
            mesh.highlightMaterial.envMapIntensity = 1.2;
            mesh.highlightMaterial.needsUpdate = true;
        });
    }

    public dispose(): void {
        this.clearSurfacePanels();
        this.controlPointMeshes.forEach(mesh => {
            this.surfaceGroup.remove(mesh);
            (mesh.material as THREE.Material).dispose();
            mesh.geometry.dispose();
        });
        this.controlPointMeshes = [];
    }
}
