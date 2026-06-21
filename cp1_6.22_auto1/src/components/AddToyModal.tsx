import { useState } from 'react';
import { ToyType, ToyMaterial, DangerLevel } from '../utils/database';

interface AddToyModalProps {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    type: ToyType;
    material: ToyMaterial;
    danger_level: DangerLevel;
    image?: string;
    description?: string;
  }) => void;
}

const TYPE_OPTIONS: { value: ToyType; label: string }[] = [
  { value: 'chase', label: '追逐型' },
  { value: 'scratch', label: '抓挠型' },
  { value: 'puzzle', label: '智力型' },
];

const MATERIAL_OPTIONS: ToyMaterial[] = ['plastic', 'cloth', 'feather', 'wood', 'rubber', 'other'];
const MATERIAL_LABELS: Record<ToyMaterial, string> = {
  plastic: '塑料',
  cloth: '布料',
  feather: '羽毛',
  wood: '木质',
  rubber: '橡胶',
  other: '其他',
};

const DANGER_OPTIONS: { value: DangerLevel; label: string; icon: string }[] = [
  { value: 'safe', label: '安全', icon: '😊' },
  { value: 'supervise', label: '需监督', icon: '⚠️' },
  { value: 'avoid', label: '避免', icon: '❌' },
];

function AddToyModal({ onClose, onSubmit }: AddToyModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ToyType>('chase');
  const [material, setMaterial] = useState<ToyMaterial>('plastic');
  const [dangerLevel, setDangerLevel] = useState<DangerLevel>('safe');
  const [image, setImage] = useState<string | undefined>();
  const [description, setDescription] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      type,
      material,
      danger_level: dangerLevel,
      image,
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-enter" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>添加玩具</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group image-upload">
            <label>玩具图片</label>
            <div className="image-preview">
              {image ? (
                <img src={image} alt="玩具预览" />
              ) : (
                <div className="image-placeholder">📷</div>
              )}
            </div>
            <label className="upload-btn">
              上传图片
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div className="form-group">
            <label>玩具名称 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="请输入玩具名称"
              maxLength={30}
              required
            />
          </div>

          <div className="form-group">
            <label>玩具类型</label>
            <div className="type-options">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`type-option ${type === opt.value ? `active ${opt.value}` : ''}`}
                  onClick={() => setType(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>材质</label>
            <select value={material} onChange={e => setMaterial(e.target.value as ToyMaterial)}>
              {MATERIAL_OPTIONS.map(m => (
                <option key={m} value={m}>{MATERIAL_LABELS[m]}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>危险等级</label>
            <div className="danger-options">
              {DANGER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`danger-option ${dangerLevel === opt.value ? 'active' : ''}`}
                  onClick={() => setDangerLevel(opt.value)}
                >
                  <span className="danger-icon">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>描述（选填）</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="简单描述一下这个玩具..."
              rows={3}
              maxLength={200}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-btn" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="primary-btn" disabled={!name.trim()}>
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddToyModal;
