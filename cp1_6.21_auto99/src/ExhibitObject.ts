import * as THREE from 'three';
import * as Tone from 'tone';
import { ExhibitData, InstrumentType, ToneType } from './ExhibitData';

export class ExhibitObject {
  public group: THREE.Group;
  public data: ExhibitData;
  public isHovered: boolean = false;
  public isPlaying: boolean = false;
  
  private pedestal: THREE.Mesh;
  private pedestalGlow: THREE.Mesh;
  private instrumentGroup: THREE.Group;
  private rippleMesh: THREE.Mesh | null = null;
  private particles: THREE.Points | null = null;
  private particleVelocities: THREE.Vector3[] = [];
  
  private glowMinOpacity = 0.3;
  private glowMaxOpacity = 0.6;
  private rotationSpeed = 15 * (Math.PI / 180);
  
  private rippleStartTime = 0;
  private rippleDuration = 1.5;
  private isRippling = false;
  
  private synth: Tone.PolySynth | Tone.Synth | Tone.PluckSynth | null = null;
  private toneType: ToneType;
  private scheduledEvents: number[] = [];
  
  private particleCount = 50;
  private isParticleActive = false;

  constructor(data: ExhibitData) {
    this.data = data;
    this.toneType = data.toneType;
    this.group = new THREE.Group();
    
    this.pedestal = this.createPedestal();
    this.pedestalGlow = this.createPedestalGlow();
    this.instrumentGroup = this.createInstrument(data.type, data.color);
    
    this.group.add(this.pedestal);
    this.group.add(this.pedestalGlow);
    this.group.add(this.instrumentGroup);
    
    this.group.position.set(data.position.x, 0, data.position.z);
    
    this.setupTone();
  }
  
  private createPedestal(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.6, 0.6, 0.5, 32);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.2,
      metalness: 0.1,
      transmission: 0.5,
      thickness: 0.5,
      clearcoat: 1,
      clearcoatRoughness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.25;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  
  private createPedestalGlow(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.65, 0.65, 0.55, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffeedd,
      transparent: true,
      opacity: this.glowMinOpacity,
      side: THREE.BackSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.25;
    mesh.visible = false;
    return mesh;
  }
  
