import { useState } from 'react';

interface AddCatModalProps {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    breed: string;
    age: number;
    personality: string[];
    avatar?: string;
  }) => void;
}

const PERSONALITY_OPTIONS = ['活泼', '胆小', '粘人', '高冷', '贪吃', '爱睡'];
const BREED_OPTIONS = ['中华田园猫', '英短', '美短', '布偶猫', '暹罗猫', '波斯猫', '缅因猫', '其他'];

function AddCatModal({ onClose, onSubmit }: AddCatModalProps) {
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('中华田园猫');
  const [age, setAge] = useState(1);
  const [personality, setPersonality] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<string | undefined>();

  const togglePersonality = (p: string) => {
    setPersonality(prev =>
      prev.includes(p)
        ? prev.filter(item => item !== p)
        : [...prev, p]
    );
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), breed, age, personality, avatar });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-enter" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>添加猫咪</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group avatar-upload">
            <label>头像</label>
            <div className="avatar-preview">
              {avatar ? (
                <img src={avatar} alt="头像预览" />
              ) : (
                <div className="avatar-placeholder">🐱</div>
              )}
            </div>
            <label className="upload-btn">
              上传头像
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div className="form-group">
            <label>名字 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="请输入猫咪名字"
              maxLength={20}
              required
            />
          </div>

          <div className="form-group">
            <label>品种</label>
            <select value={breed} onChange={e => setBreed(e.target.value)}>
              {BREED_OPTIONS.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>年龄：{age} 岁</label>
            <input
              type="range"
              min="0"
              max="20"
              value={age}
              onChange={e => setAge(parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>性格标签（可多选）</label>
            <div className="tag-options">
              {PERSONALITY_OPTIONS.map(p => (
                <button
                  key={p}
                  type="button"
                  className={`tag-option ${personality.includes(p) ? 'active' : ''}`}
                  onClick={() => togglePersonality(p)}
                >
                  {p}
                </button>
              ))}
            </div>
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

export default AddCatModal;
