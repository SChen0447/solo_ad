import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Activity, UserPreference, NotificationItem } from '../types';
import { getUserPreference, getBookedActivities, bookActivity, unbookActivity, analyzePreferences } from '../services/api';

interface UserContextType {
  userId: string;
  userPreference: UserPreference | null;
  bookedActivities: Activity[];
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refreshData: () => Promise<void>;
  handleBookActivity: (activityId: string) => Promise<{ success: boolean; conflicts?: any[] }>;
  handleUnbookActivity: (activityId: string) => Promise<boolean>;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const DEFAULT_USER_ID = 'default-user';

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId] = useState(DEFAULT_USER_ID);
  const [userPreference, setUserPreference] = useState<UserPreference | null>(null);
  const [bookedActivities, setBookedActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [pref, booked] = await Promise.all([
        getUserPreference(userId),
        getBookedActivities(userId)
      ]);
      setUserPreference(pref);
      setBookedActivities(booked);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleBookActivity = useCallback(async (activityId: string) => {
    try {
      const result = await bookActivity(userId, activityId);
      if (result.success) {
        await refreshData();
      }
      return result;
    } catch (error) {
      console.error('Failed to book activity:', error);
      return { success: false };
    }
  }, [userId, refreshData]);

  const handleUnbookActivity = useCallback(async (activityId: string) => {
    try {
      const result = await unbookActivity(userId, activityId);
      if (result.success) {
        await refreshData();
      }
      return result.success;
    } catch (error) {
      console.error('Failed to unbook activity:', error);
      return false;
    }
  }, [userId, refreshData]);

  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: UserContextType = {
    userId,
    userPreference,
    bookedActivities,
    notifications,
    unreadCount,
    loading,
    refreshData,
    handleBookActivity,
    handleUnbookActivity,
    addNotification,
    markNotificationRead,
    markAllRead
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
