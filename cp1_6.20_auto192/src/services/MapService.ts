import mapboxgl from 'mapbox-gl';

const MAPBOX_TOKEN = 'pk.placeholder_mapbox_token';

export const DAY_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8'
];

export function initializeMap(container: HTMLElement, center: [number, number], zoom: number = 12): Promise<mapboxgl.Map> {
  mapboxgl.accessToken = MAPBOX_TOKEN;

  const map = new mapboxgl.Map({
    container,
    style: 'mapbox://styles/mapbox/streets-v12',
    center,
    zoom,
  });

  return new Promise((resolve, reject) => {
    map.on('load', () => resolve(map));
    map.on('error', (e) => reject(e.error));
  });
}

export function addMarker(map: mapboxgl.Map, lng: number, lat: number, color: string, popup: mapboxgl.Popup): Promise<mapboxgl.Marker> {
  return new Promise((resolve) => {
    const marker = new mapboxgl.Marker({ color })
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map);
    resolve(marker);
  });
}

export function removeMarker(marker: mapboxgl.Marker): void {
  marker.remove();
}

function interpolateBezier(points: [number, number][], segments: number = 20): [number, number][] {
  if (points.length < 2) return points;
  if (points.length === 2) return points;

  const result: [number, number][] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let t = 0; t < segments; t++) {
      const s = t / segments;
      const s2 = s * s;
      const s3 = s2 * s;

      const catmullCoeff0 = -0.5 * s3 + s2 - 0.5 * s;
      const catmullCoeff1 = 1.5 * s3 - 2.5 * s2 + 1;
      const catmullCoeff2 = -1.5 * s3 + 2 * s2 + 0.5 * s;
      const catmullCoeff3 = 0.5 * s3 - 0.5 * s2;

      const lng = catmullCoeff0 * p0[0] + catmullCoeff1 * p1[0] + catmullCoeff2 * p2[0] + catmullCoeff3 * p3[0];
      const lat = catmullCoeff0 * p0[1] + catmullCoeff1 * p1[1] + catmullCoeff2 * p2[1] + catmullCoeff3 * p3[1];
      result.push([lng, lat]);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

export function drawRouteLine(map: mapboxgl.Map, coordinates: [number, number][], color: string, id: string): void {
  const sourceId = `route-source-${id}`;
  const layerId = `route-layer-${id}`;

  const interpolated = interpolateBezier(coordinates);

  if (map.getSource(sourceId)) {
    (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: interpolated,
      },
    });
  } else {
    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: interpolated,
        },
      },
    });

    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': color,
        'line-width': 2,
      },
    });
  }
}

export function removeRouteLine(map: mapboxgl.Map, id: string): void {
  const sourceId = `route-source-${id}`;
  const layerId = `route-layer-${id}`;

  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

export function flyToCity(map: mapboxgl.Map, lng: number, lat: number): void {
  map.flyTo({
    center: [lng, lat],
    zoom: 12,
    essential: true,
  });
}

export function fitBoundsToMarkers(map: mapboxgl.Map, coordinates: [number, number][]): void {
  if (coordinates.length === 0) return;

  if (coordinates.length === 1) {
    map.flyTo({ center: coordinates[0], zoom: 14 });
    return;
  }

  const bounds = new mapboxgl.LngLatBounds();
  coordinates.forEach((coord) => bounds.extend(coord));

  map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
}
