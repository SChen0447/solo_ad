export const connectionBeamVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosition;
  uniform float uTime;
  uniform float uOpacity;

  void main() {
    vUv = uv;
    vPosition = position;
    vec3 pos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

export const connectionBeamFragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosition;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uDistance;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec3 color = mix(uColorA, uColorB, vUv.x);

    float flow = fract(vUv.x * 8.0 - uTime * 0.8);
    float particle = smoothstep(0.0, 0.05, flow) * smoothstep(0.15, 0.1, flow);
    particle += smoothstep(0.3, 0.35, flow) * smoothstep(0.45, 0.4, flow);
    particle += smoothstep(0.6, 0.65, flow) * smoothstep(0.75, 0.7, flow);
    particle += smoothstep(0.85, 0.9, flow) * smoothstep(1.0, 0.95, flow);
    particle *= 0.8;

    float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
    edge = pow(edge, 1.5);

    float glow = noise(vec2(vUv.x * 6.0 + uTime * 0.3, vUv.y * 3.0)) * 0.3 + 0.7;

    float n = noise(vec2(vUv.x * 10.0, vUv.y * 4.0 + uTime * 0.5));
    float centerGlow = smoothstep(0.4, 0.0, abs(vUv.y - 0.5)) * 0.5;

    float alpha = edge * glow * uOpacity * (0.6 + particle + centerGlow * n);

    gl_FragColor = vec4(color * (1.0 + particle * 0.5 + centerGlow * 0.3), alpha);
  }
`
