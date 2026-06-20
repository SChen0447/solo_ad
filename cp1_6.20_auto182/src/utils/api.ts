import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

export interface Ingredient {
  name: string
  quantity: number
  unit: string
}

export interface Step {
  description: string
  image?: string
}

export interface Recipe {
  id: number
  name: string
  cuisine: string
  ingredients: Ingredient[]
  steps: Step[]
  image: string
  createdAt: string
}

export interface RecipeWithMatch extends Recipe {
  matchRate: number
}

export const recipeApi = {
  getRecipes: (page = 1, limit = 10) =>
    api.get<Recipe[]>('/recipes', { params: { page, limit } }).then((res) => res.data),

  getRecipe: (id: number) =>
    api.get<Recipe>(`/recipes/${id}`).then((res) => res.data),

  createRecipe: (data: Omit<Recipe, 'id' | 'createdAt'>) =>
    api.post<Recipe>('/recipes', data).then((res) => res.data),

  recommend: (ingredients: string[]) =>
    api.get<RecipeWithMatch[]>('/recommend', {
      params: { ingredients: ingredients.join(',') },
    }).then((res) => res.data),
}

export default api
