import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L, { LatLngExpression, Icon } from 'leaflet';
import type { TravelMemory } from '@/types';
import '@styles/MapView.css';

const flagIconSvg = `data:image/svg+xml;base64,${btoa(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
    <defs>
      <filter id="shadow">
        <feDropShadow dx="1" dy="2" stdDeviation="1" flood-opacity="0.4"/>
      </filter>
    </defs>
    <path d="M6 2 L6 30" stroke="#8B4513" stroke-width="2.5" stroke-linecap="round" filter="url(#shadow)"/>
    <path d="M7 4 L24 8 L19 13 L24 18 L7 22 Z" fill="#e67e22" stroke="#d35400" stroke-width="1" filter="url(#shadow)"/>
  </svg>`
)}`;

const cameraIconSvg = `data:image/svg+xml;base64,${btoa(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
    <defs>
      <filter id="shadow">
        <feDropShadow dx="1" dy="2" stdDeviation="1" flood-opacity="0.4"/>
      </filter>
    </defs>
    <rect x="3" y="8" width="26" height="20" rx="3" fill="#1a5276" stroke="#0d3144" stroke-width="1.5" filter="url(#shadow)"/>
    <path d="M9 8 L12 4 L20 4 L23 8" fill="#2c6f94" stroke="#0d3144" stroke-width="1.5"/>
    <circle cx="16" cy="18" r="6" fill="#f5deb3" stroke="#0d3144" stroke-width="1.5"/>
    <circle cx="16" cy="18" r="3" fill="#1a5276"/>
    <circle cx="16" cy="18" r="1.2" fill="#e67e22"/>
  </svg>`
)}`;

function createCustomIcon(
  type: 'flag' | 'camera' = 'flag',
  extraClass: string = ''
): Icon {
  return L.icon({
    iconUrl: type === 'flag' ? flagIconSvg : cameraIconSvg,
    iconSize: [32, 32],
    iconAnchor: [6, 32],
    popupAnchor: [10, -28],
    className: `memory-marker-icon ${extraClass}`,
  });
}

function interpolateColor(progress: number): string {
  const start = { r: 26, g: 82, b: 118 };
  const end = { r: 230, g: 126, b: 34 };
  const r = Math.round(start.r + (end.r - start.r) * progress);
  const g = Math.round(start.g + (end.g - start.g) * progress);
  const b = Math.round(start.b + (end.b - start.b) * progress);
  return `rgb(${r}, ${g}, ${b})`;
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}): null {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapBoundsSetter({ memories }: { memories: TravelMemory[] }): null {
  const map = useMap();

  useEffect(() => {
    if (memories.length > 0) {
      const bounds = L.latLngBounds(
        memories.map((m) => [m.lat, m.lng] as LatLngExpression)
      );
      map.fitBounds(bounds, { padding: [80, 80] });
    }
  }, [memories, map]);

  return null;
}

interface MarkerPopupContentProps {
  memory: TravelMemory;
  onEdit: (memory: TravelMemory) => void;
  onDelete: (id: string) => void;
}

function MarkerPopupContent({
  memory,
  onEdit,
  onDelete,
}: MarkerPopupContentProps): React.JSX.Element {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (): void => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(memory.id);
    }, 250);
  };

  return (
    <div
      className={`popup-content ${isDeleting ? 'popup-deleting' : ''}`}
    >
      <div className="popup-actions">
        <button
          className="popup-btn popup-edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(memory);
          }}
          title="编辑"
        >
          ✏️
        </button>
        <button
          className="popup-btn popup-delete"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          title="删除"
        >
          🗑️
        </button>
      </div>

      {memory.photo && (
        <div className="popup-photo">
          <img src={memory.photo} alt={memory.name} />
        </div>
      )}

      <div className="popup-info">
        <h3 className="popup-name">{memory.name}</h3>
        <div className="popup-rating">
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className={`star ${i < memory.rating ? 'filled' : ''}`}
            >
              ★
            </span>
          ))}
        </div>
        {memory.note && <p className="popup-note">"{memory.note}"</p>}
        {(memory.country || memory.city) && (
          <p className="popup-location">
            📍 {[memory.city, memory.country].filter(Boolean).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}

interface MapViewProps {
  memories: TravelMemory[];
  showTrail: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onEditMemory: (memory: TravelMemory) => void;
  onDeleteMemory: (id: string) => void;
  newlyAddedId?: string | null;
  deletingId?: string | null;
}

export function MapView({
  memories,
  showTrail,
  onMapClick,
  onEditMemory,
  onDeleteMemory,
  newlyAddedId,
  deletingId,
}: MapViewProps): React.JSX.Element {
  const center: LatLngExpression = useMemo(() => {
    if (memories.length > 0) {
      const avgLat = memories.reduce((s, m) => s + m.lat, 0) / memories.length;
      const avgLng = memories.reduce((s, m) => s + m.lng, 0) / memories.length;
      return [avgLat, avgLng];
    }
    return [20, 0];
  }, [memories]);

  const trailPositions = useMemo((): LatLngExpression[] => {
    if (!showTrail || memories.length < 2) return [];
    return memories
      .slice()
      .sort(
        (a, b) =>
          (a.visitedAt ?? a.createdAt) - (b.visitedAt ?? b.createdAt)
      )
      .map((m) => [m.lat, m.lng] as LatLngExpression);
  }, [memories, showTrail]);

  const trailSegments = useMemo(() => {
    if (trailPositions.length < 2) return [];
    const segments: {
      positions: LatLngExpression[];
      color: string;
      memory: TravelMemory;
      nextMemory: TravelMemory;
    }[] = [];

    const sortedMemories = memories
      .slice()
      .sort(
        (a, b) =>
          (a.visitedAt ?? a.createdAt) - (b.visitedAt ?? b.createdAt)
      );

    for (let i = 0; i < trailPositions.length - 1; i++) {
      const progress = i / (trailPositions.length - 1);
      segments.push({
        positions: [trailPositions[i], trailPositions[i + 1]],
        color: interpolateColor(progress),
        memory: sortedMemories[i],
        nextMemory: sortedMemories[i + 1],
      });
    }
    return segments;
  }, [trailPositions, memories]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      onMapClick(lat, lng);
    },
    [onMapClick]
  );

  return (
    <div className="map-wrapper">
      <MapContainer
        center={center}
        zoom={memories.length > 0 ? 3 : 2}
        className="map-container"
        zoomControl={false}
        preferCanvas
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapBoundsSetter memories={memories} />
        <MapClickHandler onMapClick={handleMapClick} />

        {trailSegments.map((segment, i) => (
          <React.Fragment key={`trail-${i}`}>
            <Polyline
              positions={segment.positions}
              pathOptions={{
                color: segment.color,
                weight: 4,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
                className: 'trail-line',
              }}
            />
            {showTrail && (
              <Marker
                position={[
                  (segment.positions[0] as [number, number])[0] +
                    ((segment.positions[1] as [number, number])[0] -
                      (segment.positions[0] as [number, number])[0]) *
                      0.5,
                  (segment.positions[0] as [number, number])[1] +
                    ((segment.positions[1] as [number, number])[1] -
                      (segment.positions[0] as [number, number])[1]) *
                      0.5,
                ]}
                icon={L.divIcon({
                  className: 'trail-label-icon',
                  html: `<div class="trail-label">${segment.memory.name} → ${segment.nextMemory.name}</div>`,
                  iconSize: [120, 24],
                  iconAnchor: [60, 12],
                })}
                interactive={false}
              />
            )}
          </React.Fragment>
        ))}

        {memories.map((memory, index) => {
          const isNew = newlyAddedId === memory.id;
          const isDeleting = deletingId === memory.id;
          const iconType = index % 2 === 0 ? 'flag' : 'camera';
          const animClass = [
            'memory-marker',
            isNew ? 'marker-enter' : '',
            isDeleting ? 'marker-exit' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <Marker
              key={memory.id}
              position={[memory.lat, memory.lng]}
              icon={createCustomIcon(iconType, animClass)}
            >
              <Popup className="memory-popup" closeButton={true} maxWidth={280}>
                <MarkerPopupContent
                  memory={memory}
                  onEdit={onEditMemory}
                  onDelete={onDeleteMemory}
                />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
