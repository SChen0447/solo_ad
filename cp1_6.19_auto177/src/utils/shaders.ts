export const temperatureVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const temperatureFragmentShader = `
  uniform float uOpacity;
  uniform float uTime;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  vec3 getTemperatureColor(float temp) {
    temp = clamp(temp, -2.0, 30.0);
    float normalizedTemp = (temp + 2.0) / 32.0;
    
    vec3 coldColor = vec3(0.15, 0.3, 0.8);
    vec3 midColor = vec3(0.2, 0.8, 0.8);
    vec3 warmColor = vec3(1.0, 0.5, 0.2);
    vec3 hotColor = vec3(1.0, 0.2, 0.1);
    
    if (normalizedTemp < 0.33) {
      float t = normalizedTemp / 0.33;
      return mix(coldColor, midColor, t);
    } else if (normalizedTemp < 0.66) {
      float t = (normalizedTemp - 0.33) / 0.33;
      return mix(midColor, warmColor, t);
    } else {
      float t = (normalizedTemp - 0.66) / 0.34;
      return mix(warmColor, hotColor, t);
    }
  }
  
  float getTemperature(vec2 uv) {
    float lat = (uv.y - 0.5) * 180.0;
    float lng = (uv.x - 0.5) * 360.0;
    
    float baseTemp = 30.0 - abs(lat) * 0.35;
    
    float oceanNoise = sin(lng * 0.05) * cos(lat * 0.08) * 3.0;
    oceanNoise += sin(lng * 0.1 + 1.0) * sin(lat * 0.06 + 0.5) * 2.0;
    
    float gulfStream = smoothstep(0.0, 1.0, 1.0 - distance(vec2(uv.x * 360.0 - 260.0, uv.y * 180.0 - 90.0), vec2(0.0, 0.0)) / 40.0) * 8.0;
    float kuroshio = smoothstep(0.0, 1.0, 1.0 - distance(vec2(uv.x * 360.0 - 140.0, uv.y * 180.0 - 110.0), vec2(0.0, 0.0)) / 35.0) * 7.0;
    float peruCurrent = smoothstep(0.0, 1.0, 1.0 - distance(vec2(uv.x * 360.0 - 285.0, uv.y * 180.0 - 30.0), vec2(0.0, 0.0)) / 30.0) * -6.0;
    
    return baseTemp + oceanNoise + gulfStream + kuroshio + peruCurrent;
  }
  
  void main() {
    float temp = getTemperature(vUv);
    vec3 color = getTemperatureColor(temp);
    
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
    color = mix(color, color * 1.2, fresnel * 0.3);
    
    float latitude = abs(vPosition.y);
    float continentMask = smoothstep(0.15, 0.25, latitude) * 0.3 + 0.7;
    
    gl_FragColor = vec4(color, uOpacity * 0.5 * continentMask);
  }
`;

export const salinityVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const salinityFragmentShader = `
  uniform float uOpacity;
  uniform float uTime;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  vec3 getSalinityColor(float salinity) {
    salinity = clamp(salinity, 32.0, 38.0);
    float normalizedSalinity = (salinity - 32.0) / 6.0;
    
    vec3 lowColor = vec3(0.7, 0.85, 0.95);
    vec3 midColor = vec3(0.3, 0.6, 0.9);
    vec3 highColor = vec3(0.1, 0.2, 0.6);
    
    if (normalizedSalinity < 0.5) {
      float t = normalizedSalinity / 0.5;
      return mix(lowColor, midColor, t);
    } else {
      float t = (normalizedSalinity - 0.5) / 0.5;
      return mix(midColor, highColor, t);
    }
  }
  
  float getSalinity(vec2 uv) {
    float lat = (uv.y - 0.5) * 180.0;
    float lng = (uv.x - 0.5) * 360.0;
    
    float baseSalinity = 34.8;
    float latEffect = -abs(lat) * 0.02;
    
    float noise = sin(lng * 0.08 + uTime * 0.01) * cos(lat * 0.1) * 0.5;
    noise += sin(lng * 0.15 + 2.0) * sin(lat * 0.12 + 1.0) * 0.3;
    
    float atlanticHigh = smoothstep(0.0, 1.0, 1.0 - distance(vec2(uv.x * 360.0 - 310.0, uv.y * 180.0 - 90.0), vec2(0.0, 0.0)) / 50.0) * 1.2;
    float pacificLow = smoothstep(0.0, 1.0, 1.0 - distance(vec2(uv.x * 360.0 - 180.0, uv.y * 180.0 - 30.0), vec2(0.0, 0.0)) / 60.0) * -0.8;
    
    return baseSalinity + latEffect + noise + atlanticHigh + pacificLow;
  }
  
  void main() {
    float salinity = getSalinity(vUv);
    vec3 color = getSalinityColor(salinity);
    
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
    color = mix(color, color * 1.15, fresnel * 0.25);
    
    float latitude = abs(vPosition.y);
    float continentMask = smoothstep(0.15, 0.25, latitude) * 0.3 + 0.7;
    
    gl_FragColor = vec4(color, uOpacity * 0.45 * continentMask);
  }
`;

export const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const atmosphereFragmentShader = `
  uniform float uOpacity;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.5);
    
    vec3 atmosphereColor = vec3(0.4, 0.6, 1.0);
    float intensity = fresnel * 0.6;
    
    gl_FragColor = vec4(atmosphereColor, intensity * uOpacity);
  }
`;
