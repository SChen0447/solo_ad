import * as THREE from 'three';
import { CurveSurface } from './CurveSurface';

export type EnvMapType = 'clearSky' | 'sunset' | 'cloudy';

export interface EnvPreset {
    name: EnvMapType;
    ambientColor: number;
    ambientIntensity: number;
    sunColor: number;
    sunIntensity: number;
    bgTopColor: number;
    bgBottomColor: number;
    fogColor: number;
    envTintColor: number;
}

export class LightController {
    private scene: THREE.Scene;
    private curveSurface: CurveSurface;

    private sunLight: THREE.DirectionalLight;
    private ambientLight: THREE.AmbientLight;
    private hemiLight: THREE.HemisphereLight;

    private currentEnv: EnvMapType;
    private sunAzimuth: number;
    private sunAltitude: number;

    private currentEnvTexture: THREE.Texture | null;
    private targetEnvTexture: THREE.Texture | null;
    private envBlendFactor: number;
    private isEnvTransitioning: boolean;
    private envTransitionStart: number;
    private envTransitionDuration: number;

    private pmremGenerator: THREE.PMREMGenerator;

    private static envPresets: Record<EnvMapType, EnvPreset> = {
        clearSky: {
            name: 'clearSky',
            ambientColor: 0x87ceeb,
            ambientIntensity: 0.5,
            sunColor: 0xffffff,
            sunIntensity: 1.5,
            bgTopColor: 0x2a4a7a,
            bgBottomColor: 0x1a2a4a,
            fogColor: 0x1a1a2e,
            envTintColor: 0x88bbee
        },
        sunset: {
            name: 'sunset',
            ambientColor: 0xffa07a,
            ambientIntensity: 0.45,
            sunColor: 0xff8c00,
            sunIntensity: 1.3,
            bgTopColor: 0x4a1f3d,
            bgBottomColor: 0x6a2c1a,
            fogColor: 0x2d1f2e,
            envTintColor: 0xffaa77
        },
        cloudy: {
            name: 'cloudy',
            ambientColor: 0x708090,
            ambientIntensity: 0.6,
            sunColor: 0xd0d0d0,
            sunIntensity: 0.7,
            bgTopColor: 0x4a5060,
            bgBottomColor: 0x3a3f50,
            fogColor: 0x1e1e2e,
            envTintColor: 0x909aa8
        }
    };

    constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, curveSurface: CurveSurface) {
        this.scene = scene;
        this.renderer = renderer;
        this.curveSurface = curveSurface;

        this.currentEnv = 'clearSky';
        this.sunAzimuth = 45;
        this.sunAltitude = 45;

        this.currentEnvTexture = null;
        this.targetEnvTexture = null;
        this.envBlendFactor = 1.0;
        this.isEnvTransitioning = false;
        this.envTransitionStart = 0;
        this.envTransitionDuration = 1000;

        this.pmremGenerator = new THREE.PMREMGenerator(renderer);
        this.pmremGenerator.compileEquirectangularShader();

        this.ambientLight = new THREE.AmbientLight(0x87ceeb, 0.5);
        this.scene.add(this.ambientLight);

        this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2a2a3a, 0.4);
        this.scene.add(this.hemiLight);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 80;
        this.sunLight.shadow.camera.left = -20;
        this.sunLight.shadow.camera.right = 20;
        this.sunLight.shadow.camera.top = 20;
        this.sunLight.shadow.camera.bottom = -20;
        this.sunLight.shadow.bias = -0.0005;
        this.sunLight.shadow.normalBias = 0.02;
        this.scene.add(this.sunLight);
        this.scene.add(this.sunLight.target);

        this.generateEnvMap('clearSky');
        this.applyPresetInstant(LightController.envPresets.clearSky);
        this.updateSunPosition();
    }

    private generateEnvMap(envType: EnvMapType): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;

        const gradient = ctx.createLinearGradient(0, 0, 0, 512);

        if (envType === 'clearSky') {
            gradient.addColorStop(0, '#1a3a6a');
            gradient.addColorStop(0.3, '#4a8acb');
            gradient.addColorStop(0.6, '#7ab8e8');
            gradient.addColorStop(1, '#a8d4f0');
        } else if (envType === 'sunset') {
            gradient.addColorStop(0, '#2a1030');
            gradient.addColorStop(0.25, '#6a2040');
            gradient.addColorStop(0.5, '#d06040');
            gradient.addColorStop(0.75, '#ff9050');
            gradient.addColorStop(1, '#ffc080');
        } else {
            gradient.addColorStop(0, '#5a6070');
            gradient.addColorStop(0.5, '#9098a8');
            gradient.addColorStop(1, '#b0b8c0');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 512);

        if (envType === 'clearSky') {
            const sunX = 700;
            const sunY = 120;
            const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 120);
            sunGradient.addColorStop(0, 'rgba(255, 255, 220, 1)');
            sunGradient.addColorStop(0.2, 'rgba(255, 240, 180, 0.8)');
            sunGradient.addColorStop(0.5, 'rgba(255, 200, 120, 0.3)');
            sunGradient.addColorStop(1, 'rgba(255, 180, 100, 0)');
            ctx.fillStyle = sunGradient;
            ctx.beginPath();
            ctx.arc(sunX, sunY, 120, 0, Math.PI * 2);
            ctx.fill();
        } else if (envType === 'sunset') {
            const sunX = 512;
            const sunY = 350;
            const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 180);
            sunGradient.addColorStop(0, 'rgba(255, 200, 100, 1)');
            sunGradient.addColorStop(0.3, 'rgba(255, 140, 60, 0.7)');
            sunGradient.addColorStop(0.7, 'rgba(255, 100, 50, 0.3)');
            sunGradient.addColorStop(1, 'rgba(255, 80, 40, 0)');
            ctx.fillStyle = sunGradient;
            ctx.beginPath();
            ctx.arc(sunX, sunY, 180, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.needsUpdate = true;

        const pmrem = this.pmremGenerator.fromEquirectangular(texture);
        const envTexture = pmrem.texture;

        texture.dispose();
        pmrem.dispose();

        return envTexture;
    }

    private applyPresetInstant(preset: EnvPreset): void {
        this.ambientLight.color.setHex(preset.ambientColor);
        this.ambientLight.intensity = preset.ambientIntensity;

        this.hemiLight.color.setHex(preset.ambientColor);
        this.hemiLight.groundColor.setHex(preset.bgBottomColor);

        this.sunLight.color.setHex(preset.sunColor);
        this.sunLight.intensity = preset.sunIntensity * Math.max(0.2, this.sunAltitude / 90);

        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = 2;
        bgCanvas.height = 256;
        const bgCtx = bgCanvas.getContext('2d')!;
        const bgGradient = bgCtx.createLinearGradient(0, 0, 0, 256);
        bgGradient.addColorStop(0, `#${new THREE.Color(preset.bgTopColor).getHexString()}`);
        bgGradient.addColorStop(1, `#${new THREE.Color(preset.bgBottomColor).getHexString()}`);
        bgCtx.fillStyle = bgGradient;
        bgCtx.fillRect(0, 0, 2, 256);

        const bgTexture = new THREE.CanvasTexture(bgCanvas);
        if (this.scene.background) {
            (this.scene.background as THREE.Texture).dispose();
        }
        this.scene.background = bgTexture;

        if (this.scene.fog) {
            (this.scene.fog as THREE.Fog).color.setHex(preset.fogColor);
        } else {
            this.scene.fog = new THREE.Fog(preset.fogColor, 25, 70);
        }

        this.curveSurface.setLightParams({
            ambientColor: new THREE.Color(preset.ambientColor),
            lightColor: new THREE.Color(preset.sunColor),
            lightIntensity: preset.sunIntensity * Math.max(0.2, this.sunAltitude / 90),
            envMapColor: new THREE.Color(preset.envTintColor)
        });
    }

    public setSunAngle(azimuth: number, altitude: number): void {
        this.sunAzimuth = Math.max(0, Math.min(360, azimuth));
        this.sunAltitude = Math.max(0, Math.min(90, altitude));
        this.updateSunPosition();
    }

    private updateSunPosition(): void {
        const azRad = THREE.MathUtils.degToRad(this.sunAzimuth);
        const altRad = THREE.MathUtils.degToRad(this.sunAltitude);

        const lightDistance = 30;

        const x = Math.sin(azRad) * Math.cos(altRad) * lightDistance;
        const y = Math.sin(altRad) * lightDistance;
        const z = Math.cos(azRad) * Math.cos(altRad) * lightDistance;

        this.sunLight.position.set(x, y, z);

        const targetX = 0;
        const targetY = 0;
        const targetZ = 0;
        this.sunLight.target.position.set(targetX, targetY, targetZ);

        const lightDir = new THREE.Vector3(-x, -y, -z).normalize();

        const shadowSize = 25;
        const shadowOffset = 5;

        this.sunLight.shadow.camera.left = -shadowSize;
        this.sunLight.shadow.camera.right = shadowSize;
        this.sunLight.shadow.camera.top = shadowSize;
        this.sunLight.shadow.camera.bottom = -shadowSize;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = lightDistance * 2 + shadowOffset;
        this.sunLight.shadow.camera.updateProjectionMatrix();

        const altitudeFactor = Math.max(0.15, this.sunAltitude / 90);
        const preset = LightController.envPresets[this.currentEnv];
        const baseIntensity = preset.sunIntensity * altitudeFactor;

        this.sunLight.intensity = baseIntensity;

        if (this.sunAltitude < 25) {
            const warmT = (25 - this.sunAltitude) / 25;
            const warmColor = new THREE.Color(0xff8c00);
            const baseColor = new THREE.Color(preset.sunColor);
            const finalColor = baseColor.clone().lerp(warmColor, warmT * 0.6);
            this.sunLight.color.copy(finalColor);
        } else {
            this.sunLight.color.setHex(preset.sunColor);
        }

        this.curveSurface.setLightParams({
            lightDirection: lightDir,
            lightColor: this.sunLight.color.clone(),
            lightIntensity: this.sunLight.intensity
        });
    }

    public setEnvMap(envType: EnvMapType): void {
        if (envType === this.currentEnv && !this.isEnvTransitioning) return;

        const fromPreset = LightController.envPresets[this.currentEnv];
        const toPreset = LightController.envPresets[envType];

        this.targetEnvTexture = this.generateEnvMap(envType);
        this.envTransitionStart = performance.now();
        this.isEnvTransitioning = true;
        this.envBlendFactor = 0;

        const startAmbient = new THREE.Color(fromPreset.ambientColor);
        const endAmbient = new THREE.Color(toPreset.ambientColor);
        const startSunColor = new THREE.Color(fromPreset.sunColor);
        const endSunColor = new THREE.Color(toPreset.sunColor);
        const startBgTop = new THREE.Color(fromPreset.bgTopColor);
        const endBgTop = new THREE.Color(toPreset.bgTopColor);
        const startBgBottom = new THREE.Color(fromPreset.bgBottomColor);
        const endBgBottom = new THREE.Color(toPreset.bgBottomColor);
        const startFog = new THREE.Color(fromPreset.fogColor);
        const endFog = new THREE.Color(toPreset.fogColor);
        const startEnvTint = new THREE.Color(fromPreset.envTintColor);
        const endEnvTint = new THREE.Color(toPreset.envTintColor);

        const startAmbientIntensity = fromPreset.ambientIntensity;
        const endAmbientIntensity = toPreset.ambientIntensity;

        const animate = () => {
            if (!this.isEnvTransitioning) return;

            const elapsed = performance.now() - this.envTransitionStart;
            const t = Math.min(elapsed / this.envTransitionDuration, 1);
            const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            this.envBlendFactor = easeT;

            const ambientColor = startAmbient.clone().lerp(endAmbient, easeT);
            const sunColor = startSunColor.clone().lerp(endSunColor, easeT);
            const bgTopColor = startBgTop.clone().lerp(endBgTop, easeT);
            const bgBottomColor = startBgBottom.clone().lerp(endBgBottom, easeT);
            const fogColor = startFog.clone().lerp(endFog, easeT);
            const envTintColor = startEnvTint.clone().lerp(endEnvTint, easeT);

            const ambientIntensity = startAmbientIntensity + (endAmbientIntensity - startAmbientIntensity) * easeT;

            this.ambientLight.color.copy(ambientColor);
            this.ambientLight.intensity = ambientIntensity;

            this.hemiLight.color.copy(ambientColor);
            this.hemiLight.groundColor.copy(bgBottomColor);

            const altitudeFactor = Math.max(0.15, this.sunAltitude / 90);
            const baseSunIntensity = (fromPreset.sunIntensity + (toPreset.sunIntensity - fromPreset.sunIntensity) * easeT) * altitudeFactor;
            this.sunLight.intensity = baseSunIntensity;
            this.sunLight.color.copy(sunColor);

            const bgCanvas = document.createElement('canvas');
            bgCanvas.width = 2;
            bgCanvas.height = 256;
            const bgCtx = bgCanvas.getContext('2d')!;
            const bgGradient = bgCtx.createLinearGradient(0, 0, 0, 256);
            bgGradient.addColorStop(0, `#${bgTopColor.getHexString()}`);
            bgGradient.addColorStop(1, `#${bgBottomColor.getHexString()}`);
            bgCtx.fillStyle = bgGradient;
            bgCtx.fillRect(0, 0, 2, 256);

            const bgTexture = new THREE.CanvasTexture(bgCanvas);
            if (this.scene.background) {
                (this.scene.background as THREE.Texture).dispose();
            }
            this.scene.background = bgTexture;

            if (this.scene.fog) {
                (this.scene.fog as THREE.Fog).color.copy(fogColor);
            }

            this.curveSurface.setLightParams({
                ambientColor: ambientColor,
                lightColor: sunColor,
                lightIntensity: baseSunIntensity,
                envMapColor: envTintColor
            });

            if (t >= 1) {
                this.isEnvTransitioning = false;
                this.currentEnv = envType;

                if (this.currentEnvTexture) {
                    this.currentEnvTexture.dispose();
                }
                this.currentEnvTexture = this.targetEnvTexture;
                this.targetEnvTexture = null;
                this.envBlendFactor = 1.0;

                this.scene.environment = this.currentEnvTexture;
            } else {
                requestAnimationFrame(animate);
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

    public getSunLight(): THREE.DirectionalLight {
        return this.sunLight;
    }

    public getEnvBlendFactor(): number {
        return this.envBlendFactor;
    }

    public update(): void {
    }

    public dispose(): void {
        this.pmremGenerator.dispose();
        if (this.currentEnvTexture) {
            this.currentEnvTexture.dispose();
        }
        if (this.targetEnvTexture) {
            this.targetEnvTexture.dispose();
        }
    }
}
