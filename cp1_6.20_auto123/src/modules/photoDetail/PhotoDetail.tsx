import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import type { Photo, PhotoDetail as PhotoDetailType } from '../../types';
import { formatDate } from '../../utils';

interface Props {
  photos: Photo[];
  onPhotoUpdate: (photo: Photo) => void;
  onBack: () => void;
}

export default function PhotoDetail({ photos, onPhotoUpdate, onBack }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PhotoDetailType | null>(null);
  const [newTag, setNewTag] = useState('');
  const [direction, setDirection] = useState(0);

  const loadDetail = useCallback(async (photoId: string) => {
    try {
      const res = await axios.get<PhotoDetailType>(`/detail/${photoId}`);
      setDetail(res.data);
    } catch (err) {
      console.error('Failed to load photo detail', err);
    }
  }, []);

  useEffect(() => {
    if (id) loadDetail(id);
  }, [id, loadDetail]);

  const sortedPhotos = [...photos].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );

  const currentIndex = sortedPhotos.findIndex((p) => p.id === id);

  const goPrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      navigate(`/photo/${sortedPhotos[currentIndex - 1].id}`);
    }
  };

  const goNext = () => {
    if (currentIndex < sortedPhotos.length - 1) {
      setDirection(1);
      navigate(`/photo/${sortedPhotos[currentIndex + 1].id}`);
    }
  };

  const addTag = async () => {
    if (!newTag.trim() || !detail) return;
    try {
      const res = await axios.post<string[]>(`/photos/${detail.id}/tags`, {
        tag: newTag.trim(),
      });
      const updated = { ...detail, tags: res.data };
      setDetail(updated);
      onPhotoUpdate(updated);
      setNewTag('');
    } catch (err) {
      console.error('Failed to add tag', err);
    }
  };

  const removeTag = async (tag: string) => {
    if (!detail) return;
    try {
      const res = await axios.delete<string[]>(`/photos/${detail.id}/tags/${encodeURIComponent(tag)}`);
      const updated = { ...detail, tags: res.data };
      setDetail(updated);
      onPhotoUpdate(updated);
    } catch (err) {
      console.error('Failed to remove tag', err);
    }
  };

  if (!detail) {
    return (
      <div className="detail-loading">
        <div className="loading-spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="photo-detail">
      <div className="detail-mask" />

      <button className="detail-back" onClick={onBack}>
        ← 返回
      </button>

      {currentIndex > 0 && (
        <motion.button
          className="detail-arrow left-arrow"
          onClick={goPrev}
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.7)' }}
          whileTap={{ scale: 0.95 }}
        >
          ‹
        </motion.button>
      )}

      {currentIndex < sortedPhotos.length - 1 && (
        <motion.button
          className="detail-arrow right-arrow"
          onClick={goNext}
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.7)' }}
          whileTap={{ scale: 0.95 }}
        >
          ›
        </motion.button>
      )}

      <div className="detail-content">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={detail.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="detail-main"
          >
            <div className="detail-image-wrap">
              <img
                src={detail.url}
                alt={detail.originalName}
                className="detail-image"
                loading="lazy"
              />
            </div>

            <div className="detail-info-row">
              <div className="detail-exif">
                <h3 className="detail-title">{formatDate(detail.capturedAt)}</h3>
                <div className="exif-grid">
                  <div className="exif-item">
                    <span className="exif-label">设备</span>
                    <span className="exif-value">{detail.device}</span>
                  </div>
                  {detail.focalLength && (
                    <div className="exif-item">
                      <span className="exif-label">焦距</span>
                      <span className="exif-value">{detail.focalLength}</span>
                    </div>
                  )}
                  {detail.aperture && (
                    <div className="exif-item">
                      <span className="exif-label">光圈</span>
                      <span className="exif-value">{detail.aperture}</span>
                    </div>
                  )}
                  {detail.iso && (
                    <div className="exif-item">
                      <span className="exif-label">ISO</span>
                      <span className="exif-value">{detail.iso}</span>
                    </div>
                  )}
                  {detail.gps && (
                    <div className="exif-item">
                      <span className="exif-label">GPS</span>
                      <span className="exif-value">
                        {detail.gps.latitude.toFixed(4)}, {detail.gps.longitude.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-tags">
                <h4 className="tags-title">标签</h4>
                <div className="tags-list">
                  {detail.tags.length === 0 && (
                    <span className="tags-empty">暂无标签</span>
                  )}
                  {detail.tags.map((t) => (
                    <motion.span
                      key={t}
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="tag-pill"
                    >
                      {t}
                      <button
                        className="tag-remove"
                        onClick={() => removeTag(t)}
                      >
                        ×
                      </button>
                    </motion.span>
                  ))}
                </div>
                <div className="tag-add">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    placeholder="输入新标签"
                    className="tag-input"
                  />
                  <button onClick={addTag} className="btn-tag-add">
                    添加
                  </button>
                </div>
              </div>
            </div>

            {detail.nearby && detail.nearby.length > 0 && (
              <div className="nearby-section">
                <h4 className="nearby-title">附近照片 (500米内)</h4>
                <div className="nearby-scroll">
                  {detail.nearby.map((n) => (
                    <motion.div
                      key={n.id}
                      className="nearby-card"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => {
                        setDirection(n.id > detail.id ? 1 : -1);
                        navigate(`/photo/${n.id}`);
                      }}
                    >
                      <img src={n.url} alt="" className="nearby-thumb" />
                      <span className="nearby-distance">{n.distance}m</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
