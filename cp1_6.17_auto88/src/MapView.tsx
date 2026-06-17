import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { SoundRecord, EmotionType } from './types';
import { EMOTION_COLORS } from './types';

interface MapViewProps {
  records: SoundRecord[];
  selectedRecord: SoundRecord | null;
  onMarkerClick: (record: SoundRecord) => void;
  onMapClick: (lat: number, lng: number) => void;
  onRecordButtonClick: () => void;
}

const BEIJING_CENTER: [number, number] = [39.9042, 116.4074];
const DEFAULT_ZOOM = 13;

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MarkersLayer({
  records,
  selectedRecord,
  onMarkerClick,
}: {
  records: SoundRecord[];
  selectedRecord: SoundRecord | null;
  onMarkerClick: (record: SoundRecord) => void;
}) {
  const map = useMap();
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const ripplesRef = useRef<Map<string, L.Circle>>(new Map());

  const getEmotionColor = (record: SoundRecord): string => {
    const emotionCounts: Record<EmotionType, number> = {
      happy: 0,
      calm: 0,
      sad: 0,
      angry: 0,
      anxious: 0,
    };
    
    emotionCounts[record.emotion]++;
    
    record.reactions.forEach(reaction => {
      emotionCounts[reaction.emotion]++;
    });
    
    let maxEmotion: EmotionType = 'calm';
    let maxCount = 0;
    
    (Object.keys(emotionCounts) as EmotionType[]).forEach(emotion => {
      if (emotionCounts[emotion] > maxCount) {
        maxCount = emotionCounts[emotion];
        maxEmotion = emotion;
      }
    });
    
    return EMOTION_COLORS[maxEmotion];
  };

  const createMarkerIcon = (color: string, isSelected: boolean, isNew: boolean) => {
    const size = isSelected ? 32 : 24;
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, ${color}, ${color}aa);
          border: 3px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 4px 15px ${color}66, inset 0 2px 4px rgba(255,255,255,0.3);
          transition: all 0.3s ease;
          animation: ${isNew ? 'scaleIn 0.5s ease-out' : 'none'};
          ${isSelected ? 'transform: scale(1.2);' : ''}
        "></div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  useEffect(() => {
    records.forEach((record, index) => {
      const existingMarker = markersRef.current.get(record.id);
      const isSelected = selectedRecord?.id === record.id;
      const isNew = index === records.length - 1 && !existingMarker;
      const color = getEmotionColor(record);

      if (existingMarker) {
        existingMarker.setIcon(createMarkerIcon(color, isSelected, false));
      } else {
        const marker = L.marker([record.latitude, record.longitude], {
          icon: createMarkerIcon(color, isSelected, isNew),
        })
          .addTo(map)
          .on('click', () => onMarkerClick(record));

        markersRef.current.set(record.id, marker);

        if (isNew) {
          const ripple = L.circle([record.latitude, record.longitude], {
            radius: 50,
            color: color,
            weight: 3,
            fill: false,
            opacity: 1,
          }).addTo(map);

          ripplesRef.current.set(record.id, ripple);

          setTimeout(() => {
            const startTime = Date.now();
            const duration = 1000;
            const animate = () => {
              const elapsed = Date.now() - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const easeProgress = 1 - Math.pow(1 - progress, 3);
              ripple.setStyle({ opacity: 1 - easeProgress });
              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
                map.removeLayer(ripple);
                ripplesRef.current.delete(record.id);
              }
            };
            animate();
          }, 100);
        }
      }
    });

    markersRef.current.forEach((marker, id) => {
      if (!records.find(r => r.id === id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });
  }, [records, selectedRecord, map, onMarkerClick]);

  return null;
}

