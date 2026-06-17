export interface User {
  id: string;
  username: string;
  name: string;
  position: string;
  company: string;
  email: string;
  phone: string;
  avatarUrl: string;
  socialLinks: SocialLinks;
}

export interface SocialLinks {
  wechat: string;
  linkedin: string;
  twitter: string;
  github: string;
}

export interface Card {
  id: string;
  name: string;
  position: string;
  company: string;
  email: string;
  phone: string;
  avatarUrl: string;
  socialLinks: SocialLinks;
  note: string;
  exchangedAt: string;
}

export interface CardsResponse {
  cards: Card[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
}
