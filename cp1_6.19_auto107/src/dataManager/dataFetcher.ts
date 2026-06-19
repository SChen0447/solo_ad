import { HistoricalEvent } from './types';
import { cacheHandler } from './cacheHandler';
import { getEventsByYearRange } from './mockData';

const SIMULATED_DELAY = 500;

function generateCacheKey(start: number, end: number): string {
  return `events_${start}_${end}`;
}

export function fetchEventsByPeriod(start: number, end: number): Promise<HistoricalEvent[]> {
  return new Promise((resolve) => {
    const cacheKey = generateCacheKey(start, end);
    const cachedData = cacheHandler.get(cacheKey);

    if (cachedData) {
      console.log('Cache hit');
      resolve(cachedData);
      return;
    }

    console.log('Cache miss');

    setTimeout(() => {
      const events = getEventsByYearRange(start, end);
      cacheHandler.set(cacheKey, events);
      resolve(events);
    }, SIMULATED_DELAY);
  });
}

export async function fetchEventsByPeriodWithBuffer(
  center: number,
  range: number
): Promise<HistoricalEvent[]> {
  const bufferRange = range * 2;
  const start = center - bufferRange;
  const end = center + bufferRange;

  return fetchEventsByPeriod(start, end);
}

export default fetchEventsByPeriod;
