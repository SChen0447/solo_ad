import { WeatherData, Recommendation, Destination } from './types';
import { destinations } from './data/destinations';

function calculateWeatherScore(dest: Destination, weatherType: string): number {
  if (dest.weatherTypes.includes(weatherType as any)) {
    return 40;
  }
  return 10;
}

function calculateTempScore(dest: Destination, temperature: number): number {
  const [minTemp, maxTemp] = dest.tempRange;
  if (temperature >= minTemp && temperature <= maxTemp) {
    return 35;
  }
  const diff = temperature < minTemp 
    ? minTemp - temperature 
    : temperature - maxTemp;
  const maxDiff = 30;
  const score = Math.max(0, 35 - (diff / maxDiff) * 30);
  return Math.round(score);
}

function calculateActivityScore(dest: Destination): number {
  return Math.min(25, dest.activities.length * 5);
}

export function getRecommendations(weatherData: WeatherData): Recommendation[] {
  const results: Recommendation[] = destinations.map((dest) => {
    const weatherScore = calculateWeatherScore(dest, weatherData.weatherType);
    const tempScore = calculateTempScore(dest, weatherData.temperature);
    const activityScore = calculateActivityScore(dest);
    const matchScore = weatherScore + tempScore + activityScore;

    return {
      ...dest,
      matchScore: Math.min(100, matchScore),
    };
  });

  results.sort((a, b) => b.matchScore - a.matchScore);
  const count = 3 + Math.floor(Math.random() * 3);
  return results.slice(0, Math.min(count, results.length));
}

export function generateRecommendReason(
  dest: Recommendation,
  weatherData: WeatherData
): string {
  const reasons: string[] = [];
  
  if (dest.weatherTypes.includes(weatherData.weatherType)) {
    reasons.push(dest.reason);
  } else {
    reasons.push(`虽然${weatherData.description}，但${dest.reason}`);
  }
  
  if (weatherData.temperature >= dest.tempRange[0] && 
      weatherData.temperature <= dest.tempRange[1]) {
    reasons.push('温度适宜');
  }

  return reasons.join('，');
}
