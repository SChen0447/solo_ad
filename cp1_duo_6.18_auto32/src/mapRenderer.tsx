import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { useTravelStore } from './store';
import { getWeatherByLatLngDate, getPinColor } from './utils/weather';
import { getInterpolatedPosition, calculatePathSegments } from './utils/path';
import type { TravelPoint } from './types/travel';

function createCustomPinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-pin',
    html: `
      <div style="
        width: 0;
        height: 0;
        border-left: 12px solid transparent;
        border-right: 12px solid transparent;
        border-top: 24px solid ${color};
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        transform: translate(-50%, -100%);
      ">
      </div>
      <div style="
        width: 12px;
        height: 12px;
        background: ${color};
        border-radius: 50%;
        border: 2px solid white;
        position: absolute;
        top: -24px;
        left: 50%;
        transform: translateX(-50%);
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
      </div>
    `,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
  });
}

interface MapControllerProps {
  travelData: TravelPoint[];
  currentTime: number;
}

function MapController({ travelData, currentTime }: MapControllerProps): null {
  const map = useMap();

  useEffect(() => {
    if (travelData.length > 0) {
      const bounds = L.latLngBounds(
        travelData.map((point) => [point.lat, point.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [travelData, map]);

  return null;
}

interface PopupContentProps {
  point: TravelPoint;
  index: number;
}

function PopupContent({ point, index }: PopupContentProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const weather = getWeatherByLatLngDate(point.lat, point.lng, point.date);
  const maxNoteLength = 100;
  const shouldTruncate = point.note.length > maxNoteLength;
  const displayNote =
    expanded || !shouldTruncate
      ? point.note
      : point.note.slice(0, maxNoteLength) + '...';

  const toggleGallery = useTravelStore((state) => state.toggleGallery);
  const selectPoint = useTravelStore((state) => state.selectPoint);

  const handleOpenGallery = useCallback(() => {
    selectPoint(index);
    toggleGallery();
  }, [index, selectPoint, toggleGallery]);

  return (
    <div className="popup-content">
      <div className="popup-photo-container">
        {!imageLoaded && <div className="popup-photo-skeleton" />}
        <img
          src={point.photoUrl}
          alt={`Destination at ${point.date}`}
          className={`popup-photo ${imageLoaded ? 'loaded' : ''}`}
          onLoad={() => setImageLoaded(true)}
        />
      </div>
      <div className="popup-info">
        <div className="popup-date">{point.date}</div>
        <div className="popup-weather">
          <span
            className="weather-icon"
            style={{ color: weather.color, fontSize: '24px' }}
          >
            {weather.icon}
          </span>
          <span className="weather-desc">{weather.description}</span>
        </div>
        <div className="popup-note">
          {displayNote}
          {shouldTruncate && (
            <button
              className="expand-btn"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '收起' : '展开'}
            </button>
          )}
        </div>
        <button className="gallery-btn" onClick={handleOpenGallery}>
          查看照片画廊
        </button>
      </div>
    </div>
  );
}

export function MapRenderer(): JSX.Element {
  const travelData = useTravelStore((state) => state.travelData);
  const currentTime = useTravelStore((state) => state.currentTime);
  const selectPoint = useTravelStore((state) => state.selectPoint);
  const selectedPoint = useTravelStore((state) => state.selectedPoint);

  const pathSegments = useMemo(
    () => calculatePathSegments(travelData),
    [travelData]
  );

  const animatedPosition = useMemo(() => {
    if (travelData.length === 0) return null;
    return getInterpolatedPosition(travelData, currentTime, pathSegments);
  }, [travelData, currentTime, pathSegments]);

  const polylinePoints: [number, number][] = useMemo(
    () => travelData.map((point) => [point.lat, point.lng]),
    [travelData]
  );

  const traveledPath = useMemo(() => {
    if (!animatedPosition || travelData.length === 0) return [];

    const points: [number, number][] = [];
    const nearestIdx = animatedPosition.nearestPointIndex;

    for (let i = 0; i <= nearestIdx && i < travelData.length; i++) {
      points.push([travelData[i].lat, travelData[i].lng]);
    }

    points.push([animatedPosition.lat, animatedPosition.lng]);

    return points;
  }, [animatedPosition, travelData]);

  const remainingPath = useMemo(() => {
    if (!animatedPosition || travelData.length === 0) return polylinePoints;

    const points: [number, number][] = [
      [animatedPosition.lat, animatedPosition.lng],
    ];
    const nearestIdx = animatedPosition.nearestPointIndex;

    for (let i = nearestIdx + 1; i < travelData.length; i++) {
      points.push([travelData[i].lat, travelData[i].lng]);
    }

    return points;
  }, [animatedPosition, travelData, polylinePoints]);

  const isAtPoint = useMemo(() => {
    if (!animatedPosition || travelData.length === 0) return false;
    const nearestPoint = travelData[animatedPosition.nearestPointIndex];
    if (!nearestPoint) return false;
    const pointTime = new Date(nearestPoint.date).getTime();
    return Math.abs(currentTime - pointTime) < 1000 * 60 * 60 * 12;
  }, [animatedPosition, travelData, currentTime]);

  const handleMarkerClick = useCallback(
    (index: number) => {
      selectPoint(index);
    },
    [selectPoint]
  );

  if (travelData.length === 0) {
    return (
      <div className="map-placeholder">
        <div className="map-placeholder-content">
          <div className="placeholder-icon">🌍</div>
          <div className="placeholder-text">上传 CSV 文件开始您的环球旅行之旅</div>
        </div>
      </div>
    );
  }

  const mapCenter: [number, number] = [
    travelData.reduce((sum, p) => sum + p.lat, 0) / travelData.length,
    travelData.reduce((sum, p) => sum + p.lng, 0) / travelData.length,
  ];

  return (
    <div className="map-container">
      <MapContainer
        center={mapCenter}
        zoom={3}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapController travelData={travelData} currentTime={currentTime} />

        {polylinePoints.length >= 2 && (
          <>
            <Polyline
              positions={remainingPath}
              pathOptions={{
                color: '#ff7043',
                weight: 3,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: '8, 8',
              }}
            />
            <Polyline
              positions={traveledPath}
              pathOptions={{
                color: '#7c4dff',
                weight: 5,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
                className: 'traveled-path',
              }}
            />
          </>
        )}

        {travelData.map((point, index) => (
          <Marker
            key={`marker-${index}`}
            position={[point.lat, point.lng]}
            icon={createCustomPinIcon(getPinColor(index, travelData.length))}
            eventHandlers={{
              click: () => handleMarkerClick(index),
            }}
          >
            <Popup>
              <PopupContent point={point} index={index} />
            </Popup>
          </Marker>
        ))}

        {animatedPosition && (
          <>
            <CircleMarker
              center={[animatedPosition.lat, animatedPosition.lng]}
              radius={8}
              pathOptions={{
                color: '#ff5252',
                fillColor: '#ff5252',
                fillOpacity: 1,
                weight: 0,
                className: 'animated-marker',
              }}
            />
            {isAtPoint && (
              <CircleMarker
                center={[animatedPosition.lat, animatedPosition.lng]}
                radius={12}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: '#ffffff',
                  fillOpacity: 0.3,
                  weight: 2,
                  opacity: 0.5,
                  className: 'arrival-ring',
                }}
              />
            )}
          </>
        )}

        {selectedPoint !== null && travelData[selectedPoint] && (
          <CircleMarker
            center={[
              travelData[selectedPoint].lat,
              travelData[selectedPoint].lng,
            ]}
            radius={18}
            pathOptions={{
              color: '#7c4dff',
              fillColor: 'transparent',
              fillOpacity: 0,
              weight: 3,
              opacity: 0.8,
              dashArray: '5, 5',
              className: 'selected-ring',
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
