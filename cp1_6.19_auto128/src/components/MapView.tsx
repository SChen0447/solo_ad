import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L, { type LatLngExpression, type LatLngTuple, type DivIcon } from 'leaflet';
import type { TravelLocation, LocationWithJournal } from '../types';

interface MapViewProps {
  locations: LocationWithJournal[];
  onMapClick: (lat: number, lng: number) => void;
  onViewJournal: (loc: LocationWithJournal) => void;
  onAddJournal: (loc: LocationWithJournal) => void;
  flyingTo: LatLngTuple | null;
  onLocationDeleted: (id: string) => void;
  onLocationUpdated: (loc: TravelLocation) => void;
}

const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const createCustomIcon = (color: string): DivIcon => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-pin">
        <div class="marker-pin-ring" style="border-color: ${color}"></div>
        <div class="marker-pin-body"></div>
      </div>
    `,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40],
  });
};

const MapEventHandler: React.FC<{ onClick: (lat: number, lng: number) => void }> = ({ onClick }) => {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapFlyer: React.FC<{ target: LatLngTuple | null }> = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 8, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [target, map]);
  return null;
};

interface AnimatedPolylineProps {
  positions: LatLngTuple[];
  color?: string;
  weight?: number;
}

const AnimatedPolyline: React.FC<AnimatedPolylineProps> = ({ positions, color = '#667eea', weight = 3 }) => {
  const map = useMap();
  const polylineRef = useRef<L.Polyline | null>(null);
  const [animatedPositions, setAnimatedPositions] = useState<LatLngTuple[]>([]);

  useEffect(() => {
    if (positions.length < 2) {
      setAnimatedPositions(positions);
      return;
    }

    const totalPoints: LatLngTuple[] = [];
    for (let i = 0; i < positions.length - 1; i++) {
      const start = positions[i];
      const end = positions[i + 1];
      const steps = 30;
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        totalPoints.push([start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t]);
      }
    }

    const duration = 3000;
    const startTime = performance.now();
    let rafId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress =
        progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const currentIndex = Math.floor(easeProgress * (totalPoints.length - 1));
      setAnimatedPositions(totalPoints.slice(0, currentIndex + 1));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [positions, map]);

  if (animatedPositions.length < 2) return null;

  return (
    <Polyline
      ref={polylineRef as unknown as React.MutableRefObject<L.Polyline>}
      positions={animatedPositions as LatLngExpression[]}
      pathOptions={{ color, weight, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
    />
  );
};

const MapView: React.FC<MapViewProps> = ({
  locations,
  onMapClick,
  onViewJournal,
  flyingTo,
}) => {
  const center: LatLngTuple = [20, 100];

  const sortedLocations = useMemo(() => {
    return [...locations].sort(
      (a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()
    );
  }, [locations]);

  const polylinePoints: LatLngTuple[] = useMemo(() => {
    return sortedLocations.map((loc) => [loc.lat, loc.lng]);
  }, [sortedLocations]);

  const totalDistance = useMemo(() => {
    let total = 0;
    for (let i = 0; i < sortedLocations.length - 1; i++) {
      const a = sortedLocations[i];
      const b = sortedLocations[i + 1];
      total += haversineDistance(a.lat, a.lng, b.lat, b.lng);
    }
    return Math.round(total);
  }, [sortedLocations]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={2}
        style={{ width: '100%', height: '100%' }}
        minZoom={2}
        maxZoom={18}
        worldCopyJump
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEventHandler onClick={onMapClick} />
        <MapFlyer target={flyingTo} />
        <AnimatedPolyline positions={polylinePoints} color="#667eea" weight={4} />
        {sortedLocations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={createCustomIcon(loc.flagColor)}
          >
            <Popup>
              <div className="marker-popup">
                <div className="marker-popup-title">{loc.city}</div>
                <div className="marker-popup-country">{loc.country}</div>
                <div className="marker-popup-info">
                  📅 {loc.arrivalDate}
                  <br />
                  ⏱ 停留 {loc.daysStayed} 天
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '8px' }}
                  onClick={() => {
                    onViewJournal(loc);
                  }}
                >
                  {loc.journal ? '查看游记' : '写游记'}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {sortedLocations.length > 1 && (
        <div className="route-info">
          <div className="route-info-label">旅行路线</div>
          <div className="route-info-value">
            {sortedLocations.length} 个地点 · {totalDistance.toLocaleString()} km
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
