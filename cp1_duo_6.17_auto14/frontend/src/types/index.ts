export interface Bean {
  id: number;
  name: string;
  origin: string;
  process: string;
  flavor_tags: string[];
  avg_rating: number;
  price: number;
  image: string;
  thumb_image: string;
  description: string;
  roast_level: string;
}

export interface User {
  id: number;
  email: string;
  nickname: string;
  avatar_color: string;
  subscription_plan?: string;
  total_spent: number;
}

export interface Subscription {
  id: number;
  user_id: number;
  bean_id: number;
  bean?: Bean;
  frequency: string;
  weight: string;
  address: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'paused' | 'cancelled';
  deliveries: Delivery[];
}

export interface Delivery {
  id: number;
  date: string;
  status: 'pending' | 'delivered' | 'in_transit';
  bean_name: string;
  roast_date?: string;
  tracking_number?: string;
  bean_id: number;
}

export interface Note {
  id: number;
  user_id: number;
  user?: User;
  bean_id: number;
  bean?: Bean;
  content: string;
  rating: number;
  images: string[];
  flavor_tags: string[];
  likes_count: number;
  is_liked: boolean;
  comments_count: number;
  created_at: string;
  comments: Comment[];
}

export interface Comment {
  id: number;
  user_id: number;
  user?: User;
  note_id: number;
  content: string;
  parent_id?: number;
  created_at: string;
  replies?: Comment[];
}

export interface FlavorProfile {
  acidity: number;
  bitterness: number;
  sweetness: number;
  body: number;
  aroma: number;
}

export interface MonthlySpending {
  month: string;
  amount: number;
}

export interface OriginStats {
  origin: string;
  count: number;
  color: string;
}

export interface Recommendations {
  beans: Bean[];
  reason: string;
}

export interface FilterOptions {
  origin?: string;
  process?: string;
  flavors: string[];
  minPrice?: number;
  maxPrice?: number;
}