  private createInstrument(type: InstrumentType, color: number): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.35,
      metalness: 0.4
    });
    
    switch (type) {
      case 'violin':
        group.add(this.createViolin(material));
        break;
      case 'piano':
        group.add(this.createPiano(material));
        break;
      case 'flute':
        group.add(this.createFlute(material));
        break;
      case 'guitar':
        group.add(this.createGuitar(material));
        break;
      case 'cello':
        group.add(this.createCello(material));
        break;
      case 'harp':
        group.add(this.createHarp(material));
        break;
    }
    
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    group.position.y = 0.75;
    return group;
  }
  
  private createViolin(material: THREE.MeshStandardMaterial): THREE.Group {
    const group = new THREE.Group();
    
    const bodyGeom = new THREE.BoxGeometry(0.25, 0.08, 0.45);
    const body = new THREE.Mesh(bodyGeom, material);
    body.position.y = 0;
    group.add(body);
    
    const topGeom = new THREE.SphereGeometry(0.12, 16, 16);
    const top = new THREE.Mesh(topGeom, material);
    top.position.set(0, 0, 0.18);
    top.scale.set(1.1, 0.5, 1);
    group.add(top);
    
    const neckGeom = new THREE.CylinderGeometry(0.025, 0.03, 0.4, 12);
    const neck = new THREE.Mesh(neckGeom, material);
    neck.position.set(0, 0.02, -0.35);
    neck.rotation.x = Math.PI / 2;
    group.add(neck);
    
    const scrollGeom = new THREE.TorusGeometry(0.03, 0.015, 8, 16);
    const scroll = new THREE.Mesh(scrollGeom, material);
    scroll.position.set(0, 0.02, -0.55);
    scroll.rotation.x = Math.PI / 2;
    group.add(scroll);
    
    return group;
  }
  
  private createPiano(material: THREE.MeshStandardMaterial): THREE.Group {
    const group = new THREE.Group();
    
    const bodyGeom = new THREE.BoxGeometry(0.8, 0.15, 0.45);
    const body = new THREE.Mesh(bodyGeom, material);
    body.position.y = 0.15;
    group.add(body);
    
    const lidGeom = new THREE.BoxGeometry(0.75, 0.03, 0.42);
    const lid = new THREE.Mesh(lidGeom, material);
    lid.position.set(0, 0.28, 0.1);
    lid.rotation.x = -0.2;
    group.add(lid);
    
    const legGeom = new THREE.CylinderGeometry(0.03, 0.035, 0.25, 8);
    const positions = [
      [0.3, 0, 0.15],
      [-0.3, 0, 0.15],
      [0.3, 0, -0.15],
      [-0.3, 0, -0.15]
    ];
    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeom, material);
      leg.position.set(pos[0], 0.125, pos[2]);
      group.add(leg);
    });
    
    const keyGeom = new THREE.BoxGeometry(0.4, 0.02, 0.12);
    const keyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const keys = new THREE.Mesh(keyGeom, keyMaterial);
    keys.position.set(0, 0.23, -0.2);
    group.add(keys);
    
    return group;
  }
  
  private createFlute(material: THREE.MeshStandardMaterial): THREE.Group {
    const group = new THREE.Group();
    
    const bodyGeom = new THREE.CylinderGeometry(0.02, 0.025, 0.7, 16);
    const body = new THREE.Mesh(bodyGeom, material);
    body.rotation.z = Math.PI / 2;
    body.position.set(0.1, 0, 0);
    group.add(body);
    
    const headGeom = new THREE.CylinderGeometry(0.025, 0.03, 0.08, 16);
    const head = new THREE.Mesh(headGeom, material);
    head.rotation.z = Math.PI / 2;
    head.position.set(-0.29, 0, 0);
    group.add(head);
    
    const mouthGeom = new THREE.BoxGeometry(0.06, 0.01, 0.025);
    const mouth = new THREE.Mesh(mouthGeom, material);
    mouth.position.set(-0.25, 0.02, 0);
    mouth.rotation.x = 0.3;
    group.add(mouth);
    
    const endGeom = new THREE.CylinderGeometry(0.015, 0.02, 0.05, 16);
    const end = new THREE.Mesh(endGeom, material);
    end.rotation.z = Math.PI / 2;
    end.position.set(0.47, 0, 0);
    group.add(end);
    
    return group;
  }
  
  private createGuitar(material: THREE.MeshStandardMaterial): THREE.Group {
    const group = new THREE.Group();
    
    const bodyGeom = new THREE.SphereGeometry(0.18, 16, 16);
    const body = new THREE.Mesh(bodyGeom, material);
    body.scale.set(1, 0.3, 1.2);
    body.position.set(0, 0, -0.1);
    group.add(body);
    
    const soundholeGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24);
    const soundholeMat = new THREE.MeshStandardMaterial({ color: 0x332211 });
    const soundhole = new THREE.Mesh(soundholeGeom, soundholeMat);
    soundhole.rotation.x = Math.PI / 2;
    soundhole.position.set(0, 0.03, -0.1);
    group.add(soundhole);
    
    const neckGeom = new THREE.BoxGeometry(0.05, 0.03, 0.4);
    const neck = new THREE.Mesh(neckGeom, material);
    neck.position.set(0, 0.01, 0.25);
    group.add(neck);
    
    const headGeom = new THREE.BoxGeometry(0.1, 0.04, 0.08);
    const head = new THREE.Mesh(headGeom, material);
    head.position.set(0, 0.01, 0.47);
    group.add(head);
    
    return group;
  }
  
  private createCello(material: THREE.MeshStandardMaterial): THREE.Group {
    const group = new THREE.Group();
    
    const bodyGeom = new THREE.SphereGeometry(0.22, 16, 16);
    const body = new THREE.Mesh(bodyGeom, material);
    body.scale.set(0.8, 0.35, 1.3);
    body.position.set(0, 0.05, 0);
    group.add(body);
    
    const neckGeom = new THREE.CylinderGeometry(0.02, 0.025, 0.55, 12);
    const neck = new THREE.Mesh(neckGeom, material);
    neck.position.set(0, 0.45, 0);
    neck.rotation.z = 0.1;
    group.add(neck);
    
    const scrollGeom = new THREE.TorusGeometry(0.04, 0.018, 8, 16);
    const scroll = new THREE.Mesh(scrollGeom, material);
    scroll.position.set(0, 0.75, 0.02);
    scroll.rotation.y = Math.PI / 2;
    group.add(scroll);
    
    const endpinGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 8);
    const endpin = new THREE.Mesh(endpinGeom, material);
    endpin.position.set(0, -0.15, 0);
    group.add(endpin);
    
    return group;
  }
  
  private createHarp(material: THREE.MeshStandardMaterial): THREE.Group {
    const group = new THREE.Group();
    
    const pillarGeom = new THREE.BoxGeometry(0.04, 0.6, 0.04);
    const pillar = new THREE.Mesh(pillarGeom, material);
    pillar.position.set(-0.15, 0.15, 0);
    pillar.rotation.z = 0.1;
    group.add(pillar);
    
    const neckGeom = new THREE.BoxGeometry(0.35, 0.035, 0.04);
    const neck = new THREE.Mesh(neckGeom, material);
    neck.position.set(0.02, 0.45, 0);
    neck.rotation.z = -0.4;
    group.add(neck);
    
    const resonatorGeom = new THREE.SphereGeometry(0.25, 16, 16);
    const resonator = new THREE.Mesh(resonatorGeom, material);
    resonator.scale.set(0.5, 0.4, 0.3);
    resonator.position.set(0.1, -0.1, 0);
    group.add(resonator);
    
    const stringMat = new THREE.LineBasicMaterial({ color: 0xcccccc });
    for (let i = 0; i < 5; i++) {
      const points = [
        new THREE.Vector3(-0.1 + i * 0.03, 0.42 - i * 0.05, 0),
        new THREE.Vector3(0.05 + i * 0.02, -0.05 - i * 0.03, 0)
      ];
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geom, stringMat);
      group.add(line);
    }
    
    return group;
  }
  
  private setupTone(): void {
    switch (this.data.type) {
      case 'piano':
      case 'harp':
        this.synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: {
            attack: 0.02,
            decay: 0.3,
            sustain: 0.2,
            release: 1
          }
        }).toDestination();
        break;
      case 'flute':
      case 'violin':
      case 'cello':
        this.synth = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: {
            attack: 0.1,
            decay: 0.2,
            sustain: 0.6,
            release: 0.8
          }
        }).toDestination();
        break;
      case 'guitar':
        this.synth = new Tone.PluckSynth({
          attackNoise: 1,
          dampening: 4000,
          resonance: 0.7
        }).toDestination();
        break;
      default:
        this.synth = new Tone.Synth().toDestination();
    }
    
    if (this.synth) {
      (this.synth as Tone.Synth).volume.value = -8;
    }
  }
  
  public onHover(): void {
    if (this.isHovered) return;
    this.isHovered = true;
    this.pedestalGlow.visible = true;
  }
  
  public onHoverEnd(): void {
    this.isHovered = false;
    this.pedestalGlow.visible = false;
    const glowMat = this.pedestalGlow.material as THREE.MeshBasicMaterial;
    glowMat.opacity = this.glowMinOpacity;
  }
  
  public onClick(): void {
    this.triggerRipple();
  }
  
  private triggerRipple(): void {
    if (this.rippleMesh) {
      this.group.remove(this.rippleMesh);
      this.rippleMesh.geometry.dispose();
      (this.rippleMesh.material as THREE.Material).dispose();
    }
    
    const geometry = new THREE.RingGeometry(0.5, 0.55, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffeedd,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    this.rippleMesh = new THREE.Mesh(geometry, material);
    this.rippleMesh.rotation.x = -Math.PI / 2;
    this.rippleMesh.position.y = 0.01;
    this.group.add(this.rippleMesh);
    
    this.isRippling = true;
    this.rippleStartTime = performance.now();
  }
  
  public async playTone(): Promise<void> {
    if (this.isPlaying) return;
    
    await Tone.start();
    
    this.isPlaying = true;
    this.isParticleActive = true;
    this.createParticles();
    this.scheduledEvents = [];
    
    const now = Tone.now();
    
    switch (this.toneType) {
      case 'arpeggio':
        this.playArpeggio(now);
        break;
      case 'longnote':
        this.playLongNote(now);
        break;
      case 'scale':
        this.playScale(now);
        break;
      case 'chord':
        this.playChord(now);
        break;
      case 'pluck':
        this.playPluck(now);
        break;
      case 'strum':
        this.playStrum(now);
        break;
    }
    
    const totalDuration = this.getToneDuration();
    const stopTimer = window.setTimeout(() => {
      this.stopTone();
    }, totalDuration * 1000);
    this.scheduledEvents.push(stopTimer);
  }
  
  private getToneDuration(): number {
    switch (this.toneType) {
      case 'arpeggio': return 4;
      case 'longnote': return 3;
      case 'scale': return 3.5;
      case 'chord': return 2.5;
      case 'pluck': return 3;
      case 'strum': return 3;
      default: return 3;
    }
  }
  
  private playArpeggio(startTime: number): void {
    const notes = ['C4', 'E4', 'G4', 'C5', 'G4', 'E4'];
    const interval = 0.2;
    
    notes.forEach((note, i) => {
      const time = startTime + i * interval;
      if (this.synth instanceof Tone.PolySynth) {
        this.synth.triggerAttackRelease(note, '8n', time);
      } else if (this.synth) {
        (this.synth as Tone.Synth).triggerAttackRelease(note, '8n', time);
      }
    });
    
    for (let repeat = 1; repeat < 3; repeat++) {
      notes.forEach((note, i) => {
        const time = startTime + repeat * notes.length * interval + i * interval;
        if (this.synth instanceof Tone.PolySynth) {
          this.synth.triggerAttackRelease(note, '8n', time);
        } else if (this.synth) {
          (this.synth as Tone.Synth).triggerAttackRelease(note, '8n', time);
        }
      });
    }
  }
  
  private playLongNote(startTime: number): void {
    const note = this.data.type === 'cello' ? 'G3' : 'C5';
    if (this.synth instanceof Tone.Synth) {
      this.synth.triggerAttack(note, startTime);
      this.synth.triggerRelease(startTime + 2.5);
    } else if (this.synth instanceof Tone.PolySynth) {
      this.synth.triggerAttackRelease(note, '2n', startTime);
    }
  }
  
  private playScale(startTime: number): void {
    const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
    const interval = 0.25;
    
    notes.forEach((note, i) => {
      const time = startTime + i * interval;
      if (this.synth instanceof Tone.PolySynth) {
        this.synth.triggerAttackRelease(note, '8n', time);
      } else if (this.synth) {
        (this.synth as Tone.Synth).triggerAttackRelease(note, '8n', time);
      }
    });
    
    const descNotes = ['C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4'];
    descNotes.forEach((note, i) => {
      const time = startTime + notes.length * interval + i * interval;
      if (this.synth instanceof Tone.PolySynth) {
        this.synth.triggerAttackRelease(note, '8n', time);
      } else if (this.synth) {
        (this.synth as Tone.Synth).triggerAttackRelease(note, '8n', time);
      }
    });
  }
  
  private playChord(startTime: number): void {
    const chords = [
      ['C4', 'E4', 'G4'],
      ['F4', 'A4', 'C5'],
      ['G4', 'B4', 'D5'],
      ['C4', 'E4', 'G4']
    ];
    
    chords.forEach((chord, i) => {
      const time = startTime + i * 0.8;
      if (this.synth instanceof Tone.PolySynth) {
        this.synth.triggerAttackRelease(chord, '2n', time);
      }
    });
  }
  
  private playPluck(startTime: number): void {
    const notes = ['C4', 'E4', 'G4', 'C5', 'B4', 'G4', 'E4', 'C4'];
    const interval = 0.3;
    
    notes.forEach((note, i) => {
      const time = startTime + i * interval;
      if (this.synth instanceof Tone.PluckSynth) {
        this.synth.triggerAttackRelease(note, '8n', time);
      } else if (this.synth instanceof Tone.PolySynth) {
        this.synth.triggerAttackRelease(note, '8n', time);
      } else if (this.synth) {
        (this.synth as Tone.Synth).triggerAttackRelease(note, '8n', time);
      }
    });
  }
  
  private playStrum(startTime: number): void {
    const notes = ['E3', 'A3', 'D4', 'G4', 'B4', 'E5'];
    const interval = 0.05;
    
    notes.forEach((note, i) => {
      const time = startTime + i * interval;
      if (this.synth instanceof Tone.PolySynth) {
        this.synth.triggerAttackRelease(note, '2n', time);
      } else if (this.synth) {
        (this.synth as Tone.Synth).triggerAttackRelease(note, '2n', time);
      }
    });
  }
  
  public stopTone(): void {
    this.isPlaying = false;
    this.isParticleActive = false;
    
    this.scheduledEvents.forEach(id => clearTimeout(id));
    this.scheduledEvents = [];
    
    if (this.particles) {
      this.group.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
      this.particles = null;
      this.particleVelocities = [];
    }
  }
  
  private createParticles(): void {
    if (this.particles) return;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    
    const color = new THREE.Color(this.data.color);
    
    for (let i = 0; i < this.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.3;
      const height = Math.random() * 0.5 + 0.5;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      this.particleVelocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        Math.random() * 0.01 + 0.005,
        (Math.random() - 0.5) * 0.02
      ));
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.group.add(this.particles);
  }
  
  public update(deltaTime: number, elapsedTime: number): void {
    if (this.isHovered) {
      this.instrumentGroup.rotation.y += this.rotationSpeed * deltaTime;
      
      const glowMat = this.pedestalGlow.material as THREE.MeshBasicMaterial;
      const pulse = Math.sin(elapsedTime * 3) * 0.5 + 0.5;
      glowMat.opacity = this.glowMinOpacity + (this.glowMaxOpacity - this.glowMinOpacity) * pulse;
    }
    
    if (this.isRippling && this.rippleMesh) {
      const elapsed = (performance.now() - this.rippleStartTime) / 1000;
      const progress = elapsed / this.rippleDuration;
      
      if (progress >= 1) {
        this.isRippling = false;
        this.group.remove(this.rippleMesh);
        this.rippleMesh.geometry.dispose();
        (this.rippleMesh.material as THREE.Material).dispose();
        this.rippleMesh = null;
      } else {
        const scale = 1 + progress * 2;
        this.rippleMesh.scale.set(scale, scale, 1);
        const mat = this.rippleMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.8 * (1 - progress);
      }
    }
    
    if (this.isParticleActive && this.particles) {
      const positions = this.particles.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < this.particleCount; i++) {
        positions[i * 3] += this.particleVelocities[i].x;
        positions[i * 3 + 1] += this.particleVelocities[i].y;
        positions[i * 3 + 2] += this.particleVelocities[i].z;
        
        if (positions[i * 3 + 1] > 1.5) {
          positions[i * 3] = (Math.random() - 0.5) * 0.4;
          positions[i * 3 + 1] = 0.5;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
        }
      }
      
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }
  
  public getInstrumentMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.instrumentGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
    return meshes;
  }
  
  public getPedestalMesh(): THREE.Mesh {
    return this.pedestal;
  }
}
