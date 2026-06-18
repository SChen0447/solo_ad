import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface StoryOption {
  id: string
  text: string
  targetNodeId: string | null
  condition: string
}

export interface StoryNode {
  id: string
  title: string
  content: string
  x: number
  y: number
  options: StoryOption[]
}

export interface Connection {
  id: string
  fromNodeId: string
  fromOptionId: string | null
  toNodeId: string
}

interface StoryState {
  nodes: StoryNode[]
  connections: Connection[]
  selectedNodeId: string | null
  selectedConnectionId: string | null
  isPreviewMode: boolean
  previewNodeId: string | null
  previewVariables: Record<string, string | boolean | number>

  addNode: (x: number, y: number) => string
  updateNode: (id: string, updates: Partial<StoryNode>) => void
  deleteNode: (id: string) => void
  selectNode: (id: string | null) => void

  addOption: (nodeId: string) => void
  updateOption: (nodeId: string, optionId: string, updates: Partial<StoryOption>) => void
  deleteOption: (nodeId: string, optionId: string) => void

  addConnection: (fromNodeId: string, toNodeId: string, fromOptionId?: string | null) => void
  deleteConnection: (id: string) => void
  selectConnection: (id: string | null) => void

  setPreviewMode: (enabled: boolean) => void
  setPreviewNode: (nodeId: string | null) => void
  setPreviewVariable: (key: string, value: string | boolean | number) => void
  evaluateCondition: (condition: string) => boolean
}

export const useStoryStore = create<StoryState>((set, get) => ({
  nodes: [],
  connections: [],
  selectedNodeId: null,
  selectedConnectionId: null,
  isPreviewMode: false,
  previewNodeId: null,
  previewVariables: {},

  addNode: (x: number, y: number) => {
    const id = uuidv4()
    const newNode: StoryNode = {
      id,
      title: '新节点',
      content: '',
      x,
      y,
      options: [],
    }
    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: id,
    }))
    return id
  },

  updateNode: (id: string, updates: Partial<StoryNode>) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...updates } : node
      ),
    }))
  },

  deleteNode: (id: string) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      connections: state.connections.filter(
        (conn) => conn.fromNodeId !== id && conn.toNodeId !== id
      ),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }))
  },

  selectNode: (id: string | null) => {
    set({ selectedNodeId: id, selectedConnectionId: null })
  },

  addOption: (nodeId: string) => {
    const optionId = uuidv4()
    const newOption: StoryOption = {
      id: optionId,
      text: '新选项',
      targetNodeId: null,
      condition: '',
    }
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, options: [...node.options, newOption] }
          : node
      ),
    }))
  },

  updateOption: (nodeId: string, optionId: string, updates: Partial<StoryOption>) => {
    set((state) => {
      const nodes = state.nodes.map((node) => {
        if (node.id !== nodeId) return node
        return {
          ...node,
          options: node.options.map((opt) =>
            opt.id === optionId ? { ...opt, ...updates } : opt
          ),
        }
      })

      let connections = state.connections
      if (updates.targetNodeId !== undefined) {
        const existingConn = state.connections.find(
          (c) => c.fromNodeId === nodeId && c.fromOptionId === optionId
        )
        if (existingConn && updates.targetNodeId === null) {
          connections = state.connections.filter((c) => c.id !== existingConn.id)
        } else if (existingConn && updates.targetNodeId) {
          connections = state.connections.map((c) =>
            c.id === existingConn.id
              ? { ...c, toNodeId: updates.targetNodeId as string }
              : c
          )
        } else if (!existingConn && updates.targetNodeId) {
          connections = [
            ...state.connections,
            {
              id: uuidv4(),
              fromNodeId: nodeId,
              fromOptionId: optionId,
              toNodeId: updates.targetNodeId as string,
            },
          ]
        }
      }

      return { nodes, connections }
    })
  },

  deleteOption: (nodeId: string, optionId: string) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, options: node.options.filter((o) => o.id !== optionId) }
          : node
      ),
      connections: state.connections.filter(
        (c) => !(c.fromNodeId === nodeId && c.fromOptionId === optionId)
      ),
    }))
  },

  addConnection: (
    fromNodeId: string,
    toNodeId: string,
    fromOptionId: string | null = null
  ) => {
    const { connections } = get()
    const exists = connections.some(
      (c) =>
        c.fromNodeId === fromNodeId &&
        c.toNodeId === toNodeId &&
        c.fromOptionId === fromOptionId
    )
    if (exists) return

    set((state) => ({
      connections: [
        ...state.connections,
        {
          id: uuidv4(),
          fromNodeId,
          fromOptionId,
          toNodeId,
        },
      ],
    }))
  },

  deleteConnection: (id: string) => {
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
      selectedConnectionId:
        state.selectedConnectionId === id ? null : state.selectedConnectionId,
    }))
  },

  selectConnection: (id: string | null) => {
    set({ selectedConnectionId: id, selectedNodeId: null })
  },

  setPreviewMode: (enabled: boolean) => {
    const { selectedNodeId } = get()
    set({
      isPreviewMode: enabled,
      previewNodeId: enabled ? selectedNodeId : null,
      previewVariables: enabled ? {} : get().previewVariables,
    })
  },

  setPreviewNode: (nodeId: string | null) => {
    set({ previewNodeId: nodeId })
  },

  setPreviewVariable: (key: string, value: string | boolean | number) => {
    set((state) => ({
      previewVariables: { ...state.previewVariables, [key]: value },
    }))
  },

  evaluateCondition: (condition: string): boolean => {
    if (!condition.trim()) return true
    const { previewVariables } = get()

    try {
      const parts = condition.split('=')
      if (parts.length === 2) {
        const key = parts[0].trim()
        const valueStr = parts[1].trim()
        const actualValue = previewVariables[key]

        if (valueStr === 'true') return actualValue === true
        if (valueStr === 'false') return actualValue === false
        if (!isNaN(Number(valueStr))) return actualValue === Number(valueStr)
        return actualValue === valueStr
      }
      return true
    } catch {
      return true
    }
  },
}))
