import * as THREE from 'three';

export type EnvMapType = 'clearSky' | 'sunset' | 'cloudy';

export interface SunLightParams {
    azimuth: number;
    altitude: number;
}

export interface EnvPreset {
    name: EnvMapType;
    ambientColor: number;
    ambientIntensity: number;
    sunColor: number;
    sunIntensity: number;
    bgTopColor: number;
    bgBottomColor: number;
    fogColor: number;
}

export class LightController {
    private scene: THREE.Scene;
    private renderer: THREE.WebGLRenderer;
    private sunLight: THREE.DirectionalLight;
    private ambientLight: THREE.AmbientLight;
    private hemiLight: THREE.HemisphereLight;
    private currentEnv: EnvMapType;
    private envMap: THREE.Texture | null;
    private sunAzimuth: number;
    private sunAltitude: number;
    private transitionProgress: number;
    private fromPreset: EnvPreset | null;
    private toPreset: EnvPreset | null;
    private isTransitioning: boolean;

    private static envPresets: Record<EnvMapType, EnvPreset> = {
        clearSky: {
            name: 'clearSky',
            ambientColor: 0x87ceeb,
            ambientIntensity: 0.5,
            sunColor: 0xffffff,
            sunIntensity: 1.5,
            bgTopColor: 0x1a2a4a,
            bgBottomColor: 0x0d1520,
            fogColor: 0x1a1a2e
        },
        sunset: {
            name: 'sunset',
            ambientColor: 0xffa07a,
            ambientIntensity: 0.4,
            sunColor: 0xff8c00,
            sunIntensity: 1.2,
            bgTopColor: 0x3d1f2d,
            bgBottomColor: 0x4a2c1a,
            fogColor: 0x2d1f2e
        },
        cloudy: {
            name: 'cloudy',
            ambientColor: 0x708090,
            ambientIntensity: 0.6,
            sunColor: 0xe0e0e0,
            sunIntensity: 0.8,
            bgTopColor: 0x2a2a3a,
            bgBottomColor: 0x1a1a2a,
            fogColor: 0x1e1e2e
        }
    };

    constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.currentEnv = 'clearSky';
        this.envMap = null;
        this.sunAzimuth = 45;
        this.sunAltitude = 45;
        this.transitionProgress = 1;
        this.fromPreset = null;
        this.toPreset = null;
        this.isTransitioning = false;

        this.ambientLight = new THREE.AmbientLight(0x87ceeb, 0.5);
        this.scene.add(this.ambientLight);

