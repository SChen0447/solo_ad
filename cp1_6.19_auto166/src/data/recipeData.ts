export interface RecipeListItem {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  image: string;
  rating: number;
  likes: number;
  liked: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  rating: number;
  createdAt: string;
}

export interface RecipeDetail extends RecipeListItem {
  ingredients: string[];
  steps: string[];
  comments: Comment[];
}

export interface UserStats {
  publishedCount: number;
  totalLikes: number;
  averageRating: number;
}

export interface UserRecipe {
  id: string;
  title: string;
  image: string;
  rating: number;
  likes: number;
}

export interface Recommendation extends UserRecipe {
  author: string;
  authorAvatar: string;
}

export interface TrendData {
  date: string;
  count: number;
}

export interface UserInfo {
  id: string;
  name: string;
  avatar: string;
  stats: UserStats;
  recentRecipes: UserRecipe[];
  recommendations: Recommendation[];
  trendData: TrendData[];
}

const CURRENT_USER_ID = 'u1';

export function getCurrentUserId(): string {
  return CURRENT_USER_ID;
}

export async function fetchRecipes(): Promise<RecipeListItem[]> {
  const res = await fetch(`/api/recipes?userId=${CURRENT_USER_ID}`);
  if (!res.ok) throw new Error('Failed to fetch recipes');
  return res.json();
}

export async function fetchRecipeDetail(id: string): Promise<RecipeDetail> {
  const res = await fetch(`/api/recipes/${id}?userId=${CURRENT_USER_ID}`);
  if (!res.ok) throw new Error('Failed to fetch recipe detail');
  return res.json();
}

export async function rateRecipe(recipeId: string, score: number): Promise<{ success: boolean; averageRating: number }> {
  const res = await fetch(`/api/recipes/${recipeId}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: CURRENT_USER_ID, score }),
  });
  if (!res.ok) throw new Error('Failed to rate recipe');
  return res.json();
}

export async function likeRecipe(recipeId: string): Promise<{ success: boolean; liked: boolean; likes: number }> {
  const res = await fetch(`/api/recipes/${recipeId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: CURRENT_USER_ID }),
  });
  if (!res.ok) throw new Error('Failed to like recipe');
  return res.json();
}

export async function addComment(recipeId: string, content: string, rating: number): Promise<{ success: boolean; comment: Comment }> {
  const res = await fetch(`/api/recipes/${recipeId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: CURRENT_USER_ID, content, rating }),
  });
  if (!res.ok) throw new Error('Failed to add comment');
  return res.json();
}

export async function editComment(recipeId: string, commentId: string, content: string, rating: number): Promise<{ success: boolean; comment: Comment }> {
  const res = await fetch(`/api/recipes/${recipeId}/comments/${commentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: CURRENT_USER_ID, content, rating }),
  });
  if (!res.ok) throw new Error('Failed to edit comment');
  return res.json();
}

export async function deleteComment(recipeId: string, commentId: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/recipes/${recipeId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: CURRENT_USER_ID }),
  });
  if (!res.ok) throw new Error('Failed to delete comment');
  return res.json();
}

export async function fetchUserInfo(userId: string): Promise<UserInfo> {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user info');
  return res.json();
}
