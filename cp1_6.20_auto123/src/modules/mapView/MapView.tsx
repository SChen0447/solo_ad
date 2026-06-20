import { useState, useMemo, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import type { Photo } from '../../types';
import { formatDate, getMonthColor } from '../../utils';
import './MapView.css';

interface Props {
  photos: Photo[];
  onPhotoClick: (id: string) => void;
  onPhotoUpdate: (photo: Photo) => void;
}

interface PopupData {
  photo: Photo;
  latlng: L.LatLng;
}

function createCustomIcon(color: string, isDraggable: boolean) {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ${isDraggable ? 'box-shadow: 0 2px 8px rgba(244,67,54,0.6);' : ''}
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13, { animate: true });
    }
  }, [center, map]);
  return null;
}

function MarkerDrag({
  photo,
  onPositionConfirm,
}: {
  photo: Photo;
  onPositionConfirm: (lat: number, lng: number) => void;
}) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap();

  useMapEvents({
    click: (e) => {
      if (!photo.gps) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  const handleDragEnd = (e: L.LeafletEvent) => {
    const marker = e.target as L.Marker;
    const latlng = marker.getLatLng();
    setPosition([latlng.lat, latlng.lng]);
  };

  const handleConfirm = () => {
    if (position) {
      onPositionConfirm(position[0], position[1]);
      setPosition(null);
    }
  };

  if (!photo.gps && !position) {
    return null;
  }

  const pos: [number, number] = position || [
    photo.gps?.latitude || 39.9042,
    photo.gps?.longitude || 116.4074,
  ];

  return (
    <>
      <Marker
        position={pos}
        draggable={true}
        icon={createCustomIcon('#f44336', true)}
        eventHandlers={{ dragend: handleDragEnd }}
      >
        <Popup>
          <div style={{ padding: '8px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 13 }}>
              拖动红色标记到正确位置
            </p>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(76,175,80,0.7)',
                  '0 0 0 8px rgba(76,175,80,0)',
                ],
              }}
              transition={{ duration: 1, repeat: Infinity }}
              onClick={handleConfirm}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#4caf50',
                color: '#fff',
                border: 'none',
                fontSize: 18,
                cursor: 'pointer',
                display: 'block',
                margin: '0 auto',
              }}
            >
              ✓
            </motion.button>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

export default function MapView({ photos, onPhotoClick, onPhotoUpdate }: Props) {
  const [popupData, setPopupData] = useState<PopupData | null>(null);

  const center = useMemo<[number, number] | null>(() => {
    const geotagged = photos.filter((p) => p.hasGps);
    if (geotagged.length === 0) return null;
    if (geotagged.length <= 5) {
      return [geotagged[0].gps!.latitude, geotagged[0].gps!.longitude] as [number, number];
    }
    const counts = new Map<string, { count: number; lat: number; lng: number }>();
    geotagged.forEach((p) => {
      const key = `${p.gps!.latitude.toFixed(3)}_${p.gps!.longitude.toFixed(3)}`;
      if (!counts.has(key)) {
        counts.set(key, { count: 0, lat: p.gps!.latitude, lng: p.gps!.longitude });
      }
      counts.get(key)!.count++;
    });
    const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count);
    return [sorted[0].lat, sorted[0].lng] as [number, number];
  }, [photos]);

  const handlePositionConfirm = async (photoId: string, lat: number, lng: number) => {
    try {
      const res = await axios.put<Photo>(`/photos/${photoId}/gps`, {
        latitude: lat,
        longitude: lng,
      });
      onPhotoUpdate(res.data);
    } catch (err) {
      console.error('Failed to update GPS', err);
    }
  };

  const geotaggedPhotos = photos.filter((p) => p.hasGps);
  const nonGeotaggedPhotos = photos.filter((p) => !p.hasGps);

  return (
    <div className="map-container">
      <MapContainer
        center={(center as [number, number]) || [39.9042, 116.4074] as [number, number]}
        zoom={13}
        className="leaflet-map"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {center && <MapController center={center} />}

        {geotaggedPhotos.map((photo) => {
          const month = new Date(photo.capturedAt).getMonth() + 1;
          const color = getMonthColor(month);
          return (
            <Marker
              key={photo.id}
              position={[photo.gps!.latitude, photo.gps!.longitude]}
              icon={createCustomIcon(color, false)}
              eventHandlers={{
                click: (e) => {
                  setPopupData({ photo, latlng: e.latlng });
                },
              }}
            />
          );
        })}

        {nonGeotaggedPhotos.slice(0, 1).map((photo) => (
          <MarkerDrag
            key={photo.id}
            photo={photo}
            onPositionConfirm={(lat, lng) => handlePositionConfirm(photo.id, lat, lng)}
          />
        ))}
      </MapContainer>

      <AnimatePresence>
        {popupData && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="photo-popup"
          >
            <button className="popup-close" onClick={() => setPopupData(null)}>
              ×
            </button>
            <img
              src={popupData.photo.url}
              alt=""
              className="popup-thumb"
              onClick={() => onPhotoClick(popupData.photo.id)}
            />
            <div className="popup-info">
              <div className="popup-date">
                {formatDate(popupData.photo.capturedAt)}
              </div>
              {popupData.photo.tags.length > 0 && (
                <div className="popup-tags">
                  {popupData.photo.tags.map((t) => (
                    <span key={t} className="popup-tag">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
