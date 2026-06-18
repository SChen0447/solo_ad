import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import { GalleryStore, Artwork } from './types';

function generateSplashTexture(index: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  const baseHue = (index * 60 + Math.random() * 30) % 360;
  gradient.addColorStop(0, `hsl(${baseHue}, 40%, 15%)`);
  gradient.addColorStop(1, `hsl(${(baseHue + 30) % 360}, 50%, 8%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const splashColors = [
    `hsl(${baseHue}, 80%, 60%)`,
    `hsl(${(baseHue + 40) % 360}, 75%, 55%)`,
    `hsl(${(baseHue + 80) % 360}, 85%, 65%)`,
    `hsl(${(baseHue + 180) % 360}, 70%, 50%)`,
    '#ffffff',
    '#ffcc00',
    '#ff3366'
  ];

  for (let i = 0; i < 25; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 20 + Math.random() * 80;
    const color = splashColors[Math.floor(Math.random() * splashColors.length)];

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7 + Math.random() * 0.3;

    for (let j = 0; j < 8; j++) {
      const angle = (j / 8) * Math.PI * 2 + Math.random() * 0.5;
      const r = radius * (0.7 + Math.random() * 0.6);
      const px = x + Math.cos(angle) * r * 0.5;
      const py = y + Math.sin(angle) * r * 0.5;
      if (j === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.quadraticCurveTo(
          x + Math.cos(angle - 0.3) * r,
          y + Math.sin(angle - 0.3) * r,
          px,
          py
        );
      }
    }
    ctx.closePath();
    ctx.fill();

    for (let d = 0; d < 5; d++) {
      const dripX = x + (Math.random() - 0.5) * radius;
      const dripY = y + radius * 0.3;
      const dripWidth = 3 + Math.random() * 8;
      const dripHeight = 10 + Math.random() * 40;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(dripX, dripY + dripHeight / 2, dripWidth, dripHeight / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 28px Arial';
  ctx.fillText(`#${index + 1}`, 30, 50);

  return canvas.toDataURL();
}

function generateArtworks(): Artwork[] {
  const artworks: Artwork[] = [];
  const ringRadius = 3;

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * ringRadius;
    const z = Math.sin(angle) * ringRadius;

    artworks.push({
      id: uuidv4(),
      index: i,
      title: `作品 #${i + 1}`,
      textureDataUrl: generateSplashTexture(i),
      position: new THREE.Vector3(x, 0.5 + 1.25, z),
      rotation: new THREE.Euler(0, -angle, 0)
    });
  }

  return artworks;
}

export const useGalleryStore = create<GalleryStore>((set) => ({
  artworks: generateArtworks(),
  selectedArtworkId: null,
  cursorState: {
    isHovering: false,
    hoveredArtworkId: null,
    isDragging: false
  },
  cameraState: {
    distance: 12,
    theta: 0,
    phi: Math.PI / 4,
    targetDistance: 12,
    targetTheta: 0,
    targetPhi: Math.PI / 4,
    velocityTheta: 0,
    velocityPhi: 0
  },
  ringRotation: 0,

  selectArtwork: (id: string | null) =>
    set({ selectedArtworkId: id }),

  setHoveredArtwork: (id: string | null) =>
    set((state) => ({
      cursorState: {
        ...state.cursorState,
        hoveredArtworkId: id,
        isHovering: id !== null
      }
    })),

  setDragging: (isDragging: boolean) =>
    set((state) => ({
      cursorState: {
        ...state.cursorState,
        isDragging
      }
    })),

  updateCamera: (updates: Partial<GalleryStore['cameraState']>) =>
    set((state) => ({
      cameraState: {
        ...state.cameraState,
        ...updates
      }
    })),

  setRingRotation: (rotation: number) =>
    set({ ringRotation: rotation })
}));
