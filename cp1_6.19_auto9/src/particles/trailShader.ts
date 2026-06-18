export const trailVertexShader = `
  attribute float aTrailProgress;
  attribute float aTrailIndex;
  
  varying float vTrailProgress;
  varying vec3 vColor;
  
  uniform float uTrailLength;
  uniform float uSize;
  uniform float uPixelRatio;
  
  void main() {
    vTrailProgress = aTrailProgress;
    vColor = color;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    float sizeMultiplier = vTrailProgress;
    gl_PointSize = uSize * sizeMultiplier * uPixelRatio * (300.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const trailFragmentShader = `
  varying float vTrailProgress;
  varying vec3 vColor;
  
  uniform float uOpacity;
  
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    if (dist > 0.5) {
      discard;
    }
    
    float alpha = (1.0 - dist * 2.0) * vTrailProgress * uOpacity;
    
    gl_FragColor = vec4(vColor, alpha);
  }
`

export const starVertexShader = `
  varying vec3 vColor;
  
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uGlowSize;
  
  void main() {
    vColor = color;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    gl_PointSize = uSize * uGlowSize * uPixelRatio * (300.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const starFragmentShader = `
  varying vec3 vColor;
  
  uniform float uOpacity;
  uniform vec3 uGlowColor;
  
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    if (dist > 0.5) {
      discard;
    }
    
    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    float glow = 1.0 - smoothstep(0.15, 0.5, dist);
    
    vec3 finalColor = vColor * core + uGlowColor * glow * 0.6;
    float alpha = (core * 1.0 + glow * 0.5) * uOpacity;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`
