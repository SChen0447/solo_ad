export type ResourceType = '笔记' | '习题' | '课件' | '其他';

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  description: string;
  ownerId: string;
  ownerName: string;
  createdAt: Date;
}

export interface Favorite {
  id: string;
  userId: string;
  resourceId: string;
  createdAt: Date;
}

export type ExchangeStatus = 'pending' | 'accepted' | 'rejected';

export interface ExchangeRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  resourceId: string;
  resourceTitle: string;
  status: ExchangeStatus;
  createdAt: Date;
}

export type NotificationType = 'info' | 'success' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  createdAt: Date;
}

export interface CurrentUser {
  id: string;
  name: string;
}
