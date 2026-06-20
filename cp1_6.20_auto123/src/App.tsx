import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import UploadPanel from './modules/photoUpload/UploadPanel';
import MapView from './modules/mapView/MapView';
import TimelineFilter from './modules/timelineFilter/TimelineFilter';
import PhotoDetail from './modules/photoDetail/PhotoDetail';
import type { Photo, FilterState } from './types';

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filter, setFilter] = useState<FilterState>({ month: null, tag: '' });
  const [showUpload, setShowUpload] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/photos').then((res) => setPhotos(res.data)).catch(() => {});
  }, []);

  const handleUpload = (photo: Photo) => {
    setPhotos((prev) => [photo, ...prev]);
  };

  const handlePhotoUpdate = (photo: Photo) => {
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? photo : p)));
  };

  const filteredPhotos = photos.filter((p) => {
    if (filter.month !== null) {
      const dt = new Date(p.capturedAt);
      if (dt.getMonth() + 1 !== filter.month) return false;
    }
    if (filter.tag && !p.tags.some((t) => t.toLowerCase().includes(filter.tag.toLowerCase()))) {
      return false;
    }
    return true;
  });

  const stats = {
    total: photos.length,
    geotagged: photos.filter((p) => p.hasGps).length,
    notGeotagged: photos.filter((p) => !p.hasGps).length,
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="app">
            <header className="navbar">
              <div className="navbar-left">
                <div className="logo">📸</div>
                <span className="title">照片地理标记</span>
              </div>
              <div className="navbar-right">
                <button className="btn-primary" onClick={() => setShowUpload(true)}>
                  上传照片
                </button>
              </div>
            </header>

            <main className="main-content">
              <MapView
                photos={filteredPhotos}
                onPhotoClick={(id) => navigate(`/photo/${id}`)}
                onPhotoUpdate={handlePhotoUpdate}
              />

              <TimelineFilter
                photos={photos}
                filter={filter}
                onFilterChange={setFilter}
              />

              <div className="status-bar">
                <span>共 {stats.total} 张</span>
                <span className="status-divider">|</span>
                <span className="status-success">已标注 {stats.geotagged}</span>
                <span className="status-divider">|</span>
                <span className="status-warning">未标注 {stats.notGeotagged}</span>
              </div>
            </main>

            {showUpload && (
              <div className="modal-overlay" onClick={() => setShowUpload(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>上传照片</h3>
                    <button className="btn-close" onClick={() => setShowUpload(false)}>×</button>
                  </div>
                  <UploadPanel onUpload={handleUpload} onUploadDone={() => {}} />
                </div>
              </div>
            )}
          </div>
        }
      />
      <Route
        path="/photo/:id"
        element={
          <PhotoDetail
            photos={photos}
            onPhotoUpdate={handlePhotoUpdate}
            onBack={() => navigate('/')}
          />
        }
      />
    </Routes>
  );
}
