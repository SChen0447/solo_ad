import { useParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

const routeIcon = L.divIcon({
  className: 'report-marker',
  html: '<div style="background:#38bdf8;width:12px;height:12px;border-radius:50%;border:2px solid #fff;"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const checkinIcon = L.divIcon({
  className: 'report-checkin-marker',
  html: '<div style="background:#10b981;width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function TripReport() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();

  const { data: report, isLoading } = useSWR(
    routeId ? `/api/reports/${routeId}` : null,
    fetcher
  );

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>加载中...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>报告不存在</p>
        <button style={styles.backBtn} onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    );
  }

  const polylinePositions = report.route.waypoints.map(
    (w: any) => [w.lat, w.lng] as [number, number]
  );

  const mapCenter: [number, number] = report.route.waypoints.length > 0
    ? [report.route.waypoints[0].lat, report.route.waypoints[0].lng]
    : [31.2304, 121.4737];

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
      <button style={styles.backBtn} onClick={() => navigate('/')}>
        ← 返回
      </button>
      <h1 style={styles.pageTitle}>旅途报告</h1>
      <div style={{ width: '80px' }} />
    </div>

    <div style={styles.a4Paper}>
      <div style={styles.reportHeader}>
        <div>
          <h2 style={styles.reportTitle}>🚗 {report.route.name}</h2>
          <p style={styles.reportDate}>
            {new Date(report.createdAt).toLocaleDateString('zh-CN')}
          </p>
        </div>
        <div style={styles.reportBadge}>自驾之旅</div>
      </div>

      <div style={styles.statsSection}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📏</div>
          <div style={styles.statContent}>
            <span style={styles.statNumber}>{report.totalDistance}</span>
            <span style={styles.statUnit}>公里</span>
          </div>
          <span style={styles.statLabel}>总里程</span>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>⏱️</div>
          <div style={styles.statContent}>
            <span style={styles.statNumber}>
              {Math.floor(report.totalDuration / 60)}
            </span>
            <span style={styles.statUnit}>
              小时{report.totalDuration % 60}分
            </span>
          </div>
          <span style={styles.statLabel}>总时长</span>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🏙️</div>
          <div style={styles.statContent}>
            <span style={styles.statNumber}>{report.cityCount}</span>
            <span style={styles.statUnit}>座</span>
          </div>
          <span style={styles.statLabel}>途经城市</span>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📍</div>
          <div style={styles.statContent}>
            <span style={styles.statNumber}>{report.checkins.length}</span>
            <span style={styles.statUnit}>次</span>
          </div>
          <span style={styles.statLabel}>打卡记录</span>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🗺️ 路线轨迹</h3>
        <div style={styles.mapWrapper}>
          <MapContainer
            center={mapCenter}
            zoom={10}
            style={styles.staticMap}
            zoomControl={false}
            attributionControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            boxZoom={false}
            keyboard={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {polylinePositions.length > 1 && (
              <Polyline
                positions={polylinePositions}
                color="#38bdf8"
                weight={3}
                opacity={0.8}
              />
            )}
            {report.route.waypoints.map((wp: any, index: number) => (
              <Marker
                key={wp.id}
                position={[wp.lat, wp.lng]}
                icon={routeIcon}
              />
            ))}
            {report.checkins.map((checkin: any) => (
              <Marker
                key={checkin.id}
                position={[checkin.lat, checkin.lng]}
                icon={checkinIcon}
              />
            ))}
          </MapContainer>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📸 打卡时间线</h3>
        {report.checkins.length === 0 ? (
          <div style={styles.emptyCheckins}>
            <p style={styles.emptyCheckinsText}>暂无打卡记录</p>
            <p style={styles.emptyCheckinsSubtext}>旅途中记得打卡留念哦~</p>
          </div>
        ) : (
          <div style={styles.timeline}>
            {report.checkins.map((checkin: any, index: number) => (
              <div key={checkin.id} style={styles.timelineItem}>
                <div style={styles.timelineDot} />
                {index < report.checkins.length - 1 && (
                  <div style={styles.timelineLine} />
                )}
                <div style={styles.timelineContent}>
                  <div style={styles.checkinCard}>
                    <div style={styles.checkinImage}>
                      <span style={styles.checkinPhotoPlaceholder}>🖼️</span>
                    </div>
                    <div style={styles.checkinInfo}>
                      <div style={styles.checkinHeader}>
                        <h4 style={styles.checkinName}>
                          打卡点 {index + 1}
                        </h4>
                        <span style={styles.checkinTime}>
                          {formatDate(checkin.timestamp)}
                        </span>
                      </div>
                      <p style={styles.checkinComment}>
                        {checkin.comment || '没有留下感想~'}
                      </p>
                      {checkin.photoName && (
                        <p style={styles.checkinPhotoName}>
                          📷 {checkin.photoName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.reportFooter}>
        <p style={styles.footerText}>— 旅途愉快 · 自驾路线规划</p>
      </div>
    </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#1a1a2e',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  pageHeader: {
    width: '794px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  backBtn: {
    padding: '10px 20px',
    background: 'transparent',
    color: '#38bdf8',
    border: '1px solid #38bdf8',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 500ms ease-out',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  a4Paper: {
    width: '794px',
    minHeight: '1123px',
    background: '#fafafa',
    border: '2px dashed #cbd5e1',
    borderRadius: '4px',
    padding: '48px',
    boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
    color: '#1e293b',
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '2px solid #e2e8f0',
  },
  reportTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '8px',
  },
  reportDate: {
    fontSize: '14px',
    color: '#64748b',
  },
  reportBadge: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
    color: '#fff',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 600,
  },
  statsSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    background: '#f1f5f9',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    position: 'relative',
  },
  statIcon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  statContent: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '4px',
    marginBottom: '4px',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
  },
  statUnit: {
    fontSize: '12px',
    color: '#64748b',
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '16px',
  },
  mapWrapper: {
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  },
  staticMap: {
    width: '100%',
    height: '300px',
    borderRadius: '12px',
  },
  timeline: {
    position: 'relative',
    paddingLeft: '20px',
  },
  timelineItem: {
    position: 'relative',
    paddingBottom: '24px',
  },
  timelineDot: {
    position: 'absolute',
    left: '-20px',
    top: '16px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#10b981',
    border: '2px solid #fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: '-15px',
    top: '28px',
    width: '2px',
    height: 'calc(100% - 12px)',
    background: '#e2e8f0',
  },
  timelineContent: {
    marginLeft: '16px',
  },
  checkinCard: {
    display: 'flex',
    gap: '16px',
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  checkinImage: {
    width: '80px',
    height: '80px',
    borderRadius: '8px',
    background: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkinPhotoPlaceholder: {
    fontSize: '32px',
  },
  checkinInfo: {
    flex: 1,
    minWidth: 0,
  },
  checkinHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  checkinName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#0f172a',
  },
  checkinTime: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  checkinComment: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: 1.6,
    marginBottom: '8px',
  },
  checkinPhotoName: {
    fontSize: '12px',
    color: '#38bdf8',
  },
  emptyCheckins: {
    textAlign: 'center',
    padding: '48px 0',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed #e2e8f0',
  },
  emptyCheckinsText: {
    fontSize: '16px',
    color: '#64748b',
    marginBottom: '4px',
  },
  emptyCheckinsSubtext: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  reportFooter: {
    marginTop: 'auto',
    textAlign: 'center',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  footerText: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1a2e',
    gap: '16px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#94a3b8',
  },
};
