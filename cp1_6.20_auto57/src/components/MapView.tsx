import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Recommendation, WeatherType } from '../types';
import { mapConfig, createCustomIcon } from '../map';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  recommendations: Recommendation[];
  selectedDestination: Recommendation | null;
  onMarkerClick: (dest: Recommendation) => void;
}

const MapController: React.FC<{
  selectedDestination: Recommendation | null;
}> = ({ selectedDestination }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedDestination) {
      map.flyTo(
        [selectedDestination.lat, selectedDestination.lng],
        10,
        {
          duration: mapConfig.zoomAnimationDuration,
        }
      );
    }
  }, [selectedDestination, map]);

  return null;
};

const MapView: React.FC<MapViewProps> = ({
  recommendations,
  selectedDestination,
  onMarkerClick,
}) => {
  const mapRef = useRef<L.Map | null>(null);

  return (
    <div className="map-container">
      <MapContainer
        center={mapConfig.defaultCenter}
        zoom={mapConfig.defaultZoom}
        minZoom={mapConfig.minZoom}
        maxZoom={mapConfig.maxZoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        ref={mapRef as any}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController selectedDestination={selectedDestination} />

        {recommendations.map((dest) => {
          const weatherType = dest.weatherTypes[0] as WeatherType;
          const icon = createCustomIcon(weatherType);

          return (
            <Marker
              key={dest.id}
              position={[dest.lat, dest.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onMarkerClick(dest),
              }}
            >
              <Popup>
                <div className="map-popup">
                  <h3 className="popup-title">{dest.name}</h3>
                  <p className="popup-country">{dest.country}</p>
                  <p className="popup-reason">{dest.reason}</p>
                  <div className="popup-activities">
                    <h4>推荐活动</h4>
                    <ul>
                      {dest.activities.map((activity, i) => (
                        <li key={i}>{activity}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="popup-match">
                    <span className="match-label">匹配度</span>
                    <span className="match-score">{dest.matchScore}%</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;
