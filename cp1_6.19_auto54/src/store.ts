import { create } from 'zustand'

interface DiffractionState {
  rotationAngle: number
  tiltAngle: number
  incidentAngle: number
  setRotationAngle: (value: number) => void
  setTiltAngle: (value: number) => void
  setIncidentAngle: (value: number) => void
  reset: () => void
}

export const useDiffractionStore = create<DiffractionState>((set) => ({
  rotationAngle: 45,
  tiltAngle: 30,
  incidentAngle: 30,
  setRotationAngle: (value) => set({ rotationAngle: value }),
  setTiltAngle: (value) => set({ tiltAngle: value }),
  setIncidentAngle: (value) => set({ incidentAngle: value }),
  reset: () => set({
    rotationAngle: 45,
    tiltAngle: 30,
    incidentAngle: 30,
  }),
}))
