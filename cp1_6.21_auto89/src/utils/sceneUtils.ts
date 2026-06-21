import * as THREE from 'three';
import type { Importance } from '../types';

export const getNodeRadius = (importance: Importance): number => {
  const radii: Record<Importance, number> = {
    large: 1.2,
    medium: 0.9,
    small: 0.6,
  };
  return radii[importance];
};

export const createGlowTexture = (color: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.3, color + 'AA');
  gradient.addColorStop(0.6, color + '44');
  gradient.addColorStop(1, 'transparent');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(128, 128, 128, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0.5, g: 0.5, b: 0.5 };
};

export const lerpColor = (
  color1: THREE.Color,
  color2: THREE.Color,
  t: number
): THREE.Color => {
  return new THREE.Color().lerpColors(color1, color2, t);
};

export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const smoothCameraTransition = (
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  targetPosition: THREE.Vector3,
  targetLookAt: THREE.Vector3,
  duration: number = 800
): Promise<void> => {
  return new Promise((resolve) => {
    const startPosition = camera.position.clone();
    const startLookAt = controls.target.clone();
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      camera.position.lerpVectors(startPosition, targetPosition, eased);
      controls.target.lerpVectors(startLookAt, targetLookAt, eased);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };

    animate();
  });
};

export const createPulseMaterial = (
  baseColor: string
): THREE.ShaderMaterial => {
  const rgb = hexToRgb(baseColor);
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      baseColor: { value: new THREE.Color(rgb.r, rgb.g, rgb.b) },
      pulseSpeed: { value: 2.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 baseColor;
      uniform float pulseSpeed;
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        float pulse = sin(time * pulseSpeed) * 0.5 + 0.5;
        vec3 color = baseColor * (0.7 + pulse * 0.3);
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
        color += fresnel * 0.5;
        gl_FragColor = vec4(color, 0.9);
      }
    `,
    transparent: true,
    side: THREE.FrontSide,
  });
};

export const createAnimatedLineMaterial = (
  startColor: string,
  endColor: string = '#ffffff'
): THREE.ShaderMaterial => {
  const rgb1 = hexToRgb(startColor);
  const rgb2 = hexToRgb(endColor);

  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      colorStart: { value: new THREE.Color(rgb1.r, rgb1.g, rgb1.b) },
      colorEnd: { value: new THREE.Color(rgb2.r, rgb2.g, rgb2.b) },
      flowSpeed: { value: 3.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 colorStart;
      uniform vec3 colorEnd;
      uniform float flowSpeed;
      varying vec2 vUv;
      
      void main() {
        float flow = fract(vUv.x - time * flowSpeed);
        float pulse = smoothstep(0.0, 0.3, flow) * smoothstep(0.6, 0.3, flow);
        vec3 gradient = mix(colorStart, colorEnd, vUv.x);
        vec3 color = gradient * (0.5 + pulse * 0.8);
        gl_FragColor = vec4(color, 0.7 + pulse * 0.3);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
};

export const getCameraTargetForNode = (
  nodePosition: THREE.Vector3,
  distance: number = 8
): THREE.Vector3 => {
  const direction = new THREE.Vector3(1, 0.5, 1).normalize();
  return nodePosition.clone().add(direction.multiplyScalar(distance));
};
