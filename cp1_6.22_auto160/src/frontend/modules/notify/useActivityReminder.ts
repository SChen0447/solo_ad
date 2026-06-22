import { useEffect, useRef, useCallback } from 'react';
import { Activity } from '../../types';
import { useUser } from '../../context/UserContext';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;

function getTimeUntilStart(activity: Activity): number {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  if (activity.date !== todayStr) {
    return Infinity;
  }
  
  const [hours, minutes] = activity.startTime.split(':').map(Number);
  const startTime = new Date();
  startTime.setHours(hours, minutes, 0, 0);
  
  return startTime.getTime() - now.getTime();
}

function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return Promise.resolve('denied');
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Promise.resolve(Notification.permission);
  }
  return Notification.requestPermission();
}

function showBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/vite.svg',
      badge: '/vite.svg'
    });
  }
}

export function useActivityReminder() {
  const { bookedActivities, addNotification } = useUser();
  const notifiedActivities = useRef<Set<string>>(new Set());
  const intervalRef = useRef<number | null>(null);

  const checkUpcomingActivities = useCallback(() => {
    const now = new Date();
    console.log('[Reminder] Checking upcoming activities at', now.toLocaleTimeString());
    
    bookedActivities.forEach(activity => {
      if (notifiedActivities.current.has(activity.id)) {
        return;
      }

      const timeUntilStart = getTimeUntilStart(activity);
      
      console.log(`[Reminder] ${activity.title}: ${timeUntilStart / 1000}s until start`);

      if (timeUntilStart > 0 && timeUntilStart <= FIVE_MINUTES_MS) {
        console.log(`[Reminder] Notifying for: ${activity.title}`);
        const minutesLeft = Math.ceil(timeUntilStart / 60000);
        
        showBrowserNotification(
          '活动即将开始',
          `${activity.title} 将在 ${minutesLeft} 分钟后开始，地点：${activity.location}`
        );

        addNotification({
          title: '活动即将开始',
          message: `${activity.title} 将在 ${minutesLeft} 分钟后开始`,
          activityId: activity.id
        });

        notifiedActivities.current.add(activity.id);
      }
    });
  }, [bookedActivities, addNotification]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (bookedActivities.length === 0) {
      return;
    }

    checkUpcomingActivities();

    intervalRef.current = window.setInterval(checkUpcomingActivities, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [bookedActivities, checkUpcomingActivities]);

  const requestPermission = useCallback(async () => {
    const permission = await requestNotificationPermission();
    return permission;
  }, []);

  return {
    requestPermission
  };
}
