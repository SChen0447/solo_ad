export interface Plant {
  id: string;
  name: string;
  species: string;
  location: string;
  lightNeeds: string;
  imageUrl: string;
  lastWatered: string;
  createdAt: string;
}

export interface CareRecord {
  id: string;
  plantId: string;
  type: 'water' | 'fertilize' | 'repot';
  date: string;
  note?: string;
}

export interface Post {
  id: string;
  author: string;
  avatar: string;
  time: string;
  content: string;
  likes: number;
  liked: boolean;
  saved: boolean;
  comments: Comment[];
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  time: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  level: number;
  stats: {
    totalPlants: number;
    healthIndex: number;
    careDays: number;
  };
}
