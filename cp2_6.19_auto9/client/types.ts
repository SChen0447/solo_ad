export interface Post {
  id: string;
  title: string;
  content: string;
  tag: string;
  author: string;
  authorAvatar: string;
  createdAt: number;
  isTop: boolean;
  isFeatured: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  author: string;
  content: string;
  createdAt: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface UserStats {
  name: string;
  avatar: string;
  posts: number;
  comments: number;
  total: number;
}

export interface Stats {
  hotTags: { tag: Tag; count: number }[];
  activeUsers: UserStats[];
}
