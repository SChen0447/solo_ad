import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PlantIdentifier from './PlantIdentifier';
import PlantCardComponent from './PlantCard';

export interface Prediction {
  name: string;
  confidence: number;
}

export interface PlantData {
  name: string;
  scientificName: string;
  family: string;
  distribution: string;
  description: string;
  imagePrompt: string;
  habitatIcons: { icon: string; label: string }[];
  funFact: string;
}

export interface HistoryItem {
  name: string;
  thumbnail: string;
  timestamp: number;
}

const MAX_HISTORY = 20;
const HISTORY_KEY = 'plant_history';
const NOTES_KEY = 'plant_notes';
const LIKES_KEY = 'plant_likes';
const LIKE_COUNT_KEY = 'plant_like_counts';

export function saveHistory(item: HistoryItem) {
  const raw = localStorage.getItem(HISTORY_KEY);
  const history: HistoryItem[] = raw ? JSON.parse(raw) : [];
  const filtered = history.filter((h) => h.name !== item.name);
  filtered.unshift(item);
  if (filtered.length > MAX_HISTORY) {
    filtered.length = MAX_HISTORY;
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}

export function loadHistory(): HistoryItem[] {
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function saveNote(plantName: string, note: string) {
  const raw = localStorage.getItem(NOTES_KEY);
  const notes: Record<string, string> = raw ? JSON.parse(raw) : {};
  if (note.trim()) {
    notes[plantName] = note;
  } else {
    delete notes[plantName];
  }
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function loadNote(plantName: string): string {
  const raw = localStorage.getItem(NOTES_KEY);
  const notes: Record<string, string> = raw ? JSON.parse(raw) : {};
  return notes[plantName] || '';
}

export function saveLike(plantName: string, liked: boolean) {
  const raw = localStorage.getItem(LIKES_KEY);
  const likes: Record<string, boolean> = raw ? JSON.parse(raw) : {};
  likes[plantName] = liked;
  localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
}

export function loadLike(plantName: string): boolean {
  const raw = localStorage.getItem(LIKES_KEY);
  const likes: Record<string, boolean> = raw ? JSON.parse(raw) : {};
  return !!likes[plantName];
}

export function loadLikeCount(plantName: string): number {
  const raw = localStorage.getItem(LIKE_COUNT_KEY);
  const counts: Record<string, number> = raw ? JSON.parse(raw) : {};
  return counts[plantName] || 0;
}

export function incrementLikeCount(plantName: string): number {
  const raw = localStorage.getItem(LIKE_COUNT_KEY);
  const counts: Record<string, number> = raw ? JSON.parse(raw) : {};
  const current = counts[plantName] || 0;
  const next = current + 1;
  counts[plantName] = next;
  localStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
  return next;
}

export function decrementLikeCount(plantName: string): number {
  const raw = localStorage.getItem(LIKE_COUNT_KEY);
  const counts: Record<string, number> = raw ? JSON.parse(raw) : {};
  const current = counts[plantName] || 0;
  const next = Math.max(0, current - 1);
  counts[plantName] = next;
  localStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(counts));
  return next;
}

export function generateShareId(): string {
  return 'plant-' + Math.random().toString(36).substring(2, 8);
}

function Header() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        borderBottom: '1px solid #dcfce7',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '22px',
            fontWeight: 700,
            color: '#14532d',
          }}
        >
          <span style={{ fontSize: '28px' }}>🌿</span>
          <span>植物智识</span>
        </Link>
        <nav style={{ display: 'flex', gap: '8px' }}>
          <Link
            to="/"
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              color: '#166534',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            识别
          </Link>
          <Link
            to="/history"
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              color: '#166534',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            历史
          </Link>
        </nav>
      </div>
    </header>
  );
}

function HomePage() {
  const navigate = useNavigate();

  const handleSelect = async (prediction: Prediction, thumbnail?: string) => {
    try {
      const res = await fetch(`/api/plants/${encodeURIComponent(prediction.name)}`);
      if (res.ok) {
        if (thumbnail) {
          saveHistory({
            name: prediction.name,
            thumbnail,
            timestamp: Date.now(),
          });
        }
        navigate(`/plant/${encodeURIComponent(prediction.name)}`);
      } else {
        alert(`未找到植物"${prediction.name}"的详细信息`);
      }
    } catch (e) {
      console.error('获取植物详情失败', e);
      alert('网络错误，请稍后再试');
    }
  };

  return (
    <div
      className="page-fade-in"
      style={{
        minHeight: 'calc(100vh - 70px)',
        background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)',
      }}
    >
      <PlantIdentifier onSelectPrediction={handleSelect} />
    </div>
  );
}

