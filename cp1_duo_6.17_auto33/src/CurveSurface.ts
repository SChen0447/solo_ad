import * as THREE from 'three';

export interface ControlPoint3D {
    x: number;
    y: number;
    z: number;
}

export interface PanelMaterialData {
    color: THREE.Color;
    opacity: number;
    metalness: number;
    roughness: number;
}

export class CurveSurface {
    private scene: THREE.Scene;
    private controlPoints: ControlPoint3D[];
    private rows: number;
    private cols: number;
    private uDivisions: number;
    private vDivisions: number;
    private surfaceGroup: THREE.Group;
    private controlPointMeshes: THREE.Mesh[];

    private mergedMesh: THREE.Mesh | null;
    private mergedGeometry: THREE.BufferGeometry | null;
    private surfaceMaterial: THREE.ShaderMaterial | null;

    private panelCount: number;
    private panelMaterials: PanelMaterialData[];
    private selectedPanels: Set<number>;

    private static readonly VERTS_PER_PANEL = 4;
    private static readonly TRIS_PER_PANEL = 2;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.rows = 3;
        this.cols = 3;
        this.uDivisions = 16;
        this.vDivisions = 24;
        this.panelCount = this.uDivisions * this.vDivisions;
        this.controlPointMeshes = [];
        this.mergedMesh = null;
        this.mergedGeometry = null;
        this.surfaceMaterial = null;
        this.panelMaterials = [];
        this.selectedPanels = new Set();
        this.surfaceGroup = new THREE.Group();
        this.surfaceGroup.name = 'surfaceGroup';
        this.scene.add(this.surfaceGroup);

