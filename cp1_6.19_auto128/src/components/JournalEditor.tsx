import React, { useState, useRef, useEffect } from 'react';
import type { TravelLocation, Journal, Photo, LocationWithJournal } from '../types';
import { WEATHER_OPTIONS, MOOD_OPTIONS, COUNTRY_FLAGS } from '../types';
import {
  createLocation,
  createJournal,
  updateJournal,
  uploadPhotos,
} from '../services/api';

interface JournalEditorProps {
  mode: 'create-location' | 'edit-journal';
  userId: string;
  latlng?: { lat: number; lng: number };
  location?: LocationWithJournal;
  journal?: Journal;
  onClose: () => void;
  onLocationCreated?: (loc: TravelLocation) => void;
  onJournalSaved?: (journal: Journal) => void;
  onOpenPhotos?: (photos: Photo[], startIndex: number) => void;
}

const JournalEditor: React.FC<JournalEditorProps> = ({
  mode,
  userId,
  latlng,
  location,
  journal: initialJournal,
  onClose,
  onLocationCreated,
  onJournalSaved,
  onOpenPhotos,
}) => {
  const isViewOnly = mode === 'edit-journal' && !!initialJournal;
  const [isEditing, setIsEditing] = useState(!isViewOnly);

  const [city, setCity] = useState(location?.city || '');
  const [country, setCountry] = useState(location?.country || '');
  const [arrivalDate, setArrivalDate] = useState(
    location?.arrivalDate || new Date().toISOString().slice(0, 10)
  );
  const [daysStayed, setDaysStayed] = useState<number>(location?.daysStayed || 1);

  const [title, setTitle] = useState(initialJournal?.title || '');
  const [content, setContent] = useState(initialJournal?.content || '');
  const [weather, setWeather] = useState(initialJournal?.weather || '');
  const [mood, setMood] = useState(initialJournal?.mood || '');
  const [photos, setPhotos] = useState<Photo[]>(initialJournal?.photos || []);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (country && COUNTRY_FLAGS[country]) {
      /* noop */
    }
  }, [country]);

  const getFlagColor = (): string => {
    return COUNTRY_FLAGS[country] || '#e74c3c';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (photos.length + files.length > 6) {
      setError('最多只能上传6张图片');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const fileArr = Array.from(files).filter(
        (f) => f.type === 'image/jpeg' || f.type === 'image/png'
      );
      if (fileArr.length === 0) {
        throw new Error('只支持 JPG 和 PNG 格式');
      }
      const uploaded = await uploadPhotos(fileArr);
      setPhotos((prev) => [...prev, ...uploaded].slice(0, 6));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '上传失败';
      setError(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveLocation = async () => {
    if (!latlng) return;
    if (!city.trim() || !country.trim()) {
      setError('请填写城市和国家');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const newLoc = await createLocation({
        userId,
        city: city.trim(),
        country: country.trim(),
        lat: latlng.lat,
        lng: latlng.lng,
        arrivalDate,
        daysStayed,
        flagColor: getFlagColor(),
      });
      onLocationCreated?.(newLoc);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '保存失败';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveJournal = async () => {
    if (!location) return;
    if (!title.trim()) {
      setError('请输入游记标题');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        locationId: location.id,
        userId,
        title: title.trim(),
        content: content.trim(),
        weather,
        mood,
        photos,
      };
      const saved = initialJournal
        ? await updateJournal(initialJournal.id, payload)
        : await createJournal(payload);
      onJournalSaved?.(saved);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '保存失败';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const renderCreateLocation = () => (
    <>
      <div className="modal-header">
        <h2 className="modal-title">📍 添加旅行地点</h2>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">城市 *</label>
            <input
              className="form-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="如：东京"
            />
          </div>
          <div className="form-group">
            <label className="form-label">国家 *</label>
            <input
              className="form-input"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="如：日本"
              list="country-list"
            />
            <datalist id="country-list">
              {Object.keys(COUNTRY_FLAGS).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">到达日期</label>
            <input
              type="date"
              className="form-input"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">停留天数</label>
            <input
              type="number"
              min={1}
              className="form-input"
              value={daysStayed}
              onChange={(e) => setDaysStayed(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">经纬度</label>
          <div style={{ fontSize: 13, color: '#7f8c8d', padding: '10px 12px', background: '#f8f9fa', borderRadius: 8 }}>
            {latlng?.lat.toFixed(4)}, {latlng?.lng.toFixed(4)}
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>取消</button>
          <button className="btn btn-primary" onClick={handleSaveLocation} disabled={saving}>
            {saving ? '保存中...' : '保存地点'}
          </button>
        </div>
      </div>
    </>
  );

  const renderViewJournal = () => (
    <>
      <div className="modal-header">
        <h2 className="modal-title">📖 {initialJournal?.title || '游记'}</h2>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      {isEditing ? (
        <div className="modal-body">
          {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">标题 *</label>
            <input
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给你的游记起个标题"
            />
          </div>
          <div className="form-group">
            <label className="form-label">天气</label>
            <div className="tags-container">
              {WEATHER_OPTIONS.map((w) => (
                <div
                  key={w}
                  className={`tag ${weather === w ? 'active' : ''}`}
                  onClick={() => setWeather(weather === w ? '' : w)}
                >
                  {w}
                </div>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">心情</label>
            <div className="emoji-picker">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`emoji-btn ${mood === m ? 'active' : ''}`}
                  onClick={() => setMood(mood === m ? '' : m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">正文</label>
            <textarea
              className="form-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="记录下这段美好的回忆..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">图片（最多6张）</label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            {photos.length < 6 && (
              <div
                className="image-upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? '上传中...' : `📷 点击上传图片 (${photos.length}/6)`}
              </div>
            )}
            {photos.length > 0 && (
              <div className="image-grid">
                {photos.map((photo, idx) => (
                  <div key={idx} className="image-item">
                    <img src={photo.url} alt={photo.title} loading="lazy" />
                    <button
                      className="image-item-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(idx);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => isViewOnly && setIsEditing(false)} disabled={saving}>
              取消
            </button>
            <button className="btn btn-primary" onClick={handleSaveJournal} disabled={saving || uploading}>
              {saving ? '保存中...' : '保存游记'}
            </button>
          </div>
        </div>
      ) : (
        <div className="journal-view-content">
          <div className="journal-header">
            <h2 className="journal-title">
              {initialJournal?.title}
              {initialJournal?.mood && (
                <span style={{ marginLeft: 10, fontSize: 24 }}>{initialJournal.mood}</span>
              )}
            </h2>
            <div className="journal-meta">
              <span>📍 {location?.city}, {location?.country}</span>
              <span>📅 {location?.arrivalDate}</span>
              {initialJournal?.weather && (
                <span className="journal-meta-tag">{initialJournal.weather}</span>
              )}
            </div>
          </div>
          {initialJournal?.content && (
            <div className="journal-body">{initialJournal.content}</div>
          )}
          {initialJournal?.photos && initialJournal.photos.length > 0 && (
            <div className="journal-photos">
              {initialJournal.photos.map((photo, idx) => (
                <div
                  key={idx}
                  className="journal-photo"
                  onClick={() => onOpenPhotos?.(initialJournal!.photos!, idx)}
                >
                  <img src={photo.url} alt={photo.title} loading="lazy" />
                </div>
              ))}
            </div>
          )}
          <div style={{ padding: '0 24px 24px' }}>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={onClose}>关闭</button>
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>编辑</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderCreateJournal = () => (
    <>
      <div className="modal-header">
        <h2 className="modal-title">✏️ 写游记 - {location?.city}</h2>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}
        <div className="form-group">
          <label className="form-label">标题 *</label>
          <input
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给你的游记起个标题"
          />
        </div>
        <div className="form-group">
          <label className="form-label">天气</label>
          <div className="tags-container">
            {WEATHER_OPTIONS.map((w) => (
              <div
                key={w}
                className={`tag ${weather === w ? 'active' : ''}`}
                onClick={() => setWeather(weather === w ? '' : w)}
              >
                {w}
              </div>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">心情</label>
          <div className="emoji-picker">
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                className={`emoji-btn ${mood === m ? 'active' : ''}`}
                onClick={() => setMood(mood === m ? '' : m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">正文</label>
          <textarea
            className="form-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="记录下这段美好的回忆..."
          />
        </div>
        <div className="form-group">
          <label className="form-label">图片（最多6张）</label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          {photos.length < 6 && (
            <div
              className="image-upload-area"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? '上传中...' : `📷 点击上传图片 (${photos.length}/6)`}
            </div>
          )}
          {photos.length > 0 && (
            <div className="image-grid">
              {photos.map((photo, idx) => (
                <div key={idx} className="image-item">
                  <img src={photo.url} alt={photo.title} loading="lazy" />
                  <button
                    className="image-item-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(idx);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>取消</button>
          <button className="btn btn-primary" onClick={handleSaveJournal} disabled={saving || uploading}>
            {saving ? '保存中...' : '发布游记'}
          </button>
        </div>
      </div>
    </>
  );

  const renderBody = () => {
    if (mode === 'create-location') {
      return renderCreateLocation();
    }
    if (initialJournal) {
      return renderViewJournal();
    }
    return renderCreateJournal();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {renderBody()}
      </div>
    </div>
  );
};

export default JournalEditor;
