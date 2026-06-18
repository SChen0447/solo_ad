import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import {
  Material,
  Recipe,
  RecipeSlot,
  CraftRecord,
  RecipeTreeNode,
  AnimationState,
  BatchCraftState
} from '../types'
import { MATERIALS, RECIPES, INITIAL_INVENTORY } from '../data/mockData'
import {
  fastMatchRecipe,
  buildRecipePatternMap,
  getRecipeMaterialRequirements,
  checkInventorySufficient
} from '../utils/recipeMatcher'

interface RecipeStore {
  materials: Material[]
  inventory: Record<string, number>
  craftingSlots: (RecipeSlot | null)[]
  allRecipes: Recipe[]
  unlockedRecipeIds: Set<string>
  recipeTree: RecipeTreeNode[]
  craftHistory: CraftRecord[]
  searchKeyword: string
  isRecipeBookOpen: boolean
  batchCraftState: BatchCraftState
  animationState: AnimationState
  lastCraftedOutputId: string | null
  lastCraftedQuantity: number
  patternMap: Map<string, Recipe>

  setSearchKeyword: (keyword: string) => void
  setCraftingSlot: (index: number, slot: RecipeSlot | null) => void
  clearAllSlots: () => void
  craft: () => { success: boolean; recipeId?: string; isNewUnlock?: boolean }
  batchCraft: (recipeId: string, times: number) => Promise<boolean>
  addMaterial: (itemId: string, quantity: number) => void
  removeMaterial: (itemId: string, quantity: number) => boolean
  unlockRecipe: (recipeId: string) => void
  toggleRecipeBook: () => void
  openBatchCraft: (recipeId: string) => void
  closeBatchCraft: () => void
  toggleTreeNode: (itemId: string) => void
  getMaterialById: (id: string) => Material | undefined
  getRecipeById: (id: string) => Recipe | undefined
  clearAnimationState: () => void
  clearUnlockGlow: () => void
  checkCanCraft: (recipe: Recipe, times?: number) => {
    sufficient: boolean
    requirements: Map<string, { required: number; available: number }>
  }
}

function buildRecipeTree(
  materials: Material[],
  recipes: Recipe[],
  unlockedIds: Set<string>
): RecipeTreeNode[] {
  const itemToNode = new Map<string, RecipeTreeNode>()

  for (const mat of materials) {
    if (mat.type !== 'product') {
      itemToNode.set(mat.id, {
        itemId: mat.id,
        isMaterial: true,
        children: [],
        expanded: true
      })
    }
  }

  for (const recipe of recipes) {
    if (unlockedIds.has(recipe.id)) {
      const outputNode: RecipeTreeNode = {
        itemId: recipe.outputId,
        isMaterial: false,
        children: [],
        expanded: true
      }
      itemToNode.set(recipe.outputId, outputNode)
    }
  }

  const roots: RecipeTreeNode[] = []
  const childrenSet = new Set<string>()

  for (const recipe of recipes) {
    if (unlockedIds.has(recipe.id)) {
      const outputNode = itemToNode.get(recipe.outputId)
      if (!outputNode) continue

      for (const parentId of recipe.parentIds) {
        const parentNode = itemToNode.get(parentId)
        if (parentNode) {
          if (!parentNode.children.find(c => c.itemId === outputNode.itemId)) {
            parentNode.children.push(outputNode)
          }
          childrenSet.add(outputNode.itemId)
        }
      }

      const allParentsMissing = recipe.parentIds.every(
        pid => !itemToNode.has(pid) || !unlockedIds.has(
          recipes.find(r => r.outputId === pid)?.id || ''
        ) && itemToNode.get(pid)?.isMaterial
      )
      if (allParentsMissing && !childrenSet.has(outputNode.itemId)) {
        const materialOfOutput = materials.find(m => m.id === recipe.outputId)
        if (!materialOfOutput || materialOfOutput.type === 'product') {
          if (!roots.find(r => r.itemId === outputNode.itemId)) {
            roots.push(outputNode)
          }
          childrenSet.add(outputNode.itemId)
        }
      }
    }
  }

  for (const [id, node] of itemToNode) {
    if (!childrenSet.has(id) && !roots.find(r => r.itemId === id)) {
      roots.push(node)
    }
  }

  return roots.length > 0 ? roots : Array.from(itemToNode.values())
}