function HeatmapLayer({ records }: { records: SoundRecord[] }) {
  const map = useMap();
  const heatmapRef = useRef<L.CircleMarker[]>([]);

  const getEmotionColor = (record: SoundRecord): string => {
    const emotionCounts: Record<EmotionType, number> = {
      happy: 0,
      calm: 0,
      sad: 0,
      angry: 0,
      anxious: 0,
    };
    
    emotionCounts[record.emotion]++;
    
    record.reactions.forEach(reaction => {
      emotionCounts[reaction.emotion]++;
    });
    
    let maxEmotion: EmotionType = 'calm';
    let maxCount = 0;
    
    (Object.keys(emotionCounts) as EmotionType[]).forEach(emotion => {
      if (emotionCounts[emotion] > maxCount) {
        maxCount = emotionCounts[emotion];
        maxEmotion = emotion;
      }
    });
    
    return EMOTION_COLORS[maxEmotion];
  };

  useEffect(() => {
    heatmapRef.current.forEach(layer => map.removeLayer(layer));
    heatmapRef.current = [];

    records.forEach(record => {
      const color = getEmotionColor(record);
      const totalReactions = record.reactions.length + 1;
      const radius = Math.min(30 + totalReactions * 5, 80);

      const heatCircle = L.circleMarker([record.latitude, record.longitude], {
        radius: radius,
        fillColor: color,
        fillOpacity: 0.3,
        stroke: false,
        interactive: false,
      }).addTo(map);

      heatmapRef.current.push(heatCircle);
    });
  }, [records, map]);

  return null;
}

function MapView({
  records,
  selectedRecord,
  onMarkerClick,
  onMapClick,
  onRecordButtonClick,
}: MapViewProps) {
  const recordIds = useMemo(() => records.map(r => r.id), [records]);

  return (
    <div style={styles.mapContainer}>
      <MapContainer
        center={BEIJING_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <HeatmapLayer key={`heatmap-${recordIds.join('-')}`} records={records} />
        <MarkersLayer
          key={`markers-${recordIds.join('-')}-${selectedRecord?.id || 'none'}`}
          records={records}
          selectedRecord={selectedRecord}
          onMarkerClick={onMarkerClick}
        />
        <MapClickHandler onClick={onMapClick} />
      </MapContainer>

      <button
        onClick={onRecordButtonClick}
        style={styles.recordButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <span style={styles.recordButtonInner}>🎤</span>
        <span style={styles.recordButtonPulse}></span>
        <span style={styles.recordButtonPulse2}></span>
      </button>

      <div style={styles.legend}>
        <div style={styles.legendTitle}>情绪分布</div>
        {Object.entries(EMOTION_COLORS).map(([emotion, color]) => (
          <div key={emotion} style={styles.legendItem}>
            <div
              style={{
                ...styles.legendDot,
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}`,
              }}
            ></div>
            <span style={styles.legendText}>
              {emotion === 'happy' && '开心'}
              {emotion === 'calm' && '宁静'}
              {emotion === 'sad' && '悲伤'}
              {emotion === 'angry' && '愤怒'}
              {emotion === 'anxious' && '焦虑'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  mapContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  recordButton: {
    position: 'absolute',
    bottom: '60px',
    right: '30px',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 50%, #dc3545 100%)',
    border: 'none',
    cursor: 'pointer',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(255, 107, 107, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
    transition: 'transform 0.3s ease',
    overflow: 'visible',
  },
  recordButtonInner: {
    fontSize: '28px',
    zIndex: 2,
    position: 'relative',
  },
  recordButtonPulse: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: 'rgba(255, 107, 107, 0.4)',
    animation: 'pulse 2s ease-in-out infinite',
    zIndex: 1,
  },
  recordButtonPulse2: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: 'rgba(255, 107, 107, 0.4)',
    animation: 'pulse 2s ease-in-out infinite 1s',
    zIndex: 1,
  },
  legend: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    background: 'rgba(26, 26, 46, 0.85)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '16px',
    zIndex: 1000,
    border: '1px solid rgba(6, 182, 212, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  legendTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#e0e0e0',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    gap: '10px',
  },
  legendDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
  },
  legendText: {
    fontSize: '13px',
    color: '#a0a0b0',
  },
};

export default MapView;
