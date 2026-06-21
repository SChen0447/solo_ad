import axios from 'axios';
import { Route, Review } from '../types';

const api = axios.create({
  baseURL: '/api',
});

export async function getRoutes(): Promise<Route[]> {
  const response = await api.get('/routes');
  return response.data.routes;
}

export async function getRouteById(id: string): Promise<Route> {
  const response = await api.get(`/routes/${id}`);
  return response.data.route;
}

export interface CreateRouteData {
  name: string;
  description: string;
  duration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: { lng: number; lat: number; elevation?: number }[];
  author: string;
}

export async function createRoute(data: CreateRouteData): Promise<Route> {
  const response = await api.post('/routes', data);
  return response.data.route;
}

export async function getReviews(routeId: string): Promise<Review[]> {
  const response = await api.get(`/routes/${routeId}/reviews`);
  return response.data.reviews;
}

export interface CreateReviewData {
  username: string;
  rating: number;
  comment: string;
}

export async function createReview(routeId: string, data: CreateReviewData): Promise<Review> {
  const response = await api.post(`/routes/${routeId}/reviews`, data);
  return response.data.review;
}