export const useRecipeStore = create<RecipeStore>((set, get) => {
  const initialPatternMap = buildRecipePatternMap(RECIPES)
  const initialUnlockedIds = new Set<string>()
  const initialTree = buildRecipeTree(MATERIALS, RECIPES, initialUnlockedIds)

  return {
    materials: MATERIALS,
    inventory: { ...INITIAL_INVENTORY },
    craftingSlots: Array(9).fill(null),
    allRecipes: RECIPES,
    unlockedRecipeIds: initialUnlockedIds,
    recipeTree: initialTree,
    craftHistory: [],
    searchKeyword: '',
    isRecipeBookOpen: false,
    batchCraftState: {
      isOpen: false,
      recipeId: null
    },
    animationState: {
      isCrafting: false,
      isSuccess: null,
      lastUnlockedRecipeId: null,
      showUnlockGlow: false,
      currentCraftingStep: 0
    },
    lastCraftedOutputId: null,
    lastCraftedQuantity: 0,
    patternMap: initialPatternMap,

    setSearchKeyword: (keyword: string) => {
      set({ searchKeyword: keyword })
    },

    setCraftingSlot: (index: number, slot: RecipeSlot | null) => {
      const state = get()
      const newSlots = [...state.craftingSlots]

      if (slot !== null) {
        const available = state.inventory[slot.materialId] || 0
        const existingInSlots = state.craftingSlots.reduce((sum, s) => {
          if (s && s.materialId === slot.materialId) return sum + s.quantity
          return sum
        }, 0)
        const existingInCurrent = newSlots[index]?.materialId === slot.materialId
          ? (newSlots[index]?.quantity || 0)
          : 0
        const canPlace = (available - existingInSlots + existingInCurrent) >= slot.quantity
        if (!canPlace) return
      }

      newSlots[index] = slot
      set({ craftingSlots: newSlots })
    },

    clearAllSlots: () => {
      set({ craftingSlots: Array(9).fill(null) })
    },

    craft: () => {
      const state = get()
      const slots = state.craftingSlots

      const hasAnyMaterial = slots.some(s => s !== null)
      if (!hasAnyMaterial || state.animationState.isCrafting) {
        return { success: false }
      }

      const recipe = fastMatchRecipe(slots, state.patternMap)
      if (!recipe) {
        set({
          animationState: {
            ...state.animationState,
            isCrafting: true,
            isSuccess: false
          }
        })
        setTimeout(() => {
          const s = get()
          set({
            animationState: {
              ...s.animationState,
              isCrafting: false,
              isSuccess: null
            }
          })
        }, 300)
        return { success: false }
      }

      const requirements = getRecipeMaterialRequirements(recipe, 1)
      const { sufficient } = checkInventorySufficient(requirements, state.inventory)
      if (!sufficient) {
        return { success: false }
      }

      const newInventory = { ...state.inventory }
      for (const [matId, qty] of requirements) {
        newInventory[matId] = (newInventory[matId] || 0) - qty
      }
      newInventory[recipe.outputId] = (newInventory[recipe.outputId] || 0) + recipe.outputQuantity

      const isNewUnlock = !state.unlockedRecipeIds.has(recipe.id)
      const newUnlockedIds = new Set(state.unlockedRecipeIds)
      let newTree = state.recipeTree

      if (isNewUnlock) {
        newUnlockedIds.add(recipe.id)
        newTree = buildRecipeTree(state.materials, state.allRecipes, newUnlockedIds)
      }

      const record: CraftRecord = {
        id: uuidv4(),
        recipeId: recipe.id,
        timestamp: Date.now(),
        quantity: recipe.outputQuantity
      }

      set({
        inventory: newInventory,
        craftingSlots: Array(9).fill(null),
        unlockedRecipeIds: newUnlockedIds,
        recipeTree: newTree,
        craftHistory: [...state.craftHistory, record],
        lastCraftedOutputId: recipe.outputId,
        lastCraftedQuantity: recipe.outputQuantity,
        animationState: {
          ...state.animationState,
          isCrafting: true,
          isSuccess: true,
          lastUnlockedRecipeId: isNewUnlock ? recipe.id : null,
          showUnlockGlow: isNewUnlock
        }
      })

      if (isNewUnlock) {
        setTimeout(() => {
          const s = get()
          set({
            animationState: {
              ...s.animationState,
              showUnlockGlow: false
            }
          })
        }, 1200)
      }

      setTimeout(() => {
        const s = get()
        set({
          animationState: {
            ...s.animationState,
            isCrafting: false,
            isSuccess: null,
            lastUnlockedRecipeId: null
          }
        })
      }, 1200)

      return { success: true, recipeId: recipe.id, isNewUnlock }
    },

    batchCraft: async (recipeId: string, times: number): Promise<boolean> => {
      const state = get()
      const recipe = state.allRecipes.find(r => r.id === recipeId)
      if (!recipe || times <= 0 || state.animationState.isCrafting) {
        return false
      }

      const requirements = getRecipeMaterialRequirements(recipe, times)
      const { sufficient } = checkInventorySufficient(requirements, state.inventory)
      if (!sufficient) return false

      set({
        animationState: {
          ...state.animationState,
          isCrafting: true,
          isSuccess: true,
          currentCraftingStep: 0
        }
      })

      const stepDelay = 200
      for (let i = 0; i < times; i++) {
        await new Promise<void>(resolve => {
          setTimeout(() => {
            const s = get()
            set({
              animationState: {
                ...s.animationState,
                currentCraftingStep: i + 1
              }
            })
            resolve()
          }, stepDelay)
        })
      }

      await new Promise<void>(resolve => setTimeout(resolve, 200))

      const finalState = get()
      const newInventory = { ...finalState.inventory }
      for (const [matId, qty] of requirements) {
        newInventory[matId] = (newInventory[matId] || 0) - qty
      }
      const totalOutput = recipe.outputQuantity * times
      newInventory[recipe.outputId] = (newInventory[recipe.outputId] || 0) + totalOutput

      const isNewUnlock = !finalState.unlockedRecipeIds.has(recipe.id)
      const newUnlockedIds = new Set(finalState.unlockedRecipeIds)
      let newTree = finalState.recipeTree
      if (isNewUnlock) {
        newUnlockedIds.add(recipe.id)
        newTree = buildRecipeTree(finalState.materials, finalState.allRecipes, newUnlockedIds)
      }

      const record: CraftRecord = {
        id: uuidv4(),
        recipeId: recipe.id,
        timestamp: Date.now(),
        quantity: totalOutput
      }

      set({
        inventory: newInventory,
        unlockedRecipeIds: newUnlockedIds,
        recipeTree: newTree,
        craftHistory: [...finalState.craftHistory, record],
        lastCraftedOutputId: recipe.outputId,
        lastCraftedQuantity: totalOutput,
        batchCraftState: { isOpen: false, recipeId: null },
        animationState: {
          ...finalState.animationState,
          isCrafting: false,
          isSuccess: null,
          currentCraftingStep: 0,
          lastUnlockedRecipeId: isNewUnlock ? recipe.id : null,
          showUnlockGlow: isNewUnlock
        }
      })

      if (isNewUnlock) {
        setTimeout(() => {
          const s = get()
          set({
            animationState: {
              ...s.animationState,
              showUnlockGlow: false,
              lastUnlockedRecipeId: null
            }
          })
        }, 1200)
      }

      return true
    },

    addMaterial: (itemId: string, quantity: number) => {
      const state = get()
      set({
        inventory: {
          ...state.inventory,
          [itemId]: (state.inventory[itemId] || 0) + quantity
        }
      })
    },

    removeMaterial: (itemId: string, quantity: number): boolean => {
      const state = get()
      const available = state.inventory[itemId] || 0
      if (available < quantity) return false
      set({
        inventory: {
          ...state.inventory,
          [itemId]: available - quantity
        }
      })
      return true
    },

    unlockRecipe: (recipeId: string) => {
      const state = get()
      if (state.unlockedRecipeIds.has(recipeId)) return
      const newUnlockedIds = new Set(state.unlockedRecipeIds)
      newUnlockedIds.add(recipeId)
      const newTree = buildRecipeTree(state.materials, state.allRecipes, newUnlockedIds)
      set({
        unlockedRecipeIds: newUnlockedIds,
        recipeTree: newTree
      })
    },

    toggleRecipeBook: () => {
      const state = get()
      set({ isRecipeBookOpen: !state.isRecipeBookOpen })
    },

    openBatchCraft: (recipeId: string) => {
      set({
        batchCraftState: {
          isOpen: true,
          recipeId
        }
      })
    },

    closeBatchCraft: () => {
      set({
        batchCraftState: {
          isOpen: false,
          recipeId: null
        }
      })
    },

    toggleTreeNode: (itemId: string) => {
      const state = get()
      const toggleNode = (nodes: RecipeTreeNode[]): RecipeTreeNode[] => {
        return nodes.map(node => {
          if (node.itemId === itemId) {
            return { ...node, expanded: !node.expanded }
          }
          if (node.children.length > 0) {
            return { ...node, children: toggleNode(node.children) }
          }
          return node
        })
      }
      set({ recipeTree: toggleNode(state.recipeTree) })
    },

    getMaterialById: (id: string) => {
      return get().materials.find(m => m.id === id)
    },

    getRecipeById: (id: string) => {
      return get().allRecipes.find(r => r.id === id)
    },

    clearAnimationState: () => {
      const state = get()
      set({
        animationState: {
          ...state.animationState,
          isCrafting: false,
          isSuccess: null,
          currentCraftingStep: 0
        }
      })
    },

    clearUnlockGlow: () => {
      const state = get()
      set({
        animationState: {
          ...state.animationState,
          showUnlockGlow: false,
          lastUnlockedRecipeId: null
        }
      })
    },

    checkCanCraft: (recipe: Recipe, times: number = 1) => {
      const state = get()
      const req = getRecipeMaterialRequirements(recipe, times)
      const requirements = new Map<string, { required: number; available: number }>()
      let sufficient = true

      for (const [matId, required] of req) {
        const available = state.inventory[matId] || 0
        if (available < required) sufficient = false
        requirements.set(matId, { required, available })
      }

      return { sufficient, requirements }
    }
  }
})