function PlantPage({ name }: { name: string }) {
  const [plant, setPlant] = useState<PlantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchPlant() {
      try {
        const res = await fetch(`/api/plants/${encodeURIComponent(name)}`);
        if (res.ok) {
          const data = await res.json();
          setPlant(data);
        } else {
          const err = await res.json();
          setError(err.message || '未找到该植物');
        }
      } catch (e) {
        setError('网络错误，请稍后再试');
      } finally {
        setLoading(false);
      }
    }
    fetchPlant();
  }, [name]);

  if (loading) {
    return (
      <div
        className="page-fade-in"
        style={{
          minHeight: 'calc(100vh - 70px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f0fdf4',
        }}
      >
        <div className="loading-spinner">
          <div className="arc"></div>
          <div className="arc"></div>
          <div className="arc"></div>
        </div>
      </div>
    );
  }

  if (error || !plant) {
    return (
      <div
        className="page-fade-in"
        style={{
          minHeight: 'calc(100vh - 70px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          background: '#f0fdf4',
        }}
      >
        <div style={{ fontSize: '64px' }}>🍃</div>
        <h2 style={{ color: '#14532d' }}>{error || '植物不存在'}</h2>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 32px',
            background: '#22c55e',
            color: '#ffffff',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
          }}
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div
      className="page-fade-in"
      style={{
        minHeight: 'calc(100vh - 70px)',
        background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)',
        padding: '24px 16px',
      }}
    >
      <PlantCardComponent plant={plant} />
    </div>
  );
}

function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleClear = () => {
    clearHistory();
    setHistory([]);
    setShowConfirm(false);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}`;
  };

  const defaultThumb = (name: string) =>
    `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
      name + ' flower botanical'
    )}&image_size=square`;

  return (
    <div
      className="page-fade-in"
      style={{
        minHeight: 'calc(100vh - 70px)',
        background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)',
        padding: '32px 24px',
      }}
    >
      <div
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'Noto Serif SC', serif",
                fontSize: '28px',
                color: '#14532d',
                marginBottom: '4px',
              }}
            >
              浏览历史
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              最多保存最近 {MAX_HISTORY} 条记录 · 共 {history.length} 条
            </p>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => setShowConfirm(true)}
              style={{
                padding: '10px 20px',
                background: '#fee2e2',
                color: '#dc2626',
                borderRadius: '8px',
                fontWeight: 500,
                fontSize: '14px',
                border: '1px solid #fecaca',
              }}
            >
              🗑️ 清空历史
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '64px 24px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
            <h3 style={{ color: '#14532d', marginBottom: '8px' }}>暂无浏览记录</h3>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              上传一张植物照片开始识别吧！
            </p>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '12px 28px',
                background: '#22c55e',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '15px',
              }}
            >
              立即识别
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            {history.map((item, idx) => (
              <div
                key={`${item.name}-${item.timestamp}-${idx}`}
                onClick={() => navigate(`/plant/${encodeURIComponent(item.name)}`)}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  border: '1px solid #dcfce7',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#f0fdf4',
                    marginBottom: '10px',
                  }}
                >
                  <img
                    src={item.thumbnail || defaultThumb(item.name)}
                    alt={item.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = defaultThumb(item.name);
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Serif SC', serif",
                    fontSize: '17px',
                    fontWeight: 600,
                    color: '#14532d',
                    marginBottom: '4px',
                  }}
                >
                  {item.name}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {formatTime(item.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}

        {showConfirm && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '16px',
            }}
          >
            <div
              className="page-fade-in"
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '28px',
                maxWidth: '380px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              }}
            >
              <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '12px' }}>
                ⚠️
              </div>
              <h3
                style={{
                  color: '#14532d',
                  textAlign: 'center',
                  marginBottom: '8px',
                  fontSize: '18px',
                }}
              >
                确认清空历史？
              </h3>
              <p
                style={{
                  color: '#6b7280',
                  textAlign: 'center',
                  marginBottom: '24px',
                  fontSize: '14px',
                }}
              >
                此操作将删除所有浏览记录，且无法恢复
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                }}
              >
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#f3f4f6',
                    color: '#374151',
                    borderRadius: '8px',
                    fontWeight: 500,
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleClear}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#ef4444',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontWeight: 600,
                  }}
                >
                  确认清空
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/plant/:name" element={<PlantRouteHandler />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>
    </div>
  );
}

function PlantRouteHandler() {
  const { name } = useParams<{ name: string }>();
  return <PlantPage name={name || ''} />;
}

export default App;
