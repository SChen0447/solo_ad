import useSWR, { mutate } from 'swr';
import axios from 'axios';

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

const typeLabels: Record<string, string> = {
  viewpoint: '🏔️ 观景台',
  farmstay: '🏡 农家乐',
  gasstation: '⛽ 加油站',
  photospot: '📸 网红拍照点',
};

const typeColors: Record<string, string> = {
  viewpoint: '#38bdf8',
  farmstay: '#10b981',
  gasstation: '#f59e0b',
  photospot: '#ec4899',
};

interface POIPanelProps {
  routeId: string | null;
  onPOIClick: (poi: any) => void;
  checkins: any[];
}

export default function InterestPointPanel({ routeId, onPOIClick, checkins }: POIPanelProps) {
  const { data: pois, isLoading } = useSWR(
    routeId ? `/api/routes/${routeId}/pois` : null,
    fetcher
  );

  const isCheckedIn = (poiId: string) => {
    return checkins.some((c) => c.poiId === poiId);
  };

  const addToRoute = async (poiId: string) => {
    if (!routeId) return;
    try {
      await axios.post(`/api/routes/${routeId}/point`, { poiId });
      mutate(`/api/routes/${routeId}`);
      mutate(`/api/routes/${routeId}/stats`);
    } catch (err) {
      console.error('Failed to add POI to route:', err);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>📍 沿途兴趣点推荐</h3>
        <span style={styles.subtitle}>20公里范围内</span>
      </div>

      <div style={styles.poiList}>
        {isLoading ? (
          <div style={styles.loading}>加载中...</div>
        ) : !pois || pois.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>暂无推荐兴趣点</p>
            <p style={styles.emptySubtext}>添加更多途经点以发现附近景点</p>
          </div>
        ) : (
          pois.map((poi: any) => (
            <div key={poi.id} style={styles.poiCard}>
              {isCheckedIn(poi.id) && <div style={styles.checkedDot} />}
              <div style={styles.poiHeader}>
                <span style={{ ...styles.poiType, color: typeColors[poi.type] }}>
                  {typeLabels[poi.type]}
                </span>
                <span style={styles.poiDistance}>
                  {poi.distance?.toFixed(1)} 公里
                </span>
              </div>
              <h4 style={styles.poiName}>{poi.name}</h4>
              <p style={styles.poiDesc}>{poi.description}</p>
              <div style={styles.poiActions}>
                <button style={styles.addBtn} onClick={() => addToRoute(poi.id)}>
                  + 加入路线
                </button>
                <button style={styles.checkinBtn} onClick={() => onPOIClick(poi)}>
                  打卡
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    padding: '0 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  header: {
    marginBottom: '12px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: '2px',
  },
  subtitle: {
    fontSize: '12px',
    color: '#64748b',
  },
  poiList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingRight: '4px',
  },
  loading: {
    textAlign: 'center',
    color: '#64748b',
    padding: '32px 0',
    fontSize: '14px',
  },
  empty: {
    textAlign: 'center',
    padding: '24px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '4px',
  },
  emptySubtext: {
    fontSize: '12px',
    color: '#64748b',
  },
  poiCard: {
    position: 'relative',
    padding: '14px',
    background: '#0f3460',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    transition: 'transform 500ms ease-out',
  },
  checkedDot: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: '#10b981',
    border: '2px solid #0f3460',
    zIndex: 1,
  },
  poiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  poiType: {
    fontSize: '12px',
    fontWeight: 600,
  },
  poiDistance: {
    fontSize: '12px',
    color: '#64748b',
  },
  poiName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: '6px',
  },
  poiDesc: {
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: 1.5,
    marginBottom: '12px',
  },
  poiActions: {
    display: 'flex',
    gap: '8px',
  },
  addBtn: {
    flex: 1,
    padding: '8px 12px',
    background: 'transparent',
    color: '#38bdf8',
    border: '1px solid #38bdf8',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 500ms ease-out',
  },
  checkinBtn: {
    flex: 1,
    padding: '8px 12px',
    background: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'filter 500ms ease-out',
  },
};
