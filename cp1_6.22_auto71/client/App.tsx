import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import TravelCard from './components/TravelCard';
import MapView from './components/MapView';
import { exportMapAsImage } from './utils/exportImage';

interface Travel {
  id: string;
  name: string;
  city: string;
  start_date: string;
  end_date: string;
  summary: string;
  created_at: string;
}

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

const CITY_COORDS: Record<string, [number, number]> = {
  '北京': [39.9042, 116.4074],
  '上海': [31.2304, 121.4737],
  '广州': [23.1291, 113.2644],
  '深圳': [22.5431, 114.0579],
  '成都': [30.5728, 104.0668],
  '杭州': [30.2741, 120.1551],
  '西安': [34.3416, 108.9398],
  '重庆': [29.4316, 106.9123],
  '南京': [32.0603, 118.7969],
  '武汉': [30.5928, 114.3055],
  '长沙': [28.2282, 112.9388],
  '厦门': [24.4798, 118.0894],
  '青岛': [36.0671, 120.3826],
  '大连': [38.9140, 121.6147],
  '三亚': [18.2528, 109.5120],
  '丽江': [26.8721, 100.2299],
  '拉萨': [29.6500, 91.1000],
  '香港': [22.3193, 114.1694],
  '台北': [25.0330, 121.5654],
  '东京': [35.6762, 139.6503],
  '巴黎': [48.8566, 2.3522],
  '伦敦': [51.5074, -0.1278],
  '纽约': [40.7128, -74.0060],
  '悉尼': [-33.8688, 151.2093],
  '罗马': [41.9028, 12.4964],
  '曼谷': [13.7563, 100.5018],
  '首尔': [37.5665, 126.9780],
  '新加坡': [1.3521, 103.8198],
};

function getCityCoords(city: string): [number, number] {
  return CITY_COORDS[city] || [39.9042, 116.4074];
}

function Navbar() {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: 'rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      zIndex: 1000,
    }}>
      <Link to="/" style={{
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontSize: '24px' }}>🌍</span>
        <span style={{
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
          fontSize: '20px',
        }}>
          旅行足迹
        </span>
      </Link>
    </nav>
  );
}

