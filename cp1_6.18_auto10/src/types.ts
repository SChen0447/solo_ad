import * as THREE from 'three'

export interface WindVector {
  x: number
  y: number
  z: number
  magnitude: number
  direction: number
}

export interface Particle {
  id: string
  position: THREE.Vector3
  velocity: THREE.Vector3
  age: number
  maxAge: number
  color: THREE.Color
}

export interface Building {
  id: string
  position: THREE.Vector3
  width: number
  depth: number
  height: number
  color: THREE.Color
  gridX: number
  gridZ: number
}

export interface HeatPoint {
  position: THREE.Vector3
  concentration: number
  timestamp: number
}

export interface PollutantSample {
  gridX: number
  gridZ: number
  height: number
  concentration: number
  timestamp: number
}

export interface SimulationConfig {
  windSpeed: number
  diffusionRate: number
  particleSize: number
  particleCount: number
}

export interface SimulationData {
  particles: Particle[]
  buildings: Building[]
  heatPoints: HeatPoint[]
  pollutantSamples: PollutantSample[]
  windField: WindVector[][][]
  timestamp: number
  selectedBuilding: Building | null
}

export interface ControlParams {
  windSpeed: number
  diffusionRate: number
  particleSize: number
}

export interface BuildingInfo {
  building: Building
  avgWindDirection: number
  avgWindSpeed: number
  avgPollution: number
}

export const GRID_SIZE = 10
export const CELL_SIZE = 10
export const MAX_HEIGHT = 40
export const PARTICLE_COUNT = 5000
export const HEAT_GRID_RESOLUTION = 20
