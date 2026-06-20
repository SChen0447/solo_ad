import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import type { Recipe, ShoppingItem, ActivityLog, OptimizationResult, Collaborator, User } from '@/types';

const API_BASE = '/api';

const httpClient = axios.create({
  baseURL: API_BASE,
  timeout: 5000
});

class ApiService {
  private socket: Socket | null = null;
  private projectId: string = 'default';
  private currentUser: User | null = null;

  setProjectId(projectId: string) {
    this.projectId = projectId;
  }

  setUser(user: User) {
    this.currentUser = user;
  }

  async getProject(projectId: string) {
    const response = await httpClient.get(`/projects/${projectId}`);
    return response.data;
  }

  async getRecipes(projectId: string): Promise<Recipe[]> {
    const response = await httpClient.get(`/projects/${projectId}/recipes`);
    return response.data;
  }

  async addRecipe(projectId: string, recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Promise<Recipe> {
    const response = await httpClient.post(`/projects/${projectId}/recipes`, recipe);
    return response.data;
  }

  async updateRecipe(projectId: string, recipeId: string, recipe: Partial<Recipe>): Promise<Recipe> {
    const response = await httpClient.put(`/projects/${projectId}/recipes/${recipeId}`, recipe);
    return response.data;
  }

  async deleteRecipe(projectId: string, recipeId: string): Promise<{ success: boolean }> {
    const response = await httpClient.delete(`/projects/${projectId}/recipes/${recipeId}`);
    return response.data;
  }

  async getShoppingList(projectId: string): Promise<ShoppingItem[]> {
    const response = await httpClient.get(`/projects/${projectId}/shopping-list`);
    return response.data;
  }

  async optimizeShoppingList(projectId: string, items: ShoppingItem[]): Promise<OptimizationResult> {
    const response = await httpClient.post(`/projects/${projectId}/optimize`, { items });
    return response.data;
  }

  async getLogs(projectId: string): Promise<ActivityLog[]> {
    const response = await httpClient.get(`/projects/${projectId}/logs`);
    return response.data;
  }

  connectWebSocket(projectId: string, user: User) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io({
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.socket?.emit('join_project', { projectId, user });
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return this.socket;
  }

  disconnectWebSocket() {
    if (this.socket) {
      this.socket.emit('leave_project', { 
        projectId: this.projectId, 
        userId: this.currentUser?.id 
      });
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emitCursorUpdate(recipeId: string, position: number) {
    if (this.socket && this.currentUser) {
      this.socket.emit('cursor_update', {
        userId: this.currentUser.id,
        recipeId,
        position
      });
    }
  }

  emitSelectionUpdate(recipeId: string, start: number, end: number) {
    if (this.socket && this.currentUser) {
      this.socket.emit('selection_update', {
        userId: this.currentUser.id,
        recipeId,
        start,
        end
      });
    }
  }

  emitRecipeUpdate(recipe: Recipe) {
    if (this.socket && this.currentUser) {
      this.socket.emit('recipe_update', {
        recipe,
        userId: this.currentUser.id
      });
    }
  }

  emitIngredientUpdate(recipeId: string, ingredient: { name: string; oldQuantity: number; newQuantity: number }) {
    if (this.socket && this.currentUser) {
      this.socket.emit('ingredient_update', {
        recipeId,
        ingredient,
        userId: this.currentUser.id
      });
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const apiService = new ApiService();