function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '200px',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid rgba(102,126,234,0.2)',
        borderTop: '4px solid #667eea',
        borderRadius: '50%',
        animation: 'spin 2s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function HomePage() {
  const [travels, setTravels] = useState<Travel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    start_date: '',
    end_date: '',
    summary: '',
  });
  const navigate = useNavigate();

  const fetchTravels = useCallback(async () => {
    try {
      const res = await fetch('/api/travels');
      const data = await res.json();
      setTravels(data);
    } catch (err) {
      console.error('Failed to fetch travels:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTravels();
  }, [fetchTravels]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/travels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const newTravel = await res.json();
      setTravels((prev) => [newTravel, ...prev]);
      setShowForm(false);
      setFormData({ name: '', city: '', start_date: '', end_date: '', summary: '' });
      navigate(`/travel/${newTravel.id}`);
    } catch (err) {
      console.error('Failed to create travel:', err);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 24px 40px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
      }}>
        <h1 style={{
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: '28px',
          fontWeight: 700,
          margin: 0,
        }}>
          我的旅行
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'filter 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.9)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
        >
          {showForm ? '取消' : '+ 新建旅行'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <style>{`@keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>旅行名称</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：东京漫步之旅"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>目的地城市</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="如：东京"
                list="city-list"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <datalist id="city-list">
                {Object.keys(CITY_COORDS).map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>出发日期</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>结束日期</label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>旅行总结</label>
            <textarea
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="写下你的旅行感悟… ✨"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              padding: '10px 32px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'filter 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.9)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            创建旅行
          </button>
        </form>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : travels.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          color: '#a0aec0',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <p style={{ fontSize: '16px' }}>还没有旅行记录，点击「新建旅行」开始记录吧</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
        }}
        className="travel-grid"
        >
          {travels.map((travel, index) => (
            <TravelCard key={travel.id} travel={travel} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

function TravelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [travel, setTravel] = useState<Travel | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPOIForm, setShowPOIForm] = useState(false);
  const [poiForm, setPoiForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    arrived_at: '',
    description: '',
    image_urls: '',
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.9042, 116.4074]);
  const [exporting, setExporting] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [travelRes, routeRes] = await Promise.all([
        fetch(`/api/travels/${id}`),
        fetch(`/api/travels/${id}/route`),
      ]);
      const travelData = await travelRes.json();
      const routeData = await routeRes.json();
      setTravel(travelData);
      setPois(routeData.pois);
      setSegments(routeData.segments);
      setMapCenter(getCityCoords(travelData.city));
    } catch (err) {
      console.error('Failed to fetch travel detail:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddPOI = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      const imageUrls = poiForm.image_urls
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url.length > 0)
        .slice(0, 5);
      const res = await fetch(`/api/travels/${id}/pois`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: poiForm.name,
          latitude: parseFloat(poiForm.latitude),
          longitude: parseFloat(poiForm.longitude),
          arrived_at: poiForm.arrived_at,
          description: poiForm.description,
          image_urls: imageUrls,
        }),
      });
      if (res.ok) {
        setShowPOIForm(false);
        setPoiForm({ name: '', latitude: '', longitude: '', arrived_at: '', description: '', image_urls: '' });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to add POI:', err);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setPoiForm((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
    setShowPOIForm(true);
  };

  const handleExport = async () => {
    if (!mapContainerRef.current) return;
    setExporting(true);
    try {
      const blob = await exportMapAsImage(mapContainerRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${travel?.name || 'travel'}-route.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ paddingTop: '56px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!travel) {
    return (
      <div style={{ paddingTop: '80px', textAlign: 'center', color: '#a0aec0' }}>
        <p>旅行记录不存在</p>
        <button onClick={() => navigate('/')} style={{
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white',
          border: 'none',
          padding: '8px 20px',
          borderRadius: '8px',
          cursor: 'pointer',
          marginTop: '12px',
        }}>
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '56px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '16px 24px',
        background: 'white',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f7fafc'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
          >
            ← 返回
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#2d3748' }}>
              {travel.name}
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#a0aec0' }}>
              {travel.city} · {travel.start_date} ~ {travel.end_date}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowPOIForm(!showPOIForm)}
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'filter 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.9)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            + 添加足迹
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              background: exporting ? '#e2e8f0' : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: exporting ? '#a0aec0' : 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: exporting ? 'not-allowed' : 'pointer',
              transition: 'filter 0.2s ease',
            }}
            onMouseEnter={(e) => { if (!exporting) e.currentTarget.style.filter = 'brightness(0.9)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            {exporting ? '导出中…' : '📷 导出路线图'}
          </button>
        </div>
      </div>

      {showPOIForm && (
        <div style={{
          padding: '16px 24px',
          background: 'white',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          animation: 'slideIn 0.3s ease-out',
          flexShrink: 0,
        }}>
          <style>{`@keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <form onSubmit={handleAddPOI} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#718096', marginBottom: '4px' }}>地点名称</label>
              <input type="text" required value={poiForm.name} onChange={(e) => setPoiForm({ ...poiForm, name: e.target.value })} placeholder="如：浅草寺" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: '1 1 100px', minWidth: '100px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#718096', marginBottom: '4px' }}>纬度</label>
              <input type="text" required value={poiForm.latitude} onChange={(e) => setPoiForm({ ...poiForm, latitude: e.target.value })} placeholder="点击地图获取" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: '1 1 100px', minWidth: '100px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#718096', marginBottom: '4px' }}>经度</label>
              <input type="text" required value={poiForm.longitude} onChange={(e) => setPoiForm({ ...poiForm, longitude: e.target.value })} placeholder="点击地图获取" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: '1 1 160px', minWidth: '160px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#718096', marginBottom: '4px' }}>到达时间</label>
              <input type="datetime-local" required value={poiForm.arrived_at} onChange={(e) => setPoiForm({ ...poiForm, arrived_at: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: '2 1 200px', minWidth: '160px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#718096', marginBottom: '4px' }}>描述</label>
              <input type="text" value={poiForm.description} onChange={(e) => setPoiForm({ ...poiForm, description: e.target.value })} placeholder="简短描述" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: '2 1 200px', minWidth: '160px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#718096', marginBottom: '4px' }}>图片链接(每行一个,最多5)</label>
              <textarea value={poiForm.image_urls} onChange={(e) => setPoiForm({ ...poiForm, image_urls: e.target.value })} placeholder="https://..." rows={2} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <button type="submit" style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'filter 0.2s ease',
              whiteSpace: 'nowrap',
              height: '36px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.9)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
            >
              添加
            </button>
          </form>
        </div>
      )}

      <div ref={mapContainerRef} style={{ flex: 1, position: 'relative' }}>
        <MapView
          center={mapCenter}
          pois={pois}
          segments={segments}
          onMapClick={handleMapClick}
        />
      </div>

      {travel.summary && (
        <div style={{
          padding: '12px 24px',
          background: 'white',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          fontSize: '14px',
          color: '#4a5568',
          flexShrink: 0,
        }}>
          ✨ {travel.summary}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{
        minHeight: '100vh',
        background: '#f7fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <style>{`
          @keyframes cardSlideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @media (max-width: 1024px) {
            .travel-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (max-width: 640px) {
            .travel-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/travel/:id" element={<TravelDetailPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
