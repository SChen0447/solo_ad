import { useState, useEffect } from 'react';
import { getHoursUntilPickup } from '@/utils/dateUtils';
import type { TimeSlot } from '@/types';

interface UseCountdownReturn {
  hours: number;
  isExpired: boolean;
  formatted: string;
}

export function useCountdown(pickupDate: string, timeSlot: TimeSlot): UseCountdownReturn {
  const [hours, setHours] = useState<number>(() => getHoursUntilPickup(pickupDate, timeSlot));
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = getHoursUntilPickup(pickupDate, timeSlot);
      setHours(remaining);
      setIsExpired(remaining <= 0);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [pickupDate, timeSlot]);

  const formatCountdown = (h: number): string => {
    if (h < 1) {
      const minutes = Math.ceil(h * 60);
      return `${minutes} 分钟`;
    }
    if (h < 24) {
      return `${Math.floor(h)} 小时 ${Math.ceil((h % 1) * 60)} 分钟`;
    }
    const days = Math.floor(h / 24);
    const remainingHours = h % 24;
    return `${days} 天 ${Math.floor(remainingHours)} 小时`;
  };

  return {
    hours,
    isExpired,
    formatted: formatCountdown(hours),
  };
}
