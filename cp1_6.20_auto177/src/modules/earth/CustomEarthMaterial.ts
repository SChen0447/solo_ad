import * as THREE from 'three';

export class CustomEarthMaterial extends THREE.ShaderMaterial {
  private time: { value: number };
  private glowColor: { value: THREE.Color };
  private pulsePeriod: { value: number };

  constructor() {
    super({
      uniforms: {
        time: { value: 0 },
        glowColor: { value: new THREE.Color(0xff6600) },
        pulsePeriod: { value: 3.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 glowColor;
        uniform float pulsePeriod;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        float plateBoundary(vec2 uv) {
          float lines = 0.0;
          
          float latLines = abs(sin(uv.y * 30.0)) * 0.5 + 0.5;
          latLines = smoothstep(0.98, 0.99, latLines);
          
          float lonLines = abs(sin(uv.x * 60.0)) * 0.5 + 0.5;
          lonLines = smoothstep(0.98, 0.99, lonLines);
          
          float noise = random(uv * 100.0);
          noise = smoothstep(0.7, 0.8, noise);
          
          lines = max(latLines, lonLines);
          lines = max(lines, noise * 0.3);
          
          return lines;
        }
        
        void main() {
          float pulse = sin(time * 2.0 * 3.14159 / pulsePeriod) * 0.5 + 0.5;
          float boundary = plateBoundary(vUv);
          
          float intensity = boundary * (0.5 + pulse * 0.5);
          
          vec3 color = mix(vec3(0.0), glowColor, intensity);
          float alpha = intensity * 0.8;
          
          vec3 baseColor = vec3(0.1, 0.15, 0.3);
          vec3 finalColor = mix(baseColor, color, intensity);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: true
    });

    this.time = this.uniforms.time as { value: number };
    this.glowColor = this.uniforms.glowColor as { value: THREE.Color };
    this.pulsePeriod = this.uniforms.pulsePeriod as { value: number };
  }

  update(deltaTime: number): void {
    this.time.value += deltaTime;
  }

  setGlowColor(color: THREE.Color): void {
    this.glowColor.value = color;
  }

  setPulsePeriod(period: number): void {
    this.pulsePeriod.value = period;
  }
}
