import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '../store';
import { MapPin, Clock, DollarSign, Navigation } from 'lucide-react';

const MARKER_COLORS = ['#E74C3C', '#3498DB', '#27AE60', '#F39C12', '#9B59B6', '#E91E63'];

function createColoredIcon(color: string, isActive: boolean) {
  const size = isActive ? 38 : 30;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55), width 0.2s, height 0.2s;
    ">
      <span style="transform: rotate(45deg); color: white; font-weight: bold; font-size: ${isActive ? '15px' : '12px'};">📍</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

function MapEvents({ onMove }: { onMove: () => void }) {
  useMapEvents({
    moveend: () => onMove(),
    zoomend: () => onMove(),
  });
  return null;
}

function FitToMarkers({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds.pad(0.2));
    }
  }, [positions, map]);
  return null;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapView() {
  const { trip } = useAppStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (trip?.schedules.length && trip.schedules[0]) {
      setActiveId(trip.schedules[0].id);
    }
  }, [trip?.schedules.length]);

  const schedules = trip?.schedules || [];
  const dayKeys = Array.from(new Set(schedules.map((s) => s.dayKey))).sort();

  const positions: [number, number][] = schedules.map(
    (s) => [s.location.lat, s.location.lng] as [number, number]
  );

  const activeSchedule = schedules.find((s) => s.id === activeId);
  const center: [number, number] = activeSchedule
    ? [activeSchedule.location.lat, activeSchedule.location.lng]
    : [35.6762, 139.6503];

  return (
    <div className="w-full h-full relative">
      <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
        }
        .leaflet-popup-content {
          margin: 0;
          min-width: 220px;
        }
        .leaflet-popup-tip {
          background: white;
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        style={{ height: '100%', width: '100%', borderRadius: 0 }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onMove={() => setTick((t) => t + 1)} />
        {positions.length > 0 && <FitToMarkers positions={positions} />}

        {schedules.map((s) => {
          const dayIdx = dayKeys.indexOf(s.dayKey);
          const color = MARKER_COLORS[dayIdx % MARKER_COLORS.length];
          const isActive = s.id === activeId;

          return (
            <Marker
              key={s.id}
              position={[s.location.lat, s.location.lng]}
              icon={createColoredIcon(color, isActive)}
              eventHandlers={{
                click: () => setActiveId(s.id),
              }}
            >
              <Popup>
                <div className="p-4">
                  <div
                    className="w-1 h-full absolute left-0 top-0 rounded-l-xl"
                    style={{ backgroundColor: color }}
                  />
                  <h4 className="font-display text-base text-navy font-semibold mb-2 pr-2">
                    {s.title}
                  </h4>
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-coral flex-shrink-0" />
                      <span>{s.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-coral flex-shrink-0" />
                      <span className="truncate max-w-[180px]">{s.location.name}</span>
                    </div>
                    {s.budget > 0 && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={12} className="text-coral flex-shrink-0" />
                        <span>¥{s.budget}</span>
                      </div>
                    )}
                    {activeSchedule && activeSchedule.id !== s.id && (
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100 mt-2">
                        <Navigation size={12} className="text-coral flex-shrink-0" />
                        <span>
                          距离 {haversine(
                            activeSchedule.location.lat,
                            activeSchedule.location.lng,
                            s.location.lat,
                            s.location.lng
                          ).toFixed(1)}{' '}
                          km
                        </span>
                      </div>
                    )}
                  </div>
                  {s.notes && (
                    <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100 italic">
                      {s.notes}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {schedules.length > 0 && (
        <div className="absolute bottom-3 left-2 right-2 z-10 overflow-x-auto custom-scrollbar">
          <div className="flex gap-1.5 pb-1">
            {dayKeys.map((dk, idx) => (
              <div
                key={dk}
                className="flex-shrink-0 flex items-center gap-1.5 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full shadow-sm text-xs border"
                style={{ borderColor: MARKER_COLORS[idx % MARKER_COLORS.length] }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: MARKER_COLORS[idx % MARKER_COLORS.length] }}
                />
                <span className="text-navy font-medium">
                  Day {idx + 1} ({schedules.filter((s) => s.dayKey === dk).length})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
