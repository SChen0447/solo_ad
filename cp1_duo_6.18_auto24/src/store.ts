import { create } from 'zustand'

export interface NeuronParams {
  signalStrength: number
  synapseCount: number
  transmissionDelay: number
}

interface NeuronStore extends NeuronParams {
  setSignalStrength: (value: number) => void
  setSynapseCount: (value: number) => void
  setTransmissionDelay: (value: number) => void
  resetParams: () => void
  randomizePositions: () => void
  randomizeTrigger: number
}

export const useNeuronStore = create<NeuronStore>((set) => ({
  signalStrength: 60,
  synapseCount: 30,
  transmissionDelay: 100,
  randomizeTrigger: 0,

  setSignalStrength: (value: number) => set({ signalStrength: value }),
  setSynapseCount: (value: number) => set({ synapseCount: value }),
  setTransmissionDelay: (value: number) => set({ transmissionDelay: value }),

  resetParams: () =>
    set({
      signalStrength: 60,
      synapseCount: 30,
      transmissionDelay: 100,
      randomizeTrigger: 0,
    }),

  randomizePositions: () =>
    set((state) => ({ randomizeTrigger: state.randomizeTrigger + 1 })),
}))

export const getSignalSpeed = (strength: number): number => {
  const minSpeed = 0.02
  const maxSpeed = 0.08
  return minSpeed + (strength / 100) * (maxSpeed - minSpeed)
}
