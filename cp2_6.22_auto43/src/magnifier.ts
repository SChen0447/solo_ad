import * as THREE from 'three';

export class Magnifier {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;

  private magnifierCanvas: HTMLCanvasElement;
  private magnifierCtx: CanvasRenderingContext2D;
  private isMagnifierActive: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private smoothMouseX: number = 0;
  private smoothMouseY: number = 0;
  private radius: number = 100;
  private magnification: number = 2.0;
  private smoothFactor: number = 0.25;

  private renderTarget: THREE.WebGLRenderTarget;
  private magnifierCamera: THREE.PerspectiveCamera;
  private orthoScene: THREE.Scene;
  private orthoCamera: THREE.OrthographicCamera;
  private magnifierQuad: THREE.Mesh | null = null;
  private quadMaterial: THREE.ShaderMaterial | null = null;

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
      type: THREE.UnsignedByteType
    });

    this.magnifierCamera = new THREE.PerspectiveCamera(
      this.camera.fov,
      this.camera.aspect,
      this.camera.near,
      this.camera.far
    );

    this.orthoScene = new THREE.Scene();
    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.magnifierCanvas = document.createElement('canvas');
    this.magnifierCanvas.width = this.width;
    this.magnifierCanvas.height = this.height;
    this.magnifierCanvas.style.position = 'absolute';
    this.magnifierCanvas.style.top = '0';
    this.magnifierCanvas.style.left = '0';
    this.magnifierCanvas.style.pointerEvents = 'none';
    this.magnifierCanvas.style.zIndex = '30';
    this.magnifierCtx = this.magnifierCanvas.getContext('2d')!;

    this.createMagnifierQuad();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private createMagnifierQuad(): void {
    const geometry = new THREE.PlaneGeometry(2, 2);

    this.quadMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.renderTarget.texture },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uRadius: { value: this.radius },
        uMagnification: { value: this.magnification },
        uResolution: { value: new THREE.Vector2(this.width, this.height) },
        uActive: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uCenter;
        uniform float uRadius;
        uniform float uMagnification;
        uniform vec2 uResolution;
        uniform float uActive;
        varying vec2 vUv;

        void main() {
          vec4 originalColor = texture2D(tDiffuse, vUv);
          
          if (uActive < 0.5) {
            gl_FragColor = originalColor;
            return;
          }

          vec2 pixelUv = vUv * uResolution;
          vec2 centerPixel = uCenter * uResolution;
          float dist = distance(pixelUv, centerPixel);

          if (dist < uRadius) {
            vec2 dir = normalize(pixelUv - centerPixel + 0.0001);
            vec2 magnifiedPixel = centerPixel + dir * (dist / uMagnification);
            vec2 magnifiedUv = magnifiedPixel / uResolution;
            vec4 magnifiedColor = texture2D(tDiffuse, magnifiedUv);

            float edgeWidth = 2.0;
            float edgeFactor = smoothstep(uRadius - edgeWidth, uRadius, dist);

            vec3 borderColor = vec3(1.0);
            float borderWidth = 2.0;
            float borderFactor = 1.0 - smoothstep(uRadius - borderWidth, uRadius, dist);
            float innerBorderFactor = smoothstep(uRadius - borderWidth - 1.0, uRadius - borderWidth, dist);

            vec3 finalColor = mix(magnifiedColor.rgb, borderColor, borderFactor * innerBorderFactor);
            float finalAlpha = mix(magnifiedColor.a, 1.0, borderFactor * innerBorderFactor);
            finalAlpha *= mix(1.0, 0.0, edgeFactor * (1.0 - innerBorderFactor));

            gl_FragColor = vec4(finalColor, finalAlpha);
          } else {
            gl_FragColor = originalColor;
          }
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    this.magnifierQuad = new THREE.Mesh(geometry, this.quadMaterial);
    this.orthoScene.add(this.magnifierQuad);
  }

  public activate(): void {
    this.isMagnifierActive = true;
    if (!this.magnifierCanvas.parentElement) {
      document.getElementById('app')?.appendChild(this.magnifierCanvas);
    }
    if (this.quadMaterial) {
      this.quadMaterial.uniforms.uActive.value = 1.0;
    }
  }

  public deactivate(): void {
    this.isMagnifierActive = false;
    if (this.magnifierCanvas.parentElement) {
      this.magnifierCanvas.parentElement.removeChild(this.magnifierCanvas);
    }
    if (this.quadMaterial) {
      this.quadMaterial.uniforms.uActive.value = 0.0;
    }
    this.magnifierCtx.clearRect(0, 0, this.width, this.height);
  }

  public isActive(): boolean {
    return this.isMagnifierActive;
  }

  public updateMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  public onResize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.renderTarget.setSize(this.width, this.height);
    this.magnifierCanvas.width = this.width;
    this.magnifierCanvas.height = this.height;

    if (this.quadMaterial) {
      this.quadMaterial.uniforms.uResolution.value.set(this.width, this.height);
    }
  }

  public update(_delta: number): void {
    this.smoothMouseX += (this.mouseX - this.smoothMouseX) * this.smoothFactor;
    this.smoothMouseY += (this.mouseY - this.smoothMouseY) * this.smoothFactor;

    if (this.quadMaterial && this.isMagnifierActive) {
      this.quadMaterial.uniforms.uCenter.value.set(
        this.smoothMouseX / this.width,
        1.0 - this.smoothMouseY / this.height
      );
    }
  }

  public render(): void {
    if (!this.isMagnifierActive) {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.orthoScene, this.orthoCamera);

    this.drawCanvasMagnifier();
  }

  private drawCanvasMagnifier(): void {
    const ctx = this.magnifierCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    const cx = this.smoothMouseX;
    const cy = this.smoothMouseY;
    const r = this.radius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const sourceWidth = r * 2 / this.magnification;
    const sourceHeight = r * 2 / this.magnification;
    const sourceX = cx - sourceWidth / 2;
    const sourceY = cy - sourceHeight / 2;

    ctx.drawImage(
      this.renderer.domElement,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      cx - r,
      cy - r,
      r * 2,
      r * 2
    );

    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
