import L from 'leaflet';
import { Recommendation, WeatherType } from './types';

export const mapConfig = {
  defaultCenter: [20, 0] as [number, number],
  defaultZoom: 2,
  minZoom: 2,
  maxZoom: 18,
  zoomAnimationDuration: 1,
};

const weatherIconEmojis: Record<WeatherType, string> = {
  sunny: '⭐',
  rainy: '💧',
  snowy: '❄️',
};

const weatherIconColors: Record<WeatherType, string> = {
  sunny: '#fdcb6e',
  rainy: '#74b9ff',
  snowy: '#ffffff',
};

export function createCustomIcon(weatherType: WeatherType): L.DivIcon {
  const emoji = weatherIconEmojis[weatherType];
  const color = weatherIconColors[weatherType];
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        font-size: 28px;
        text-align: center;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        animation: marker-bounce 0.5s ease-out;
      ">${emoji}</div>
      <div style="
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 12px;
        height: 12px;
        background: ${color};
        border-radius: 50%;
        box-shadow: 0 0 10px ${color};
      "></div>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export function generatePopupContent(
  recommendation: Recommendation,
  weatherType: WeatherType
): string {
  const activitiesList = recommendation.activities
    .map((a) => `<li>${a}</li>`)
    .join('');

  return `
    <div class="map-popup">
      <h3 class="popup-title">${recommendation.name}</h3>
      <p class="popup-country">${recommendation.country}</p>
      <p class="popup-reason">${recommendation.reason}</p>
      <div class="popup-activities">
        <h4>推荐活动</h4>
        <ul>${activitiesList}</ul>
      </div>
      <div class="popup-match">
        <span class="match-label">匹配度</span>
        <span class="match-score">${recommendation.matchScore}%</span>
      </div>
    </div>
  `;
}

export function getMarkerWeatherType(
  dest: Recommendation
): WeatherType {
  return dest.weatherTypes[0];
}

export function flyToDestination(
  map: L.Map | null,
  dest: Recommendation,
  zoom: number = 10
): void {
  if (map) {
    map.flyTo([dest.lat, dest.lng], zoom, {
      duration: mapConfig.zoomAnimationDuration,
    });
  }
}
