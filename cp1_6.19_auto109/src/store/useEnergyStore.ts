import { create } from 'zustand'
import { Device, getDevices, addDevice as addDeviceUtil, updateDevice as updateDeviceUtil, deleteDevice as deleteDeviceUtil } from '@/data/devices'

interface EnergyStore {
  devices: Device[]
  selectedDeviceId: string | null
  setSelectedDeviceId: (id: string | null) => void
  loadDevices: () => void
  addDevice: (name: string, power: number, dailyHours: number) => void
  updateDevice: (id: string, data: Partial<Pick<Device, 'name' | 'power' | 'dailyHours'>>) => void
  deleteDevice: (id: string) => void
}

export const useEnergyStore = create<EnergyStore>((set) => ({
  devices: [],
  selectedDeviceId: null,
  setSelectedDeviceId: (id) => set({ selectedDeviceId: id }),
  loadDevices: () => set({ devices: getDevices() }),
  addDevice: (name, power, dailyHours) =>
    set((state) => ({ devices: addDeviceUtil(name, power, dailyHours, state.devices) })),
  updateDevice: (id, data) =>
    set((state) => ({ devices: updateDeviceUtil(id, data, state.devices) })),
  deleteDevice: (id) =>
    set((state) => ({ devices: deleteDeviceUtil(id, state.devices) })),
}))
