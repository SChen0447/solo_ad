export interface User {
  id: string;
  nickname: string;
  avatarColor: string;
}

export interface POI {
  id: string;
  name: string;
  category: POICategory;
  description: string;
  lat: number;
  lng: number;
  creator_id: string;
  creator_name: string;
  creator_avatar: string;
  like_count: number;
  created_at: number;
  comments?: Comment[];
}

export type POICategory = 'food' | 'sight' | 'event' | 'other';

export interface Comment {
  id: string;
  poi_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  content: string;
  created_at: number;
}

export interface FeedEvent {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  event_type: 'add_poi' | 'add_comment';
  poi_id: string;
  poi_name: string;
  lat: number;
  lng: number;
  category: POICategory;
  comment_id?: string;
  comment_content?: string;
  created_at: number;
}

export interface FriendLocation {
  userId: string;
  nickname: string;
  avatarColor: string;
  lat: number;
  lng: number;
}

export interface UserProfile extends User {
  createdAt: number;
  poiCount: number;
  friendCount: number;
  recentEvents: FeedEvent[];
}
