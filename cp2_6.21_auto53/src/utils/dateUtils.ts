import { Plant } from '@/types';

export const getDaysUntilWatering = (plant: Plant): number => {
  const lastWatered = new Date(plant.lastWateredDate);
  const nextWatering = new Date(lastWatered);
  nextWatering.setDate(nextWatering.getDate() + plant.wateringFrequencyDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextWatering.setHours(0, 0, 0, 0);
  const diffTime = nextWatering.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const isOverdue = (plant: Plant): boolean => {
  return getDaysUntilWatering(plant) < 0;
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
};
