import React, { useState } from 'react';
import './SongForm.css';

export interface SongFormData {
  name: string;
  artist: string;
  bpm: number;
  duration: number;
  notes: string;
}

interface SongFormProps {
  onSubmit: (data: SongFormData) => void;
  onCancel: () => void;
  initialData?: Partial<SongFormData>;
}

const SongForm: React.FC<SongFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState<SongFormData>({
    name: initialData?.name || '',
    artist: initialData?.artist || '',
    bpm: initialData?.bpm || 120,
    duration: initialData?.duration || 0,
    notes: initialData?.notes || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'bpm' || name === 'duration' ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  return (
    <div className="song-form-overlay" onClick={onCancel}>
      <div className="song-form-modal" onClick={e => e.stopPropagation()}>
        <h2 className="form-title">添加曲目</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">曲名 *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="输入曲目名称"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="artist">艺术家</label>
            <input
              type="text"
              id="artist"
              name="artist"
              value={formData.artist}
              onChange={handleChange}
              placeholder="艺术家或乐队名称"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="bpm">BPM *</label>
              <input
                type="number"
                id="bpm"
                name="bpm"
                value={formData.bpm}
                onChange={handleChange}
                min="20"
                max="300"
              />
            </div>

            <div className="form-group">
              <label htmlFor="duration">时长（秒）</label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="0"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">备注</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="排练注意事项、难点提示等..."
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={!formData.name.trim()}>
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SongForm;
