export interface Plot {
  id: number;
  grid_x: number;
  grid_y: number;
  user_id: number | null;
  username: string | null;
  avatar: string | null;
  water_level: number;
  fertilizer_level: number;
  claimed_at: string | null;
}

export interface Diary {
  id: number;
  user_id: number;
  plot_id: number;
  content: string;
  image_url: string;
  likes: number;
  created_at: string;
  username: string;
  avatar: string;
}

export interface Transaction {
  id: number;
  from_user_id: number;
  from_username: string;
  from_avatar: string;
  to_user_id: number;
  to_username: string;
  to_avatar: string;
  amount: number;
  type: string;
  plot_id: number | null;
  created_at: string;
}
