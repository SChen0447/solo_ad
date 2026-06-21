export interface RoutePoint {
  lng: number;
  lat: number;
  elevation?: number;
}

export interface Route {
  id: string;
  name: string;
  description: string;
  distance: number;
  duration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: RoutePoint[];
  elevationGain: number;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
  author: string;
}

export interface Review {
  id: string;
  routeId: string;
  userId: string;
  username: string;
  rating: number;
  comment: string;
  createdAt: string;
  avatarColor: string;
}
