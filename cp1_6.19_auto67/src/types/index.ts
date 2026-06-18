export enum MaterialType {
  ELEMENT = 'element',
  METAL = 'metal',
  ORGANIC = 'organic',
  GEM = 'gem',
  SPECIAL = 'special',
  PRODUCT = 'product'
}

export interface Material {
  id: string
  name: string
  icon: string
  type: MaterialType
  description: string
  color: string
}

export interface RecipeSlot {
  materialId: string
  quantity: number
  slotIndex?: number
}

export interface Recipe {
  id: string
  name: string
  outputId: string
  outputQuantity: number
  pattern: (RecipeSlot | null)[]
  description: string
  parentIds: string[]
}

export interface CraftRecord {
  id: string
  recipeId: string
  timestamp: number
  quantity: number
}

export interface RecipeTreeNode {
  itemId: string
  isMaterial: boolean
  children: RecipeTreeNode[]
  expanded: boolean
}

export interface AnimationState {
  isCrafting: boolean
  isSuccess: boolean | null
  lastUnlockedRecipeId: string | null
  showUnlockGlow: boolean
  currentCraftingStep: number
}

export interface BatchCraftState {
  isOpen: boolean
  recipeId: string | null
}

export interface MaterialRequirement {
  materialId: string
  required: number
  available: number
  isInsufficient: boolean
}
