import { useState } from 'react';
import { CatAvatar, DogAvatar, RabbitAvatar } from './PetAvatars';

interface AdoptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdopt: (name: string, species: 'cat' | 'dog' | 'rabbit') => void;
}

const SPECIES_OPTIONS = [
  { key: 'cat' as const, label: '猫', avatar: <CatAvatar size={60} /> },
  { key: 'dog' as const, label: '狗', avatar: <DogAvatar size={60} /> },
  { key: 'rabbit' as const, label: '兔', avatar: <RabbitAvatar size={60} /> },
];

export default function AdoptModal({ isOpen, onClose, onAdopt }: AdoptModalProps) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'cat' | 'dog' | 'rabbit'>('cat');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('请输入宠物名字');
      return;
    }
    if (trimmed.length > 10) {
      setError('名字最多10个字符');
      return;
    }
    onAdopt(trimmed, species);
    setName('');
    setSpecies('cat');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#4a3728',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          🐾 领养新宠物
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#666',
              marginBottom: '8px',
            }}>
              宠物名字 <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              maxLength={10}
              placeholder="给你的宠物取个名字吧"
              style={{
                width: '100%',
                height: '42px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '0 12px',
                fontSize: '15px',
                color: '#4a3728',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.3s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#f5a623')}
              onBlur={(e) => (e.target.style.borderColor = '#ddd')}
            />
            {error && (
              <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{error}</div>
            )}
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px', textAlign: 'right' }}>
              {name.length}/10
            </div>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#666',
              marginBottom: '12px',
            }}>
              选择种类
            </label>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              {SPECIES_OPTIONS.map((opt) => (
                <div
                  key={opt.key}
                  onClick={() => setSpecies(opt.key)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '12px',
                    borderRadius: '12px',
                    border: species === opt.key ? '3px solid #f5a623' : '2px solid #eee',
                    transition: 'all 0.3s ease',
                    background: species === opt.key ? '#fff8f0' : '#fff',
                  }}
                >
                  <div style={{
                    borderRadius: '50%',
                    background: '#f0e6d3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {opt.avatar}
                  </div>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: species === opt.key ? '#f5a623' : '#999',
                  }}>
                    {opt.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button
            type="submit"
            style={{
              width: '100%',
              height: '44px',
              background: '#f5a623',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.3s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e6971a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#f5a623')}
          >
            确认领养
          </button>
        </form>
      </div>
    </div>
  );
}
