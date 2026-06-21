import type { Plant, Post, User, Comment } from './types'

const BASE_URL = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }))
    throw new Error(error.error || '请求失败')
  }

  return response.json()
}

export async function getPlants(): Promise<Plant[]> {
  return request<Plant[]>('/plants')
}

export async function addPlant(data: {
  name: string
  species: string
  location: string
  lightNeeds: string
  imageUrl?: string
}): Promise<Plant> {
  return request<Plant>('/plants', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function getPlantById(id: string): Promise<Plant> {
  return request<Plant>(`/plants/${id}`)
}

export async function waterPlant(id: string): Promise<Plant> {
  return request<Plant>(`/plants/${id}/water`, {
    method: 'POST'
  })
}

export async function fertilizePlant(id: string): Promise<Plant> {
  return request<Plant>(`/plants/${id}/fertilize`, {
    method: 'POST'
  })
}

export async function repotPlant(id: string): Promise<Plant> {
  return request<Plant>(`/plants/${id}/repot`, {
    method: 'POST'
  })
}

export async function getPosts(): Promise<Post[]> {
  return request<Post[]>('/posts')
}

export async function addPost(content: string): Promise<Post> {
  return request<Post>('/posts', {
    method: 'POST',
    body: JSON.stringify({ content })
  })
}

export async function addComment(postId: string, content: string): Promise<Comment> {
  return request<Comment>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content })
  })
}

export async function likePost(postId: string): Promise<Post> {
  return request<Post>(`/posts/${postId}/like`, {
    method: 'POST'
  })
}

export async function savePost(postId: string): Promise<Post> {
  return request<Post>(`/posts/${postId}/save`, {
    method: 'POST'
  })
}

export async function getProfile(): Promise<User> {
  return request<User>('/profile')
}

export async function getSavedPosts(): Promise<Post[]> {
  return request<Post[]>('/saved-posts')
}