        this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2a2a3a, 0.4);
        this.scene.add(this.hemiLight);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 50;
        this.sunLight.shadow.camera.left = -15;
        this.sunLight.shadow.camera.right = 15;
        this.sunLight.shadow.camera.top = 15;
        this.sunLight.shadow.camera.bottom = -15;
        this.scene.add(this.sunLight);
        this.scene.add(this.sunLight.target);

        this.generateEnvMap('clearSky');
        this.applyPreset(LightController.envPresets.clearSky);
        this.updateSunPosition();
    }

    private generateEnvMap(envType: EnvMapType): void {
        const preset = LightController.envPresets[envType];

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;

        const gradient = ctx.createLinearGradient(0, 0, 0, 256);
        const topColor = new THREE.Color(preset.bgTopColor);
        const bottomColor = new THREE.Color(preset.bgBottomColor);

        if (envType === 'clearSky') {
            gradient.addColorStop(0, `rgb(${topColor.r * 255 * 0.8}, ${topColor.g * 255 * 0.9}, ${topColor.b * 255})`);
            gradient.addColorStop(0.5, `rgb(${80}, ${120}, ${180})`);
            gradient.addColorStop(1, `rgb(${bottomColor.r * 255 * 1.2}, ${bottomColor.g * 255}, ${bottomColor.b * 255 * 0.8})`);
        } else if (envType === 'sunset') {
            gradient.addColorStop(0, `rgb(${100}, ${40}, ${60})`);
            gradient.addColorStop(0.4, `rgb(${200}, ${100}, ${50})`);
            gradient.addColorStop(0.7, `rgb(${255}, ${140}, ${80})`);
            gradient.addColorStop(1, `rgb(${150}, ${80}, ${60})`);
        } else {
            gradient.addColorStop(0, `rgb(${100}, ${110}, ${130})`);
            gradient.addColorStop(0.5, `rgb(${120}, ${130}, ${150})`);
            gradient.addColorStop(1, `rgb(${80}, ${85}, ${100})`);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);

        if (envType === 'clearSky') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(128, 80, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 200, 0.3)';
            ctx.beginPath();
            ctx.arc(128, 80, 40, 0, Math.PI * 2);
            ctx.fill();
        } else if (envType === 'sunset') {
            ctx.fillStyle = 'rgba(255, 180, 100, 0.9)';
            ctx.beginPath();
            ctx.arc(128, 180, 35, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 120, 60, 0.3)';
            ctx.beginPath();
            ctx.arc(128, 180, 55, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;

        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.envMap = pmremGenerator.fromEquirectangular(texture).texture;
        this.scene.environment = this.envMap;

        texture.dispose();
        pmremGenerator.dispose();
    }

    private applyPreset(preset: EnvPreset): void {
        this.ambientLight.color.setHex(preset.ambientColor);
        this.ambientLight.intensity = preset.ambientIntensity;

        this.hemiLight.color.setHex(preset.ambientColor);
        this.hemiLight.groundColor.setHex(preset.bgBottomColor);

        this.sunLight.color.setHex(preset.sunColor);
        this.sunLight.intensity = preset.sunIntensity * (0.3 + 0.7 * (this.sunAltitude / 90));

        const topColor = new THREE.Color(preset.bgTopColor);
        const bottomColor = new THREE.Color(preset.bgBottomColor);
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, `#${topColor.getHexString()}`);
        gradient.addColorStop(1, `#${bottomColor.getHexString()}`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2, 512);

        const bgTexture = new THREE.CanvasTexture(canvas);
        this.scene.background = bgTexture;

        this.scene.fog = new THREE.Fog(preset.fogColor, 20, 60);
    }

    private lerpColor(color1: number, color2: number, t: number): THREE.Color {
        const c1 = new THREE.Color(color1);
        const c2 = new THREE.Color(color2);
        return c1.lerp(c2, t);
    }

    public setSunAngle(azimuth: number, altitude: number): void {
        this.sunAzimuth = Math.max(0, Math.min(360, azimuth));
        this.sunAltitude = Math.max(0, Math.min(90, altitude));
        this.updateSunPosition();
    }

    private updateSunPosition(): void {
        const azRad = THREE.MathUtils.degToRad(this.sunAzimuth);
        const altRad = THREE.MathUtils.degToRad(this.sunAltitude);

        const distance = 20;
        const x = Math.sin(azRad) * Math.cos(altRad) * distance;
        const y = Math.sin(altRad) * distance;
        const z = Math.cos(azRad) * Math.cos(altRad) * distance;

        this.sunLight.position.set(x, y, z);
        this.sunLight.target.position.set(0, 0, 0);

        const altitudeFactor = Math.max(0.2, this.sunAltitude / 90);
        const preset = LightController.envPresets[this.currentEnv];
        this.sunLight.intensity = preset.sunIntensity * altitudeFactor;

        if (this.sunAltitude < 30) {
            const warmT = (30 - this.sunAltitude) / 30;
            const warmColor = new THREE.Color(0xffa500);
            const baseColor = new THREE.Color(preset.sunColor);
            this.sunLight.color.copy(baseColor.lerp(warmColor, warmT * 0.5));
        } else {
            this.sunLight.color.setHex(preset.sunColor);
        }
    }

    public setEnvMap(envType: EnvMapType): void {
        if (envType === this.currentEnv && !this.isTransitioning) return;

        const fromPreset = LightController.envPresets[this.currentEnv];
        const toPreset = LightController.envPresets[envType];

        this.fromPreset = fromPreset;
        this.toPreset = toPreset;
        this.transitionProgress = 0;
        this.isTransitioning = true;

        this.generateEnvMap(envType);
        this.currentEnv = envType;

        const startTime = performance.now();
        const duration = 1000;

        const animate = () => {
            const elapsed = performance.now() - startTime;
            this.transitionProgress = Math.min(elapsed / duration, 1);
            const t = this.transitionProgress;
            const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            if (this.fromPreset && this.toPreset) {
                this.ambientLight.color.copy(this.lerpColor(this.fromPreset.ambientColor, this.toPreset.ambientColor, easeT));
                this.ambientLight.intensity = this.fromPreset.ambientIntensity + (this.toPreset.ambientIntensity - this.fromPreset.ambientIntensity) * easeT;

                this.hemiLight.color.copy(this.lerpColor(this.fromPreset.ambientColor, this.toPreset.ambientColor, easeT));
                this.hemiLight.groundColor.copy(this.lerpColor(this.fromPreset.bgBottomColor, this.toPreset.bgBottomColor, easeT));

                const altitudeFactor = Math.max(0.2, this.sunAltitude / 90);
                this.sunLight.color.copy(this.lerpColor(this.fromPreset.sunColor, this.toPreset.sunColor, easeT));
                const fromIntensity = this.fromPreset.sunIntensity * altitudeFactor;
                const toIntensity = this.toPreset.sunIntensity * altitudeFactor;
                this.sunLight.intensity = fromIntensity + (toIntensity - fromIntensity) * easeT;

                const fogColor = this.lerpColor(this.fromPreset.fogColor, this.toPreset.fogColor, easeT);
                if (this.scene.fog) {
                    (this.scene.fog as THREE.Fog).color.copy(fogColor);
                }

                const topColor = this.lerpColor(this.fromPreset.bgTopColor, this.toPreset.bgTopColor, easeT);
                const bottomColor = this.lerpColor(this.fromPreset.bgBottomColor, this.toPreset.bgBottomColor, easeT);

                const canvas = document.createElement('canvas');
                canvas.width = 2;
                canvas.height = 512;
                const ctx = canvas.getContext('2d')!;
                const gradient = ctx.createLinearGradient(0, 0, 0, 512);
                gradient.addColorStop(0, `#${topColor.getHexString()}`);
                gradient.addColorStop(1, `#${bottomColor.getHexString()}`);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 2, 512);

                if (this.scene.background) {
                    (this.scene.background as THREE.Texture).dispose();
                }
                const bgTexture = new THREE.CanvasTexture(canvas);
                this.scene.background = bgTexture;
            }

            if (this.transitionProgress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isTransitioning = false;
                this.fromPreset = null;
                this.toPreset = null;
            }
        };

        animate();
    }

    public getSunAzimuth(): number {
        return this.sunAzimuth;
    }

    public getSunAltitude(): number {
        return this.sunAltitude;
    }

    public getCurrentEnv(): EnvMapType {
        return this.currentEnv;
    }

    public getEnvMap(): THREE.CubeTexture | null {
        return this.envMap;
    }

    public getSunLight(): THREE.DirectionalLight {
        return this.sunLight;
    }

    public update(): void {
    }
}
