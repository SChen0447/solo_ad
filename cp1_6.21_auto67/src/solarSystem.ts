import * as THREE from 'three';
import { PLANET_DATA, SUN_DATA, ASTEROID_BELT_DATA, type PlanetData } from './planetData';

export interface PlanetObject {
  group: THREE.Group;
  mesh: THREE.Mesh;
  data: PlanetData;
  angle: number;
}

export class SolarSystem {
  private scene: THREE.Scene;
  private sun: THREE.Mesh | null = null;
  private sunLight: THREE.PointLight | null = null;
  private coronaParticles: THREE.Points | null = null;
  private planets: PlanetObject[] = [];
  private orbitLines: THREE.Line[] = [];
  private asteroidBelt: THREE.Points | null = null;
  private asteroidAngles: number[] = [];
  private asteroidSpeeds: number[] = [];
  private time: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createSun();
    this.createCorona();
    this.createPlanets();
    this.createAsteroidBelt();
  }

  private createSun(): void {
    const geometry = new THREE.SphereGeometry(SUN_DATA.radius, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      color: SUN_DATA.color,
      transparent: false
    });
    this.sun = new THREE.Mesh(geometry, material);
    this.sun.name = 'Sun';
    this.scene.add(this.sun);

    this.sunLight = new THREE.PointLight(0xffffff, SUN_DATA.intensity, 300, 1);
    this.sunLight.position.set(0, 0, 0);
    this.scene.add(this.sunLight);

    const ambientLight = new THREE.AmbientLight(0x404050, 0.3);
    this.scene.add(ambientLight);

    const glowGeometry = new THREE.SphereGeometry(SUN_DATA.radius * 1.3, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.4 },
        p: { value: 4.5 },
        glowColor: { value: new THREE.Color(0xffaa00) },
        viewVector: { value: new THREE.Vector3(0, 0, 1) }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.6 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, intensity * 0.8);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.scene.add(sunGlow);
  }

  private createCorona(): void {
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const color = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
      const radius = SUN_DATA.radius * (1.2 + Math.random() * 0.8);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const t = Math.random();
      color.setHSL(0.1 + t * 0.05, 1, 0.5 + t * 0.3);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.05 + Math.random() * 0.1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.coronaParticles = new THREE.Points(geometry, material);
    this.scene.add(this.coronaParticles);
  }

  private createPlanets(): void {
    PLANET_DATA.forEach((data, index) => {
      const planetGroup = new THREE.Group();
      planetGroup.name = data.name;

      const geometry = new THREE.SphereGeometry(data.radiusScale, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.8,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = data.name + '_mesh';
      planetGroup.add(mesh);

      const angle = (index / PLANET_DATA.length) * Math.PI * 2 + Math.random() * 0.5;
      const x = Math.cos(angle) * data.orbitRadiusScale;
      const z = Math.sin(angle) * data.orbitRadiusScale;
      planetGroup.position.set(x, 0, z);

      if (data.name === 'Saturn') {
        const ringGeometry = new THREE.RingGeometry(data.radiusScale * 1.4, data.radiusScale * 2.2, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0xd4b87a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2.5;
        planetGroup.add(ring);
      }

      this.scene.add(planetGroup);

      this.planets.push({
        group: planetGroup,
        mesh: mesh,
        data: data,
        angle: angle
      });

      this.createOrbitLine(data);
    });
  }

  private createOrbitLine(data: PlanetData): void {
    const segments = 128;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * data.orbitRadiusScale,
        0,
        Math.sin(angle) * data.orbitRadiusScale
      ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const color = new THREE.Color(data.color);
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3
    });

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.orbitLines.push(line);
  }

  private createAsteroidBelt(): void {
    const count = ASTEROID_BELT_DATA.count;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const radius = ASTEROID_BELT_DATA.minOrbit +
        Math.random() * (ASTEROID_BELT_DATA.maxOrbit - ASTEROID_BELT_DATA.minOrbit);
      const angle = Math.random() * Math.PI * 2;
      const yOffset = (Math.random() - 0.5) * 0.5;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = yOffset;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      const gray = 0.4 + Math.random() * 0.3;
      color.setRGB(gray, gray, gray * 0.9);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      this.asteroidAngles.push(angle);
      this.asteroidSpeeds.push(
        (ASTEROID_BELT_DATA.speed * (0.8 + Math.random() * 0.4)) / radius
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.asteroidBelt = new THREE.Points(geometry, material);
    this.scene.add(this.asteroidBelt);
  }

  public updatePlanets(deltaTime: number, speedMultiplier: number): void {
    this.time += deltaTime * speedMultiplier;

    this.planets.forEach((planet) => {
      planet.angle += planet.data.orbitalSpeed * deltaTime * speedMultiplier * 0.1;
      const x = Math.cos(planet.angle) * planet.data.orbitRadiusScale;
      const z = Math.sin(planet.angle) * planet.data.orbitRadiusScale;
      planet.group.position.set(x, 0, z);
      planet.mesh.rotation.y += deltaTime * 0.5;
    });

    if (this.coronaParticles) {
      this.coronaParticles.rotation.y += deltaTime * 0.05 * speedMultiplier;
    }

    if (this.asteroidBelt) {
      const positions = this.asteroidBelt.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < ASTEROID_BELT_DATA.count; i++) {
        this.asteroidAngles[i] += this.asteroidSpeeds[i] * deltaTime * speedMultiplier * 0.1;
        const radius = ASTEROID_BELT_DATA.minOrbit +
          (i / ASTEROID_BELT_DATA.count) * (ASTEROID_BELT_DATA.maxOrbit - ASTEROID_BELT_DATA.minOrbit);
        positions[i * 3] = Math.cos(this.asteroidAngles[i]) * radius;
        positions[i * 3 + 2] = Math.sin(this.asteroidAngles[i]) * radius;
      }
      this.asteroidBelt.geometry.attributes.position.needsUpdate = true;
    }

    if (this.sun) {
      this.sun.rotation.y += deltaTime * 0.1;
    }
  }

  public getPlanets(): PlanetObject[] {
    return this.planets;
  }

  public getSun(): THREE.Mesh | null {
    return this.sun;
  }

  public getSunLight(): THREE.PointLight | null {
    return this.sunLight;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }
}
