import { create } from 'zustand'
import * as THREE from 'three'
import { v4 as uuidv4 } from 'uuid'
import type { NodeData, NodeType, SimParams } from './types'

interface StoreState {
  nodes: NodeData[]
  params: SimParams
  selectedNodeIds: Set<string>
  isDragging: boolean
  animationTime: number

  addNode: (type: NodeType, position: THREE.Vector3) => void
  removeNode: (id: string) => void
  removeNodes: (ids: string[]) => void
  updateNodePosition: (id: string, position: THREE.Vector3) => void
  updateNodeVelocity: (id: string, velocity: THREE.Vector3) => void
  applyVelocities: (deltaTime: number, damping: number) => void

  setParams: (params: Partial<SimParams>) => void
  resetSimulation: () => void

  toggleNodeSelection: (id: string, multiSelect?: boolean) => void
  clearSelection: () => void
  deleteSelected: () => void

  setDragging: (isDragging: boolean) => void
  setAnimationTime: (time: number) => void
}

const defaultParams: SimParams = {
  gravityConstant: 1.5,
  repulsionCoefficient: 1.0,
  gridResolution: 25,
}

const createInitialNodes = (): NodeData[] => {
  const nodes: NodeData[] = []
  const types: NodeType[] = ['positive', 'negative', 'repulsive']
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2
    const radius = 3
    nodes.push({
      id: uuidv4(),
      type: types[i % 3],
      position: new THREE.Vector3(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 2,
        Math.sin(angle) * radius
      ),
      mass: types[i % 3] === 'positive' ? 2 : types[i % 3] === 'negative' ? -2 : 0,
      charge: types[i % 3] === 'repulsive' ? 1.5 : 0,
      velocity: new THREE.Vector3(),
      createdAt: performance.now(),
    })
  }
  return nodes
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpVector = (a: THREE.Vector3, b: THREE.Vector3, t: number) =>
  new THREE.Vector3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t))

export const useStore = create<StoreState>((set, get) => ({
  nodes: createInitialNodes(),
  params: { ...defaultParams },
  selectedNodeIds: new Set(),
  isDragging: false,
  animationTime: 0,

  addNode: (type, position) => {
    const mass = type === 'positive' ? 2.5 : type === 'negative' ? -2.5 : 0
    const charge = type === 'repulsive' ? 2 : 0
    set((state) => ({
      nodes: [
        ...state.nodes,
        {
          id: uuidv4(),
          type,
          position: position.clone(),
          mass,
          charge,
          velocity: new THREE.Vector3(),
          createdAt: performance.now(),
        },
      ],
    }))
  },

  removeNode: (id) => {
    set((state) => {
      const newSelected = new Set(state.selectedNodeIds)
      newSelected.delete(id)
      return {
        nodes: state.nodes.filter((n) => n.id !== id),
        selectedNodeIds: newSelected,
      }
    })
  },

  removeNodes: (ids) => {
    set((state) => {
      const idSet = new Set(ids)
      const newSelected = new Set(state.selectedNodeIds)
      ids.forEach((id) => newSelected.delete(id))
      return {
        nodes: state.nodes.filter((n) => !idSet.has(n.id)),
        selectedNodeIds: newSelected,
      }
    })
  },

  updateNodePosition: (id, position) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, position: position.clone() } : n
      ),
    }))
  },

  updateNodeVelocity: (id, velocity) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, velocity: velocity.clone() } : n
      ),
    }))
  },

  applyVelocities: (deltaTime, damping) => {
    const { nodes, isDragging } = get()
    if (isDragging || nodes.length < 2) return

    set((state) => ({
      nodes: state.nodes.map((n) => {
        const damped = n.velocity.clone().multiplyScalar(Math.pow(damping, deltaTime * 60))
        const newPos = n.position.clone().add(damped.clone().multiplyScalar(deltaTime))

        const boundary = 12
        const softBound = 10
        const dist = newPos.length()
        if (dist > softBound) {
          const push = (dist - softBound) / (boundary - softBound)
          const pushBack = newPos.clone().normalize().multiplyScalar(-push * 0.5)
          newPos.add(pushBack)
          damped.multiplyScalar(0.9)
        }

        return {
          ...n,
          position: newPos,
          velocity: damped,
        }
      }),
    }))
  },

  setParams: (newParams) => {
    set((state) => ({
      params: { ...state.params, ...newParams },
    }))
  },

  resetSimulation: () => {
    set({
      nodes: createInitialNodes(),
      selectedNodeIds: new Set(),
      params: { ...defaultParams },
    })
  },

  toggleNodeSelection: (id, multiSelect = false) => {
    set((state) => {
      const newSet = new Set(multiSelect ? state.selectedNodeIds : [])
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return { selectedNodeIds: newSet }
    })
  },

  clearSelection: () => set({ selectedNodeIds: new Set() }),

  deleteSelected: () => {
    const { selectedNodeIds } = get()
    if (selectedNodeIds.size > 0) {
      get().removeNodes(Array.from(selectedNodeIds))
    }
  },

  setDragging: (isDragging) => set({ isDragging }),
  setAnimationTime: (time) => set({ animationTime: time }),
}))
