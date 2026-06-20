import React, { useState, useEffect, useRef } from 'react';
import type { TravelMemory } from '@/types';
import '@styles/MarkerForm.css';

interface MarkerFormProps {
  position: { lat: number; lng: number } | null;
  editingMemory: TravelMemory | null;
  onSubmit: (data: Omit<TravelMemory, 'id' | 'createdAt'>) => void;
  onUpdate: (
    id: string,
    data: Partial<Omit<TravelMemory, 'id' | 'createdAt'>>
  ) => void;
  onClose: () => void;
  compressImage: (file: File, maxSizeKB?: number) => Promise<string>;
}

export function MarkerForm({
  position,
  editingMemory,
  onSubmit,
  onUpdate,
  onClose,
  compressImage,
}: MarkerFormProps): React.JSX.Element | null {
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(3);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMemory) {
      setName(editingMemory.name);
      setPhoto(editingMemory.photo);
      setNote(editingMemory.note);
      setRating(editingMemory.rating);
      setCountry(editingMemory.country ?? '');
      setCity(editingMemory.city ?? '');
    } else {
      setName('');
      setPhoto('');
      setNote('');
      setRating(3);
      setCountry('');
      setCity('');
    }

    setIsVisible(true);

    return () => {
      setIsVisible(false);
    };
  }, [editingMemory, position]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 100);
      setPhoto(compressed);
    } catch (err) {
      console.error('图片压缩失败:', err);
    }
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    const baseData = {
      name: name.trim(),
      photo,
      note: note.trim(),
      rating,
      country: country.trim() || undefined,
      city: city.trim() || undefined,
    };

    if (editingMemory) {
      onUpdate(editingMemory.id, baseData);
    } else if (position) {
      onSubmit({
        ...baseData,
        lat: position.lat,
        lng: position.lng,
        visitedAt: Date.now(),
      });
    }

    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
    }, 100);
  };

  const handleClose = (): void => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  if (!position && !editingMemory) return null;

  return (
    <div className={`form-overlay ${isVisible ? 'visible' : ''}`}>
      <div className={`form-container ${isVisible ? 'visible' : ''}`}>
        <button className="form-close" onClick={handleClose}>
          ×
        </button>

        <h2 className="form-title">
          {editingMemory ? '✏️ 编辑旅行记忆' : '📍 添加新地点'}
        </h2>

        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-group">
            <label>地点名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：埃菲尔铁塔"
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>城市</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="例如：巴黎"
              />
            </div>
            <div className="form-group">
              <label>国家</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="例如：法国"
              />
            </div>
          </div>

          <div className="form-group">
            <label>照片</label>
            <div className="photo-uploader">
              {photo ? (
                <div className="photo-preview">
                  <img src={photo} alt="预览" />
                  <button
                    type="button"
                    className="photo-remove"
                    onClick={() => setPhoto('')}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="photo-placeholder"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="photo-icon">📷</span>
                  <span>点击上传照片</span>
                  <span className="photo-hint">自动压缩到 100KB 以内</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>笔记</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="记录一下你在这里的感受..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>评分</label>
            <div className="rating-picker">
              {Array.from({ length: 5 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`rating-star ${i < rating ? 'filled' : ''}`}
                  onClick={() => setRating(i + 1)}
                >
                  ★
                </button>
              ))}
              <span className="rating-value">{rating} / 5</span>
            </div>
          </div>

          <button
            type="submit"
            className="form-submit"
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? '保存中...' : editingMemory ? '更新记忆' : '保存记忆'}
          </button>
        </form>
      </div>
    </div>
  );
}
