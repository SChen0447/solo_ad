import { v4 as uuidv4 } from 'uuid';
import type { Notification, User, Task } from './types';

const notifications = new Map<string, Notification[]>();

export function createMentionNotification(
  fromUser: User,
  toUserId: string,
  task: Task,
  content: string
): Notification {
  const notification: Notification = {
    id: uuidv4(),
    type: 'mention',
    content: `${fromUser.username}在任务"${task.title}"中@了你`,
    taskId: task.id,
    taskTitle: task.title,
    fromUser,
    toUserId,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const userNotifications = notifications.get(toUserId) || [];
  userNotifications.unshift(notification);
  notifications.set(toUserId, userNotifications);
  
  return notification;
}

export function createAssignmentNotification(
  fromUser: User,
  toUserId: string,
  task: Task
): Notification {
  const notification: Notification = {
    id: uuidv4(),
    type: 'assignment',
    content: `${fromUser.username}将任务"${task.title}"分配给了你`,
    taskId: task.id,
    taskTitle: task.title,
    fromUser,
    toUserId,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const userNotifications = notifications.get(toUserId) || [];
  userNotifications.unshift(notification);
  notifications.set(toUserId, userNotifications);
  
  return notification;
}

export function getUserNotifications(userId: string): Notification[] {
  return notifications.get(userId) || [];
}

export function getUnreadNotifications(userId: string): Notification[] {
  return getUserNotifications(userId).filter(n => !n.read);
}

export function markNotificationRead(userId: string, notificationId: string): Notification | null {
  const userNotifications = notifications.get(userId);
  if (!userNotifications) return null;
  
  const notification = userNotifications.find(n => n.id === notificationId);
  if (!notification) return null;
  
  notification.read = true;
  return notification;
}

export function markAllNotificationsRead(userId: string): void {
  const userNotifications = notifications.get(userId);
  if (!userNotifications) return;
  
  userNotifications.forEach(n => {
    n.read = true;
  });
}

export function processMentions(
  content: string,
  fromUser: User,
  task: Task,
  allUsers: User[]
): Notification[] {
  const mentionRegex = /@(\S+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1];
    const user = allUsers.find(u => u.username === username);
    if (user && user.id !== fromUser.id) {
      mentions.push(user.id);
    }
  }
  
  const uniqueUserIds = [...new Set(mentions)];
  
  return uniqueUserIds.map(userId => 
    createMentionNotification(fromUser, userId, task, content)
  );
}
