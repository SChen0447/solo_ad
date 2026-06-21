import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { RoutePoint } from '../types';

mapboxgl.accessToken = 'pk.eyJ1IjoiZGVtby11c2VyIiwiYSI6ImNrcmR0b3d2ejFweGYycHBkZXNtMXZ4NnMifQ.demo-token';

interface RouteMapProps {
  points: RoutePoint[];
  interactive?: boolean;
  onPointsChange?: (points: RoutePoint[]) => void;
  height?: string;
  showElevationProfile?: boolean;
  previewMode?: boolean;
}

function getElevationColor(elevation: number, minElev: number, maxElev: number): string {
  if (maxElev === minElev) return '#38a169';
  
  const ratio = (elevation - minElev) / (maxElev - minElev);
  
  const r = Math.round(56 + (229 - 56) * ratio);
  const g = Math.round(161 + (62 - 161) * ratio);
  const b = Math.round(105 + (62 - 105) * ratio);
  
  return `rgb(${r}, ${g}, ${b})`;
}

export default function RouteMap({
  points,
  interactive = false,
  onPointsChange,
  height = '400px',
  showElevationProfile = false,
  previewMode = false
}: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initialCenter = points.length > 0
      ? [points[0].lng, points[0].lat] as [number, number]
      : [116.4074, 39.9042] as [number, number];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: initialCenter,
      zoom: points.length > 0 ? 12 : 10,
      interactive: true,
      attributionControl: false
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    if (interactive && onPointsChange) {
      map.current.on('click', (e) => {
        const newPoint: RoutePoint = {
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
          elevation: 50 + Math.random() * 100
        };
        const newPoints = [...points, newPoint];
        onPointsChange(newPoints);
      });

      map.current.getCanvas().style.cursor = 'crosshair';
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;

    if (mapInstance.getSource('route-preview')) {
      mapInstance.removeLayer('route-preview');
      mapInstance.removeSource('route-preview');
    }
    if (mapInstance.getSource('route')) {
      mapInstance.removeLayer('route');
      mapInstance.removeSource('route');
    }
    if (mapInstance.getSource('start-marker')) {
      mapInstance.removeLayer('start-marker');
      mapInstance.removeSource('start-marker');
    }
    if (mapInstance.getSource('end-marker')) {
      mapInstance.removeLayer('end-marker');
      mapInstance.removeSource('end-marker');
    }

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (points.length < 2) {
      if (points.length === 1 && mapInstance.loaded()) {
        const el = document.createElement('div');
        el.className = 'w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg';
        new mapboxgl.Marker(el)
          .setLngLat([points[0].lng, points[0].lat])
          .addTo(mapInstance);
      }
      return;
    }

    const elevations = points.map(p => p.elevation || 0);
    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);

    if (previewMode || interactive) {
      const coordinates = points.map(p => [p.lng, p.lat]);
      
      mapInstance.addSource('route-preview', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates
          }
        }
      });

      mapInstance.addLayer({
        id: 'route-preview',
        type: 'line',
        source: 'route-preview',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#63b3ed',
          'line-width': 3,
          'line-opacity': 0.6
        }
      });
    } else {
      for (let i = 0; i < points.length - 1; i++) {
        const elev = points[i].elevation || 0;
        const color = getElevationColor(elev, minElev, maxElev);
        const segmentId = `route-segment-${i}`;
        
        if (mapInstance.getSource(segmentId)) {
          mapInstance.removeLayer(segmentId);
          mapInstance.removeSource(segmentId);
        }

        mapInstance.addSource(segmentId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [points[i].lng, points[i].lat],
                [points[i + 1].lng, points[i + 1].lat]
              ]
            }
          }
        });

        mapInstance.addLayer({
          id: segmentId,
          type: 'line',
          source: segmentId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': color,
            'line-width': 4
          }
        });
      }
    }

    if (points.length > 0 && !previewMode && !interactive) {
      const startEl = document.createElement('div');
      startEl.className = 'w-5 h-5 rounded-full bg-green-500 border-3 border-white shadow-lg';
      startEl.style.width = '20px';
      startEl.style.height = '20px';
      startEl.style.backgroundColor = '#38a169';
      startEl.style.borderRadius = '50%';
      startEl.style.border = '3px solid white';
      startEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      
      const startMarker = new mapboxgl.Marker(startEl)
        .setLngLat([points[0].lng, points[0].lat])
        .addTo(mapInstance);
      markersRef.current.push(startMarker);

      const endEl = document.createElement('div');
      endEl.className = 'w-5 h-5 rounded-full bg-red-500 border-3 border-white shadow-lg';
      endEl.style.width = '20px';
      endEl.style.height = '20px';
      endEl.style.backgroundColor = '#e53e3e';
      endEl.style.borderRadius = '50%';
      endEl.style.border = '3px solid white';
      endEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      
      const endMarker = new mapboxgl.Marker(endEl)
        .setLngLat([points[points.length - 1].lng, points[points.length - 1].lat])
        .addTo(mapInstance);
      markersRef.current.push(endMarker);
    }

    if (points.length >= 2) {
      const bounds = points.reduce((bounds, p) => {
        return bounds.extend([p.lng, p.lat]);
      }, new mapboxgl.LngLatBounds([points[0].lng, points[0].lat], [points[0].lng, points[0].lat]));

      mapInstance.fitBounds(bounds, {
        padding: 50,
        duration: 500
      });
    }
  }, [points, mapLoaded, previewMode, interactive]);

  const elevations = points.map(p => p.elevation || 0);
  const minElev = Math.min(...elevations, 0);
  const maxElev = Math.max(...elevations, 100);

  return (
    <div className="relative rounded-xl overflow-hidden">
      <div ref={mapContainer} style={{ height }} className="w-full" />
      
      {showElevationProfile && points.length > 1 && (
        <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur rounded-xl p-4 shadow-lg">
          <div className="text-xs text-gray-500 mb-2">海拔剖面图</div>
          <div className="relative h-16 w-full">
            <svg className="w-full h-full" viewBox={`0 0 ${points.length - 1} 100`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38a169" />
                  <stop offset="50%" stopColor="#ecc94b" />
                  <stop offset="100%" stopColor="#e53e3e" />
                </linearGradient>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#48bb78" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#48bb78" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              
              <path
                d={points.map((p, i) => {
                  const x = i;
                  const y = 100 - ((p.elevation || 0) - minElev) / (maxElev - minElev || 1) * 80 - 10;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="url(#elevationGradient)"
                strokeWidth="2"
              />
              
              <path
                d={`${points.map((p, i) => {
                  const x = i;
                  const y = 100 - ((p.elevation || 0) - minElev) / (maxElev - minElev || 1) * 80 - 10;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')} L ${points.length - 1} 100 L 0 100 Z`}
                fill="url(#areaGradient)"
              />
            </svg>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>起点</span>
            <span>终点</span>
          </div>
        </div>
      )}

      {interactive && (
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur rounded-lg px-3 py-2 shadow-md text-sm">
          <span className="text-gray-600">点击地图添加路径点</span>
          <span className="ml-2 font-semibold text-[#276749]">{points.length} 个点</span>
        </div>
      )}
    </div>
  );
}
