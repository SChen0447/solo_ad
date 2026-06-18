import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import {
  PlacedObject,
  LayoutScheme,
  LightParams,
  DEFAULT_LIGHT_PARAMS,
  MAX_SCHEMES,
  ObjectCategory,
  ObjectSubType,
} from './types'

interface AppState {
  selectedObjectId: string | null
  selectedLibraryItem: { category: ObjectCategory; subType: ObjectSubType } | null
  schemes: LayoutScheme[]
  activeSchemeId: string
  isTransitioning: boolean
  transitionProgress: number

  selectObject: (id: string | null) => void
  setSelectedLibraryItem: (item: { category: ObjectCategory; subType: ObjectSubType } | null) => void
  addObject: (position: [number, number, number]) => void
  removeObject: (id: string) => void
  updateObjectPosition: (id: string, position: [number, number, number]) => void
  updateLightParams: (id: string, params: Partial<LightParams>) => void
  getSelectedLightParams: () => LightParams | null

  createScheme: (name: string) => boolean
  deleteScheme: (id: string) => void
  switchScheme: (id: string) => void
  setTransitionProgress: (progress: number) => void
  setTransitioning: (value: boolean) => void
  renameScheme: (id: string, name: string) => void
}

const createDefaultScheme = (): LayoutScheme => {
  const defaultObjects: PlacedObject[] = [
    {
      id: uuidv4(),
      category: 'lamp',
      subType: 'default',
      position: [-4, 0, -4],
      lightParams: { ...DEFAULT_LIGHT_PARAMS },
      createdAt: Date.now(),
    },
    {
      id: uuidv4(),
      category: 'lamp',
      subType: 'default',
      position: [4, 0, -4],
      lightParams: { ...DEFAULT_LIGHT_PARAMS },
      createdAt: Date.now(),
    },
    {
      id: uuidv4(),
      category: 'tree',
      subType: 'sphere',
      position: [-3, 0, 2],
      createdAt: Date.now(),
    },
    {
      id: uuidv4(),
      category: 'tree',
      subType: 'cone',
      position: [3, 0, 3],
      createdAt: Date.now(),
    },
    {
      id: uuidv4(),
      category: 'bench',
      subType: 'long',
      position: [0, 0, -2],
      createdAt: Date.now(),
    },
  ]

  return {
    id: uuidv4(),
    name: '默认方案',
    objects: defaultObjects,
    createdAt: Date.now(),
  }
}

const useAppStore = create<AppState>((set, get) => {
  const defaultScheme = createDefaultScheme()

  return {
    selectedObjectId: null,
    selectedLibraryItem: null,
    schemes: [defaultScheme],
    activeSchemeId: defaultScheme.id,
    isTransitioning: false,
    transitionProgress: 1,

    selectObject: (id) => set({ selectedObjectId: id, selectedLibraryItem: null }),
    setSelectedLibraryItem: (item) => set({ selectedLibraryItem: item, selectedObjectId: null }),

    addObject: (position) => {
      const { selectedLibraryItem, schemes, activeSchemeId } = get()
      if (!selectedLibraryItem) return

      const newObject: PlacedObject = {
        id: uuidv4(),
        category: selectedLibraryItem.category,
        subType: selectedLibraryItem.subType,
        position,
        lightParams:
          selectedLibraryItem.category === 'lamp' ? { ...DEFAULT_LIGHT_PARAMS } : undefined,
        createdAt: Date.now(),
      }

      set({
        schemes: schemes.map((s) =>
          s.id === activeSchemeId ? { ...s, objects: [...s.objects, newObject] } : s,
        ),
        selectedObjectId: newObject.id,
        selectedLibraryItem: null,
      })
    },

    removeObject: (id) => {
      const { schemes, activeSchemeId, selectedObjectId } = get()
      set({
        schemes: schemes.map((s) =>
          s.id === activeSchemeId ? { ...s, objects: s.objects.filter((o) => o.id !== id) } : s,
        ),
        selectedObjectId: selectedObjectId === id ? null : selectedObjectId,
      })
    },

    updateObjectPosition: (id, position) => {
      const { schemes, activeSchemeId } = get()
      set({
        schemes: schemes.map((s) =>
          s.id === activeSchemeId
            ? {
                ...s,
                objects: s.objects.map((o) => (o.id === id ? { ...o, position } : o)),
              }
            : s,
        ),
      })
    },

    updateLightParams: (id, params) => {
      const { schemes, activeSchemeId } = get()
      set({
        schemes: schemes.map((s) =>
          s.id === activeSchemeId
            ? {
                ...s,
                objects: s.objects.map((o) =>
                  o.id === id
                    ? {
                        ...o,
                        lightParams: o.lightParams
                          ? { ...o.lightParams, ...params }
                          : undefined,
                      }
                    : o,
                ),
              }
            : s,
        ),
      })
    },

    getSelectedLightParams: () => {
      const { selectedObjectId, schemes, activeSchemeId } = get()
      const scheme = schemes.find((s) => s.id === activeSchemeId)
      const obj = scheme?.objects.find((o) => o.id === selectedObjectId)
      return obj?.lightParams || null
    },

    createScheme: (name) => {
      const { schemes, activeSchemeId } = get()
      if (schemes.length >= MAX_SCHEMES) return false

      const currentScheme = schemes.find((s) => s.id === activeSchemeId)
      const newScheme: LayoutScheme = {
        id: uuidv4(),
        name,
        objects: currentScheme
          ? currentScheme.objects.map((o) => ({
              ...o,
              id: uuidv4(),
              lightParams: o.lightParams ? { ...o.lightParams } : undefined,
              createdAt: Date.now(),
            }))
          : [],
        createdAt: Date.now(),
      }

      set({
        schemes: [...schemes, newScheme],
        activeSchemeId: newScheme.id,
      })
      return true
    },

    deleteScheme: (id) => {
      const { schemes } = get()
      if (schemes.length <= 1) return

      const newSchemes = schemes.filter((s) => s.id !== id)
      set({
        schemes: newSchemes,
        activeSchemeId: newSchemes[0].id,
      })
    },

    switchScheme: (id) => {
      const { isTransitioning } = get()
      if (isTransitioning) return
      set({ activeSchemeId: id })
    },

    setTransitionProgress: (progress) => set({ transitionProgress: progress }),
    setTransitioning: (value) => set({ isTransitioning: value }),

    renameScheme: (id, name) => {
      const { schemes } = get()
      set({
        schemes: schemes.map((s) => (s.id === id ? { ...s, name } : s)),
      })
    },
  }
})

export default useAppStore
