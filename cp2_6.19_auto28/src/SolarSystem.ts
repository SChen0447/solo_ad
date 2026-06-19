import * as THREE from 'three';
import { Planet, PlanetConfig } from './Planet';

export interface PlanetData {
  name: string;
  orbitRadius: number;
  orbitSpeed: number;
  color: string;
  radius: number;
  hasRing?: boolean;
}

const PLANET_DATA: PlanetData[] = [
  { name: '水星', orbitRadius: 1.5, orbitSpeed: 1.60, color: '#b5a642', radius: 0.12 },
  { name: '金星', orbitRadius: 2.0, orbitSpeed: 1.18, color: '#e8cda0', radius: 0.18 },
  { name: '地球', orbitRadius: 2.8, orbitSpeed: 0.95, color: '#4b7bec', radius: 0.20 },
  { name: '火星', orbitRadius: 3.5, orbitSpeed: 0.76, color: '#c1440e', radius: 0.16 },
  { name: '木星', orbitRadius: 5.0, orbitSpeed: 0.40, color: '#d4a574', radius: 0.60 },
  { name: '土星', orbitRadius: 6.5, orbitSpeed: 0.29, color: '#ead6b8', radius: 0.50, hasRing: true },
  { name: '天王星', orbitRadius: 8.0, orbitSpeed: 0.19, color: '#7ec8e3', radius: 0.35 },
  { name: '海王星', orbitRadius: 9.5, orbitSpeed: 0.15, color: '#3b5eab', radius: 0.34 }
];

export class SolarSystem {
  public planets: Planet[] = [];
  public sun: THREE.Mesh;
  public sunLight: THREE.PointLight;
  public sunHaloParticles: THREE.Points;
  public group: THREE.Group;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.sun = this.createSun();
    this.sunLight = this.createSunLight();
    this.sun.add(this.sunLight);
    this.group.add(this.sun);

    this.sunHaloParticles = this.createSunHalo();
    this.group.add(this.sunHaloParticles);

    this.createPlanets();
    this.createStars();
  }

  private createSun(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.8, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffdd00
    });
    const sun = new THREE.Mesh(geometry, material);
    sun.position.set(0, 0, 0);
    return sun;
  }

  private createSunLight(): THREE.PointLight {
    const light = new THREE.PointLight(0xffffff, 2.0, 100, 0.5);
    light.position.set(0, 0, 0);
    light.castShadow = true;
    return light;
  }

  private createSunHalo(): THREE.Points {
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 0.9 + Math.random() * 0.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = new THREE.Color();
      color.setHSL(0.1 + Math.random() * 0.1, 1.0, 0.6 + Math.random() * 0.2);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geometry, material);
  }

  private createPlanets(): void {
    const angleStep = (Math.PI * 2) / PLANET_DATA.length;
    PLANET_DATA.forEach((data, index) => {
      const config: PlanetConfig = {
        ...data,
        initialAngle: index * angleStep
      };
      const planet = new Planet(config);
      this.planets.push(planet);
      this.group.add(planet.mesh);

      const orbitLine = planet.createOrbitLine();
      this.group.add(orbitLine);
    });
  }

  private createStars(): void {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.8
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  public update(deltaTime: number): void {
    for (const planet of this.planets) {
      planet.updatePosition(deltaTime);
    }
    this.sunHaloParticles.rotation.y += deltaTime * 0.1;
    this.sun.rotation.y += deltaTime * 0.2;
  }

  public getPlanetByIndex(index: number): Planet | null {
    if (index >= 0 && index < this.planets.length) {
      return this.planets[index];
    }
    return null;
  }

  public getPlanetByName(name: string): Planet | null {
    return this.planets.find(p => p.name === name) || null;
  }

  public getPlanetMeshes(): THREE.Mesh[] {
    return this.planets.map(p => p.mesh);
  }

  public getPlanetIndex(planet: Planet): number {
    return this.planets.indexOf(planet);
  }
}
