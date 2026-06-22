import * as THREE from 'three';

export class Magnifier {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;

  private renderTarget: THREE.WebGLRenderTarget;
  private magnifierScene: THREE.Scene;
  private magnifierCamera: THREE.OrthographicCamera;
  private magnifierQuad: THREE.Mesh | null = null;
  private magnifierMaterial: THREE.ShaderMaterial | null = null;

  private isActive: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private smoothMouseX: number = 0;
  private smoothMouseY: number = 0;
  private radius: number = 100;
  private magnification: number = 2.0;
  private smoothFactor: number = 0.25;

  private width: number = 0;
  private height: number = 0;

  constructor(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false
    });

    this.magnifierScene = new THREE.Scene();
    this.magnifierCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    this.magnifierCamera.position.z = 10;

    this.createMagnifierQuad();
  }

  private createMagnifierQuad(): void {
    const geometry = new THREE.PlaneGeometry(2, 2);

    this.magnifierMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this.renderTarget.texture },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uRadius: { value: this.radius },
        uMagnification: { value: this.magnification },
        uResolution: { value: new THREE.Vector2(this.width, this.height) },
        uActive: { value: 0.0 },
        uBorderWidth: { value: 2.0 },
        uBorderColor: { value: new THREE.Color(0xffffff) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec2 uCenter;
        uniform float uRadius;
        uniform float uMagnification;
        uniform vec2 uResolution;
        uniform float uActive;
        uniform float uBorderWidth;
        uniform vec3 uBorderColor;
        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;
          vec2 pixelUv = uv * uResolution;
          vec2 centerPixel = uCenter * uResolution;
          
          float dist = distance(pixelUv, centerPixel);
          
          if (uActive < 0.5) {
            gl_FragColor = texture2D(uTexture, uv);
            return;
          }
          
          if (dist < uRadius) {
            vec2 dir = pixelUv - centerPixel;
            vec2 magnifiedPixel = centerPixel + dir / uMagnification;
            vec2 magnifiedUv = magnifiedPixel / uResolution;
            
            vec4 magnifiedColor = texture2D(uTexture, magnifiedUv);
            
            float edgeDist = uRadius - dist;
            float edgeSoftness = 2.0;
            float edgeAlpha = 1.0;
            if (edgeDist < edgeSoftness) {
              edgeAlpha = edgeDist / edgeSoftness;
            }
            
            float borderFactor = 0.0;
            if (dist > uRadius - uBorderWidth) {
              borderFactor = (dist - (uRadius - uBorderWidth)) / uBorderWidth;
              borderFactor = 1.0 - borderFactor;
              borderFactor = smoothstep(0.0, 1.0, borderFactor);
            }
            
            vec3 finalColor = mix(magnifiedColor.rgb, uBorderColor, borderFactor);
            float finalAlpha = mix(magnifiedColor.a, 1.0, borderFactor);
            finalAlpha *= edgeAlpha;
            
            gl_FragColor = vec4(finalColor, finalAlpha);
          } else {
            gl_FragColor = texture2D(uTexture, uv);
          }
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.magnifierQuad = new THREE.Mesh(geometry, this.magnifierMaterial);
    this.magnifierScene.add(this.magnifierQuad);
  }

  public activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    if (this.magnifierMaterial) {
      this.magnifierMaterial.uniforms.uActive.value = 1.0;
    }
  }

  public deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    if (this.magnifierMaterial) {
      this.magnifierMaterial.uniforms.uActive.value = 0.0;
    }
  }

  public isMagnifierActive(): boolean {
    return this.isActive;
  }

  public updateMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  public onResize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.renderTarget.setSize(this.width, this.height);

    if (this.magnifierMaterial) {
      this.magnifierMaterial.uniforms.uResolution.value.set(this.width, this.height);
    }
  }

  public update(delta: number): void {
    const smoothing = Math.min(1.0, this.smoothFactor * delta * 60);
    this.smoothMouseX += (this.mouseX - this.smoothMouseX) * smoothing;
    this.smoothMouseY += (this.mouseY - this.smoothMouseY) * smoothing;

    if (this.magnifierMaterial) {
      this.magnifierMaterial.uniforms.uCenter.value.set(
        this.smoothMouseX / this.width,
        1.0 - this.smoothMouseY / this.height
      );
    }
  }

  public render(): void {
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(null);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.magnifierScene, this.magnifierCamera);
  }

  public dispose(): void {
    this.renderTarget.dispose();
    if (this.magnifierMaterial) {
      this.magnifierMaterial.dispose();
    }
    if (this.magnifierQuad) {
      this.magnifierQuad.geometry.dispose();
    }
  }
}
