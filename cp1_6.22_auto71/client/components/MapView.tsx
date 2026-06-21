import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip as LeafletTooltip, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

interface POI {
  id: string;
  travel_id: string;
  name: string;
  latitude: number;
  longitude: number;
  arrived_at: string;
  description: string;
  image_urls: string[];
}

interface RouteSegment {
  from: POI;
  to: POI;
  duration: string;
  distance: number;
}

interface MapViewProps {
  center: [number, number];
  pois: POI[];
  segments: RouteSegment[];
  onMapClick: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitBoundsHandler({ pois }: { pois: POI[] }) {
  const map = useMap();
  useEffect(() => {
    if (pois.length > 0) {
      const bounds = L.latLngBounds(pois.map((p) => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [pois, map]);
  return null;
}

function RoutePolylines({ segments }: { segments: RouteSegment[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <>
      {segments.map((segment, index) => {
        const total = segments.length;
        const ratio = total > 1 ? index / (total - 1) : 0;
        const r = Math.round(72 + (49 - 72) * ratio);
        const g = Math.round(187 + (130 - 187) * ratio);
        const b = Math.round(120 + (206 - 120) * ratio);
        const color = `rgb(${r}, ${g}, ${b})`;

        return (
          <Polyline
            key={`${segment.from.id}-${segment.to.id}`}
            positions={[
              [segment.from.latitude, segment.from.longitude],
              [segment.to.latitude, segment.to.longitude],
            ]}
            pathOptions={{
              color,
              weight: 3,
              opacity: hoveredIndex === index ? 1 : 0.8,
            }}
            eventHandlers={{
              mouseover: () => setHoveredIndex(index),
              mouseout: () => setHoveredIndex(null),
            }}
          >
            {hoveredIndex === index && (
              <LeafletTooltip permanent={false}>
                <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                  <div>🚶 {segment.duration}</div>
                  <div>📏 {segment.distance} km</div>
                </div>
              </LeafletTooltip>
            )}
          </Polyline>
        );
      })}
    </>
  );
}

function POIMarker({ poi }: { poi: POI }) {
  return (
    <Marker
      position={[poi.latitude, poi.longitude]}
      icon={L.divIcon({
        className: 'brand-marker',
        html: `<div class="poi-dot" style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #667eea;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -16],
      })}
    >
      <Popup closeButton={true} maxWidth={280} className="poi-popup">
        <div style={{
          animation: 'popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          padding: '4px',
        }}>
          <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px', color: '#2d3748' }}>
            {poi.name}
          </div>
          <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
            🕐 {new Date(poi.arrived_at).toLocaleString('zh-CN')}
          </div>
          {poi.description && (
            <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '8px', lineHeight: 1.5 }}>
              {poi.description}
            </div>
          )}
          {poi.image_urls.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {poi.image_urls.slice(0, 5).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${poi.name} - ${i + 1}`}
                  style={{
                    width: '60px',
                    height: '60px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapView({ center, pois, segments, onMapClick }: MapViewProps) {
  const mapKey = useMemo(() => `map-${pois.length}`, [pois.length]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        key={mapKey}
        center={center}
        zoom={12}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={onMapClick} />
        <FitBoundsHandler pois={pois} />
        {pois.map((poi) => (
          <POIMarker key={poi.id} poi={poi} />
        ))}
        {segments.length > 0 && <RoutePolylines segments={segments} />}
      </MapContainer>
      <style>{`
        .brand-marker {
          background: none !important;
          border: none !important;
        }
        .poi-dot:hover {
          transform: scale(1.2) !important;
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.8) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .poi-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        .poi-popup .leaflet-popup-content {
          margin: 8px 12px;
        }
        .route-tooltip .leaflet-popup-content-wrapper {
          border-radius: 8px;
          padding: 4px 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}
