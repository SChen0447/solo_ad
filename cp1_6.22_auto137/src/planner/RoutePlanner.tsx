import { useState, useEffect, useCallback } from 'react';
import { useMapEvents, MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import useSWR, { mutate } from 'swr';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import InterestPointPanel from '../poi/InterestPointPanel';
import CheckinModal from '../checkin/CheckinModal';

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

const customIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background:#38bdf8;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const poiIcon = L.divIcon({
  className: 'poi-marker',
  html: '<div style="background:#f97316;width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const startIcon = L.divIcon({
  className: 'start-marker',
  html: '<div style="background:#10b981;width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;">起</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const endIcon = L.divIcon({
  className: 'end-marker',
  html: '<div style="background:#f97316;width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;">终</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function RoutePlanner() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const routeId = searchParams.get('routeId');

  const [waypoints, setWaypoints] = useState<any[]>([]);
  const [selectedPOI, setSelectedPOI] = useState<any>(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [routeName, setRouteName] = useState('新自驾路线');

  const { data: routeData } = useSWR(routeId ? `/api/routes/${routeId}` : null, fetcher);
  const { data: stats } = useSWR(routeId ? `/api/routes/${routeId}/stats` : null, fetcher);
  const { data: checkins } = useSWR(routeId ? `/api/routes/${routeId}/checkins` : null, fetcher);

  useEffect(() => {
    if (routeData) {
      setWaypoints(routeData.waypoints || []);
      setRouteName(routeData.name || '新自驾路线');
    }
  }, [routeData]);

  useEffect(() => {
    if (!routeId) {
      createNewRoute();
    }
  }, [routeId]);

  const createNewRoute = async () => {
    try {
      const res = await axios.post('/api/routes', { name: '新自驾路线' });
      navigate(`/planner?routeId=${res.data.id}`, { replace: true });
    } catch (err) {
      console.error('Failed to create route:', err);
    }
  };

  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      if (!routeId) return;
      try {
        const res = await axios.post(`/api/routes/${routeId}/waypoints`, {
          name: `途经点 ${waypoints.length + 1}`,
          lat,
          lng,
          order: waypoints.length,
        });
        setWaypoints(res.data.waypoints);
        mutate(`/api/routes/${routeId}/stats`);
        mutate(`/api/routes/${routeId}/pois`);
      } catch (err) {
        console.error('Failed to add waypoint:', err);
      }
    },
    [routeId, waypoints.length]
  );

  const removeWaypoint = async (waypointId: string) => {
    if (!routeId) return;
    try {
      const res = await axios.delete(`/api/routes/${routeId}/waypoints/${waypointId}`);
      setWaypoints(res.data.waypoints);
      mutate(`/api/routes/${routeId}/stats`);
      mutate(`/api/routes/${routeId}/pois`);
    } catch (err) {
      console.error('Failed to remove waypoint:', err);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newWaypoints = [...waypoints];
    const [draggedItem] = newWaypoints.splice(draggedIndex, 1);
    newWaypoints.splice(index, 0, draggedItem);
    newWaypoints.forEach((w, i) => (w.order = i));
    setWaypoints(newWaypoints);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (!routeId || draggedIndex === null) return;
    setDraggedIndex(null);
    try {
      await axios.put(`/api/routes/${routeId}/reorder`, {
        waypointIds: waypoints.map((w) => w.id),
      });
      mutate(`/api/routes/${routeId}/stats`);
      mutate(`/api/routes/${routeId}/pois`);
    } catch (err) {
      console.error('Failed to reorder waypoints:', err);
    }
  };

  const isCheckedIn = (poiId: string) => {
    return checkins?.some((c: any) => c.poiId === poiId);
  };

  const handlePOIClicked = (poi: any) => {
    setSelectedPOI(poi);
    setShowCheckinModal(true);
  };

  const handleCheckinSuccess = () => {
    setShowCheckinModal(false);
    setSelectedPOI(null);
    if (routeId) {
      mutate(`/api/routes/${routeId}/checkins`);
    }
  };

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setRouteName(e.target.value);
  };

  const handleNameBlur = async () => {
    if (!routeId) return;
    try {
      await axios.put(`/api/routes/${routeId}`, { name: routeName });
    } catch (err) {
      console.error('Failed to update route name:', err);
    }
  };

  const center: [number, number] = waypoints.length > 0
    ? [waypoints[waypoints.length - 1].lat, waypoints[waypoints.length - 1].lng]
    : [31.2304, 121.4737];

  const polylinePositions = waypoints.map((w) => [w.lat, w.lng] as [number, number]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
  };

  const viewReport = () => {
    if (routeId) {
      navigate(`/report/${routeId}`);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <input
            type="text"
            value={routeName}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            style={styles.routeNameInput}
          />
          <button style={styles.reportBtn} onClick={viewReport}>
            生成报告
          </button>
        </div>

        <div style={styles.statsCard}>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{stats?.distance || 0}</span>
            <span style={styles.statLabel}>公里</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <span style={styles.statValue}>{stats ? formatDuration(stats.duration) : '0分钟'}</span>
            <span style={styles.statLabel}>预计时长</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <span style={styles.statValue}>{waypoints.length}</span>
            <span style={styles.statLabel}>途经点</span>
          </div>
        </div>

        <div style={styles.waypointsSection}>
          <h3 style={styles.sectionTitle}>途经点列表</h3>
          <p style={styles.hintText}>拖拽调整顺序，点击 × 删除</p>
          <div style={styles.waypointsList}>
            {waypoints.length === 0 ? (
              <p style={styles.emptyWaypoints}>点击地图添加途经点</p>
            ) : (
              waypoints.map((wp, index) => (
                <div
                  key={wp.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{
                    ...styles.waypointItem,
                    opacity: draggedIndex === index ? 0.5 : 1,
                  }}
                >
                  <div style={styles.waypointHandle}>⋮⋮</div>
                  <div style={styles.waypointNumber}>{index + 1}</div>
                  <div style={styles.waypointInfo}>
                    <span style={styles.waypointName}>{wp.name}</span>
                    <span style={styles.waypointCoords}>
                      {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                    </span>
                  </div>
                  <button
                    style={styles.removeBtn}
                    onClick={() => removeWaypoint(wp.id)}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <InterestPointPanel routeId={routeId} onPOIClick={handlePOIClicked} checkins={checkins || []} />
      </div>

      <div style={styles.mapContainer}>
        <MapContainer
          center={center}
          zoom={12}
          style={styles.map}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onMapClick={handleMapClick} />
          <MapController center={center} />

          {polylinePositions.length > 1 && (
            <Polyline
              positions={polylinePositions}
              color="#38bdf8"
              weight={4}
              opacity={0.8}
            />
          )}

          {waypoints.map((wp, index) => {
            let icon = customIcon;
            if (index === 0 && waypoints.length > 1) icon = startIcon;
            if (index === waypoints.length - 1 && waypoints.length > 1) icon = endIcon;
            if (waypoints.length === 1) icon = startIcon;

            return (
              <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={icon}>
                <Popup>
                  <div style={styles.popupContent}>
                    <strong>{wp.name}</strong>
                    <br />
                    <small>
                      {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                    </small>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <div style={styles.mapLegend}>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: '#10b981' }} />
            <span>起点</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: '#38bdf8' }} />
            <span>途经点</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: '#f97316' }} />
            <span>终点</span>
          </div>
        </div>
      </div>

      {showCheckinModal && selectedPOI && routeId && (
        <CheckinModal
          routeId={routeId}
          poi={selectedPOI}
          onClose={() => setShowCheckinModal(false)}
          onSuccess={handleCheckinSuccess}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 65px)',
    background: '#1a1a2e',
  },
  sidebar: {
    width: '380px',
    background: '#16213e',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    borderRight: '1px solid #0f3460',
  },
  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid #0f3460',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  routeNameInput: {
    flex: 1,
    padding: '10px 14px',
    background: '#0f3460',
    border: '1px solid #0f3460',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '15px',
    fontWeight: 600,
    outline: 'none',
    transition: 'border-color 500ms ease-out',
  },
  reportBtn: {
    padding: '10px 16px',
    background: '#38bdf8',
    color: '#0f172a',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'filter 500ms ease-out',
    whiteSpace: 'nowrap',
  },
  statsCard: {
    display: 'flex',
    padding: '20px',
    margin: '16px',
    background: '#0f3460',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  statItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#38bdf8',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  statDivider: {
    width: '1px',
    background: '#16213e',
    margin: '0 8px',
  },
  waypointsSection: {
    padding: '0 16px 16px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: '4px',
  },
  hintText: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '12px',
  },
  waypointsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  emptyWaypoints: {
    textAlign: 'center',
    color: '#64748b',
    padding: '32px 0',
    fontSize: '14px',
  },
  waypointItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: '#0f3460',
    borderRadius: '12px',
    cursor: 'grab',
    transition: 'all 500ms ease-out',
  },
  waypointHandle: {
    color: '#64748b',
    fontSize: '14px',
    letterSpacing: '-2px',
  },
  waypointNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#38bdf8',
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
  },
  waypointInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  waypointName: {
    fontSize: '14px',
    color: '#e2e8f0',
    fontWeight: 500,
  },
  waypointCoords: {
    fontSize: '11px',
    color: '#64748b',
  },
  removeBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'transparent',
    border: 'none',
    color: '#f97316',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 500ms ease-out',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLegend: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    background: 'rgba(15, 52, 96, 0.9)',
    padding: '12px 16px',
    borderRadius: '12px',
    display: 'flex',
    gap: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#94a3b8',
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  popupContent: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '12px',
    color: '#0f172a',
  },
};
