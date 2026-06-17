import { PresetFile } from '../types';

export const defaultScene: PresetFile = {
  version: '1.0',
  sceneParams: {
    streetWidth: 24,
    floorHeight: 3.2,
    floorCount: 8,
    facadeColor: '#e8e4de',
    cornerRadius: 0.3,
    skylineOffset: 0,
    weatherPreset: 'sunny'
  },
  buildings: [
    {
      id: 'b1',
      x: -36,
      z: -15,
      floorHeight: 3.2,
      floorCount: 10,
      facadeColor: '#e8e4de',
      cornerRadius: 0.3,
      width: 12,
      depth: 15,
      windowType: 'grid',
      rotation: 0
    },
    {
      id: 'b2',
      x: -20,
      z: -15,
      floorHeight: 3.2,
      floorCount: 8,
      facadeColor: '#d4cfc8',
      cornerRadius: 0.3,
      width: 10,
      depth: 15,
      windowType: 'grid',
      rotation: 0
    },
    {
      id: 'b3',
      x: -6,
      z: -15,
      floorHeight: 3.2,
      floorCount: 12,
      facadeColor: '#e8e4de',
      cornerRadius: 0.3,
      width: 14,
      depth: 15,
      windowType: 'floor',
      rotation: 0
    },
    {
      id: 'b4',
      x: 12,
      z: -15,
      floorHeight: 3.2,
      floorCount: 6,
      facadeColor: '#c9c4bd',
      cornerRadius: 0.3,
      width: 10,
      depth: 15,
      windowType: 'grid',
      rotation: 0
    },
    {
      id: 'b5',
      x: 26,
      z: -15,
      floorHeight: 3.2,
      floorCount: 9,
      facadeColor: '#e8e4de',
      cornerRadius: 0.3,
      width: 12,
      depth: 15,
      windowType: 'floor',
      rotation: 0
    },
    {
      id: 'b6',
      x: -36,
      z: 15,
      floorHeight: 3.2,
      floorCount: 7,
      facadeColor: '#d4cfc8',
      cornerRadius: 0.3,
      width: 12,
      depth: 15,
      windowType: 'grid',
      rotation: Math.PI
    },
    {
      id: 'b7',
      x: -20,
      z: 15,
      floorHeight: 3.2,
      floorCount: 11,
      facadeColor: '#e8e4de',
      cornerRadius: 0.3,
      width: 10,
      depth: 15,
      windowType: 'floor',
      rotation: Math.PI
    },
    {
      id: 'b8',
      x: -6,
      z: 15,
      floorHeight: 3.2,
      floorCount: 5,
      facadeColor: '#c9c4bd',
      cornerRadius: 0.3,
      width: 14,
      depth: 15,
      windowType: 'grid',
      rotation: Math.PI
    },
    {
      id: 'b9',
      x: 12,
      z: 15,
      floorHeight: 3.2,
      floorCount: 13,
      facadeColor: '#e8e4de',
      cornerRadius: 0.3,
      width: 10,
      depth: 15,
      windowType: 'floor',
      rotation: Math.PI
    },
    {
      id: 'b10',
      x: 26,
      z: 15,
      floorHeight: 3.2,
      floorCount: 8,
      facadeColor: '#d4cfc8',
      cornerRadius: 0.3,
      width: 12,
      depth: 15,
      windowType: 'grid',
      rotation: Math.PI
    }
  ]
};