        this.controlPoints = this.generateDefaultControlPoints();
        this.initPanelMaterials();
        this.createControlPointMeshes();
        this.createSurfaceMesh();
    }

    private generateDefaultControlPoints(): ControlPoint3D[] {
        const points: ControlPoint3D[] = [];
        const width = 10;
        const height = 8;

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const x = (col / (this.cols - 1) - 0.5) * width;
                const y = (row / (this.rows - 1) - 0.5) * height;
                const z = Math.sin(col * 1.2) * 2 + Math.cos(row * 1.5) * 1.5 + (row - this.rows / 2) * 0.5;
                points.push({ x, y, z });
            }
        }
        return points;
    }

    private initPanelMaterials(): void {
        const defaultColor = new THREE.Color(0x4a90d9);
        this.panelMaterials = [];
        for (let i = 0; i < this.panelCount; i++) {
            this.panelMaterials.push({
                color: defaultColor.clone(),
                opacity: 0.7,
                metalness: 0.6,
                roughness: 0.3
            });
        }
    }

    private createControlPointMeshes(): void {
        const geometry = new THREE.SphereGeometry(0.3, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.95,
            roughness: 0.15,
            emissive: 0xd4af37,
            emissiveIntensity: 0.25
        });

        this.controlPoints.forEach((point, index) => {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(point.x, point.y, point.z);
            mesh.name = `controlPoint_${index}`;
            mesh.userData.index = index;
            mesh.userData.isControlPoint = true;
            mesh.castShadow = true;
            this.surfaceGroup.add(mesh);
            this.controlPointMeshes.push(mesh);
        });
    }

    private catmullRomBasis(t: number): number[] {
        const t2 = t * t;
        const t3 = t2 * t;
        return [
            -0.5 * t3 + t2 - 0.5 * t,
            1.5 * t3 - 2.5 * t2 + 1.0,
            -1.5 * t3 + 2.0 * t2 + 0.5 * t,
            0.5 * t3 - 0.5 * t2
        ];
    }

    private getClampedPoint(row: number, col: number): ControlPoint3D {
        const r = Math.max(0, Math.min(this.rows - 1, row));
        const c = Math.max(0, Math.min(this.cols - 1, col));
        return this.controlPoints[r * this.cols + c];
    }

    private evalSurface(u: number, v: number): THREE.Vector3 {
        const uFloat = u * (this.cols - 1);
        const vFloat = v * (this.rows - 1);

        const uFloor = Math.floor(uFloat);
        const vFloor = Math.floor(vFloat);

        const uT = uFloat - uFloor;
        const vT = vFloat - vFloor;

        const uBasis = this.catmullRomBasis(uT);
        const vBasis = this.catmullRomBasis(vT);

        const result = new THREE.Vector3(0, 0, 0);

        for (let j = 0; j < 4; j++) {
            for (let i = 0; i < 4; i++) {
                const cp = this.getClampedPoint(vFloor + j - 1, uFloor + i - 1);
                const weight = uBasis[i] * vBasis[j];
                result.x += cp.x * weight;
                result.y += cp.y * weight;
                result.z += cp.z * weight;
            }
        }

        return result;
    }

    private evalNormal(u: number, v: number): THREE.Vector3 {
        const eps = 0.001;

        const p = this.evalSurface(u, v);
        const pu = this.evalSurface(Math.min(u + eps, 1), v);
        const pv = this.evalSurface(u, Math.min(v + eps, 1));

        const dpdu = new THREE.Vector3().subVectors(pu, p);
        const dpdv = new THREE.Vector3().subVectors(pv, p);

        const normal = new THREE.Vector3().crossVectors(dpdv, dpdu).normalize();
        return normal;
    }

    private getPanelIndex(ui: number, vi: number): number {
        return vi * this.uDivisions + ui;
    }

    private createSurfaceMesh(): void {
        if (this.mergedMesh) {
            this.surfaceGroup.remove(this.mergedMesh);
            this.mergedGeometry?.dispose();
            this.surfaceMaterial?.dispose();
        }

        const totalVerts = this.panelCount * CurveSurface.VERTS_PER_PANEL;
        const totalIndices = this.panelCount * CurveSurface.TRIS_PER_PANEL * 3;

        const positions = new Float32Array(totalVerts * 3);
        const normals = new Float32Array(totalVerts * 3);
        const uvs = new Float32Array(totalVerts * 2);
        const indices = new Uint32Array(totalIndices);

        const panelColors = new Float32Array(totalVerts * 3);
        const panelOpacity = new Float32Array(totalVerts);
        const panelMetalness = new Float32Array(totalVerts);
        const panelRoughness = new Float32Array(totalVerts);
        const panelSelected = new Float32Array(totalVerts);

        let vertIndex = 0;
        let indexIndex = 0;

        for (let vi = 0; vi < this.vDivisions; vi++) {
            for (let ui = 0; ui < this.uDivisions; ui++) {
                const panelIdx = this.getPanelIndex(ui, vi);

                const u0 = ui / this.uDivisions;
                const u1 = (ui + 1) / this.uDivisions;
                const v0 = vi / this.vDivisions;
                const v1 = (vi + 1) / this.vDivisions;

                const corners = [
                    this.evalSurface(u0, v0),
                    this.evalSurface(u1, v0),
                    this.evalSurface(u1, v1),
                    this.evalSurface(u0, v1)
                ];

                const cornerNormals = [
                    this.evalNormal(u0, v0),
                    this.evalNormal(u1, v0),
                    this.evalNormal(u1, v1),
                    this.evalNormal(u0, v1)
                ];

                const cornerUVs = [
                    [u0, v0],
                    [u1, v0],
                    [u1, v1],
                    [u0, v1]
                ];

                for (let c = 0; c < 4; c++) {
                    const vi3 = vertIndex * 3;
                    const vi2 = vertIndex * 2;

                    positions[vi3] = corners[c].x;
                    positions[vi3 + 1] = corners[c].y;
                    positions[vi3 + 2] = corners[c].z;

                    normals[vi3] = cornerNormals[c].x;
                    normals[vi3 + 1] = cornerNormals[c].y;
                    normals[vi3 + 2] = cornerNormals[c].z;

                    uvs[vi2] = cornerUVs[c][0];
                    uvs[vi2 + 1] = cornerUVs[c][1];

                    const mat = this.panelMaterials[panelIdx];
                    panelColors[vi3] = mat.color.r;
                    panelColors[vi3 + 1] = mat.color.g;
                    panelColors[vi3 + 2] = mat.color.b;

                    panelOpacity[vertIndex] = mat.opacity;
                    panelMetalness[vertIndex] = mat.metalness;
                    panelRoughness[vertIndex] = mat.roughness;
                    panelSelected[vertIndex] = this.selectedPanels.has(panelIdx) ? 1.0 : 0.0;

                    vertIndex++;
                }

                const baseIdx = panelIdx * 4;
                indices[indexIndex++] = baseIdx;
                indices[indexIndex++] = baseIdx + 1;
                indices[indexIndex++] = baseIdx + 2;
                indices[indexIndex++] = baseIdx;
                indices[indexIndex++] = baseIdx + 2;
                indices[indexIndex++] = baseIdx + 3;
            }
        }

        this.mergedGeometry = new THREE.BufferGeometry();
        this.mergedGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        this.mergedGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        this.mergedGeometry.setAttribute('panelColor', new THREE.BufferAttribute(panelColors, 3));
        this.mergedGeometry.setAttribute('panelOpacity', new THREE.BufferAttribute(panelOpacity, 1));
        this.mergedGeometry.setAttribute('panelMetalness', new THREE.BufferAttribute(panelMetalness, 1));
        this.mergedGeometry.setAttribute('panelRoughness', new THREE.BufferAttribute(panelRoughness, 1));
        this.mergedGeometry.setAttribute('panelSelected', new THREE.BufferAttribute(panelSelected, 1));
        this.mergedGeometry.setIndex(new THREE.BufferAttribute(indices, 1));

        this.surfaceMaterial = this.createSurfaceShaderMaterial();

        this.mergedMesh = new THREE.Mesh(this.mergedGeometry, this.surfaceMaterial);
        this.mergedMesh.name = 'curtainWallSurface';
        this.mergedMesh.userData.isSurface = true;
        this.mergedMesh.receiveShadow = true;
        this.mergedMesh.castShadow = true;
        this.surfaceGroup.add(this.mergedMesh);

        console.log(`Generated ${this.panelCount} panels (single draw call)`);
    }

    private createSurfaceShaderMaterial(): THREE.ShaderMaterial {
        const vertexShader = `
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            varying vec3 vWorldPosition;
            varying vec2 vUv;
            
            attribute vec3 panelColor;
            attribute float panelOpacity;
            attribute float panelMetalness;
            attribute float panelRoughness;
            attribute float panelSelected;
            
            varying vec3 vPanelColor;
            varying float vPanelOpacity;
            varying float vPanelMetalness;
            varying float vPanelRoughness;
            varying float vPanelSelected;
            
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewPosition = -mvPosition.xyz;
                vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                vUv = uv;
                
                vPanelColor = panelColor;
                vPanelOpacity = panelOpacity;
                vPanelMetalness = panelMetalness;
                vPanelRoughness = panelRoughness;
                vPanelSelected = panelSelected;
                
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        const fragmentShader = `
            uniform vec3 uAmbientColor;
            uniform vec3 uLightDirection;
            uniform vec3 uLightColor;
            uniform float uLightIntensity;
            uniform vec3 uEnvMapColor;
            uniform float uTime;
            
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            varying vec3 vWorldPosition;
            varying vec2 vUv;
            
            varying vec3 vPanelColor;
            varying float vPanelOpacity;
            varying float vPanelMetalness;
            varying float vPanelRoughness;
            varying float vPanelSelected;
            
            void main() {
                vec3 normal = normalize(vNormal);
                vec3 viewDir = normalize(vViewPosition);
                vec3 lightDir = normalize(uLightDirection);
                
                float NdotL = max(dot(normal, lightDir), 0.0);
                
                vec3 halfDir = normalize(lightDir + viewDir);
                float NdotH = max(dot(normal, halfDir), 0.0);
                
                float roughness = max(0.05, vPanelRoughness);
                float shininess = 2.0 / (roughness * roughness) - 2.0;
                float specular = pow(NdotH, shininess) * vPanelMetalness;
                
                vec3 fresnel = mix(vec3(0.04), vPanelColor, vPanelMetalness);
                vec3 specularColor = fresnel * specular * uLightColor * uLightIntensity;
                
                vec3 diffuseColor = vPanelColor * (1.0 - vPanelMetalness);
                vec3 diffuse = diffuseColor * NdotL * uLightColor * uLightIntensity;
                
                vec3 ambient = vPanelColor * uAmbientColor * 0.5;
                
                vec3 reflectDir = reflect(-viewDir, normal);
                float envMix = vPanelMetalness * 0.7 + 0.1;
                vec3 envReflection = mix(uEnvMapColor, vPanelColor, 0.3) * envMix;
                
                vec3 finalColor = ambient + diffuse + specularColor + envReflection * 0.5;
                
                if (vPanelSelected > 0.5) {
                    vec3 goldColor = vec3(1.0, 0.84, 0.0);
                    float edgeFactor = 1.0 - max(dot(normal, viewDir), 0.0);
                    edgeFactor = pow(edgeFactor, 2.0);
                    finalColor = mix(finalColor, goldColor, 0.4 + edgeFactor * 0.4);
                    finalColor += goldColor * edgeFactor * 0.8;
                }
                
                float alpha = vPanelOpacity;
                if (vPanelSelected > 0.5) {
                    alpha = min(alpha + 0.15, 0.95);
                }
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `;

        return new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            uniforms: {
                uAmbientColor: { value: new THREE.Color(0x87ceeb) },
                uLightDirection: { value: new THREE.Vector3(0.5, 0.7, 0.5).normalize() },
                uLightColor: { value: new THREE.Color(0xffffff) },
                uLightIntensity: { value: 1.5 },
                uEnvMapColor: { value: new THREE.Color(0x88aacc) },
                uTime: { value: 0 }
            }
        });
    }

    public updateControlPoint(index: number, x: number, y: number, z: number): void {
        if (index < 0 || index >= this.controlPoints.length) return;

        this.controlPoints[index] = { x, y, z };

        if (this.controlPointMeshes[index]) {
            this.controlPointMeshes[index].position.set(x, y, z);
        }

        this.updateSurfacePositions();
    }

    private updateSurfacePositions(): void {
        if (!this.mergedGeometry) return;

        const positions = this.mergedGeometry.attributes.position.array as Float32Array;
        const normals = this.mergedGeometry.attributes.normal.array as Float32Array;

        let vertIndex = 0;

        for (let vi = 0; vi < this.vDivisions; vi++) {
            for (let ui = 0; ui < this.uDivisions; ui++) {
                const u0 = ui / this.uDivisions;
                const u1 = (ui + 1) / this.uDivisions;
                const v0 = vi / this.vDivisions;
                const v1 = (vi + 1) / this.vDivisions;

                const corners = [
                    this.evalSurface(u0, v0),
                    this.evalSurface(u1, v0),
                    this.evalSurface(u1, v1),
                    this.evalSurface(u0, v1)
                ];

                const cornerNormals = [
                    this.evalNormal(u0, v0),
                    this.evalNormal(u1, v0),
                    this.evalNormal(u1, v1),
                    this.evalNormal(u0, v1)
                ];

                for (let c = 0; c < 4; c++) {
                    const vi3 = vertIndex * 3;
                    positions[vi3] = corners[c].x;
                    positions[vi3 + 1] = corners[c].y;
                    positions[vi3 + 2] = corners[c].z;

                    normals[vi3] = cornerNormals[c].x;
                    normals[vi3 + 1] = cornerNormals[c].y;
                    normals[vi3 + 2] = cornerNormals[c].z;

                    vertIndex++;
                }
            }
        }

        this.mergedGeometry.attributes.position.needsUpdate = true;
        this.mergedGeometry.attributes.normal.needsUpdate = true;
        this.mergedGeometry.computeBoundingBox();
        this.mergedGeometry.computeBoundingSphere();
    }

    public setPanelMaterial(panelIndices: number[], params: {
        color?: string;
        opacity?: number;
        metalness?: number;
        roughness?: number;
    }): void {
        if (!this.mergedGeometry) return;

        const duration = 200;
        const startTime = performance.now();

        const targetPanels = panelIndices.length > 0 ? panelIndices :
            Array.from({ length: this.panelCount }, (_, i) => i);

        const startValues: PanelMaterialData[] = targetPanels.map(idx => ({
            color: this.panelMaterials[idx].color.clone(),
            opacity: this.panelMaterials[idx].opacity,
            metalness: this.panelMaterials[idx].metalness,
            roughness: this.panelMaterials[idx].roughness
        }));

        const endColor = params.color ? new THREE.Color(params.color) : null;

        const panelColors = this.mergedGeometry.attributes.panelColor.array as Float32Array;
        const panelOpacity = this.mergedGeometry.attributes.panelOpacity.array as Float32Array;
        const panelMetalness = this.mergedGeometry.attributes.panelMetalness.array as Float32Array;
        const panelRoughness = this.mergedGeometry.attributes.panelRoughness.array as Float32Array;

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            const easeT = 1 - Math.pow(1 - t, 3);

            targetPanels.forEach((panelIdx, arrIdx) => {
                const start = startValues[arrIdx];

                let r: number, g: number, b: number;
                if (endColor) {
                    r = start.color.r + (endColor.r - start.color.r) * easeT;
                    g = start.color.g + (endColor.g - start.color.g) * easeT;
                    b = start.color.b + (endColor.b - start.color.b) * easeT;
                } else {
                    r = start.color.r;
                    g = start.color.g;
                    b = start.color.b;
                }

                const opacity = params.opacity !== undefined
                    ? start.opacity + (params.opacity - start.opacity) * easeT
                    : start.opacity;

                const metalness = params.metalness !== undefined
                    ? start.metalness + (params.metalness - start.metalness) * easeT
                    : start.metalness;

                const roughness = params.roughness !== undefined
                    ? start.roughness + (params.roughness - start.roughness) * easeT
                    : start.roughness;

                this.panelMaterials[panelIdx].color.setRGB(r, g, b);
                this.panelMaterials[panelIdx].opacity = opacity;
                this.panelMaterials[panelIdx].metalness = metalness;
                this.panelMaterials[panelIdx].roughness = roughness;

                const baseVert = panelIdx * 4;
                for (let c = 0; c < 4; c++) {
                    const vi = baseVert + c;
                    const vi3 = vi * 3;
                    panelColors[vi3] = r;
                    panelColors[vi3 + 1] = g;
                    panelColors[vi3 + 2] = b;
                    panelOpacity[vi] = opacity;
                    panelMetalness[vi] = metalness;
                    panelRoughness[vi] = roughness;
                }
            });

            this.mergedGeometry!.attributes.panelColor.needsUpdate = true;
            this.mergedGeometry!.attributes.panelOpacity.needsUpdate = true;
            this.mergedGeometry!.attributes.panelMetalness.needsUpdate = true;
            this.mergedGeometry!.attributes.panelRoughness.needsUpdate = true;

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    public selectPanels(panelIndices: number[]): void {
        if (!this.mergedGeometry) return;

        this.selectedPanels.clear();
        panelIndices.forEach(idx => this.selectedPanels.add(idx));

        const panelSelected = this.mergedGeometry.attributes.panelSelected.array as Float32Array;

        for (let i = 0; i < this.panelCount; i++) {
            const selected = this.selectedPanels.has(i) ? 1.0 : 0.0;
            const baseVert = i * 4;
            for (let c = 0; c < 4; c++) {
                panelSelected[baseVert + c] = selected;
            }
        }

        this.mergedGeometry.attributes.panelSelected.needsUpdate = true;
    }

    public getPanelAtScreenPosition(mouse: THREE.Vector2, camera: THREE.Camera): number | null {
        if (!this.mergedMesh || !this.mergedGeometry) return null;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObject(this.mergedMesh);
        if (intersects.length === 0) return null;

        const faceIndex = intersects[0].faceIndex;
        if (faceIndex === undefined) return null;

        const panelIndex = Math.floor(faceIndex / 2);
        return panelIndex;
    }

    public getControlPoints(): ControlPoint3D[] {
        return [...this.controlPoints];
    }

    public getControlPointMeshes(): THREE.Mesh[] {
        return this.controlPointMeshes;
    }

    public getSurfaceGroup(): THREE.Group {
        return this.surfaceGroup;
    }

    public getPanelCount(): number {
        return this.panelCount;
    }

    public setLightParams(params: {
        ambientColor?: THREE.Color;
        lightDirection?: THREE.Vector3;
        lightColor?: THREE.Color;
        lightIntensity?: number;
        envMapColor?: THREE.Color;
    }): void {
        if (!this.surfaceMaterial) return;

        if (params.ambientColor) {
            this.surfaceMaterial.uniforms.uAmbientColor.value.copy(params.ambientColor);
        }
        if (params.lightDirection) {
            this.surfaceMaterial.uniforms.uLightDirection.value.copy(params.lightDirection).normalize();
        }
        if (params.lightColor) {
            this.surfaceMaterial.uniforms.uLightColor.value.copy(params.lightColor);
        }
        if (params.lightIntensity !== undefined) {
            this.surfaceMaterial.uniforms.uLightIntensity.value = params.lightIntensity;
        }
        if (params.envMapColor) {
            this.surfaceMaterial.uniforms.uEnvMapColor.value.copy(params.envMapColor);
        }
    }

    public setEnvMapColor(color: THREE.Color): void {
        if (!this.surfaceMaterial) return;
        this.surfaceMaterial.uniforms.uEnvMapColor.value.copy(color);
    }

    public updateTime(time: number): void {
        if (this.surfaceMaterial) {
            this.surfaceMaterial.uniforms.uTime.value = time;
        }
    }

    public dispose(): void {
        if (this.mergedMesh) {
            this.surfaceGroup.remove(this.mergedMesh);
            this.mergedGeometry?.dispose();
            this.surfaceMaterial?.dispose();
        }
        this.controlPointMeshes.forEach(mesh => {
            this.surfaceGroup.remove(mesh);
            (mesh.material as THREE.Material).dispose();
            mesh.geometry.dispose();
        });
        this.controlPointMeshes = [];
    }
}
