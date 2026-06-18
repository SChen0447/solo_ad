import { useParams, useNavigate } from 'react-router-dom';
import { usePetStore } from '../store/petStore';
import { getPetAvatar } from '../components/PetAvatars';
import InteractionPanel from '../components/InteractionPanel';

function StatusBar({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  const getColor = () => {
    if (value > 60) return '#27ae60';
    if (value > 30) return '#f39c12';
    return '#e74c3c';
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
      }}>
        <span style={{ fontSize: '14px', color: '#666', fontWeight: 600 }}>
          {emoji} {label}
        </span>
        <span style={{ fontSize: '14px', color: '#666', fontWeight: 700 }}>
          {value}%
        </span>
      </div>
      <div className="progress-bar-container">
        <div
          className={`progress-bar-fill ${value < 30 ? 'health-bar-flash' : ''}`}
          style={{
            width: `${value}%`,
            backgroundColor: getColor(),
          }}
        />
      </div>
    </div>
  );
}

export default function PetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pet = usePetStore((s) => s.pets.find((p) => p.id === id));

  if (!pet) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '100px 20px',
        color: '#999',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
        <p style={{ fontSize: '18px', marginBottom: '16px' }}>找不到这只宠物</p>
        <button
          onClick={() => navigate('/home')}
          style={{
            padding: '10px 24px',
            background: '#f5a623',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '32px',
        marginTop: '40px',
      }}>
        <button
          onClick={() => navigate('/home')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '8px',
            transition: 'background 0.3s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f0e6d3')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          ←
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#4a3728' }}>
          {pet.name}的详情
        </h1>
      </div>

      <div
        className="detail-layout"
        style={{
          display: 'flex',
          gap: '32px',
          alignItems: 'flex-start',
        }}
      >
        <div style={{
          flex: '0 0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          width: '280px',
        }}>
          <div style={{
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #fceabb, #f8b500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(248,181,0,0.3)',
          }}>
            {getPetAvatar(pet.species, 160)}
          </div>
          <div style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#4a3728',
            textAlign: 'center',
          }}>
            {pet.name}
          </div>
          <div style={{
            fontSize: '14px',
            color: '#999',
            textAlign: 'center',
          }}>
            {pet.species === 'cat' ? '🐱 猫咪' : pet.species === 'dog' ? '🐶 小狗' : '🐰 兔兔'}
          </div>
        </div>

        <div style={{
          flex: '1 1 auto',
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          minWidth: 0,
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#4a3728',
            marginBottom: '20px',
          }}>
            📊 状态属性
          </h3>
          <StatusBar label="饥饿度" value={pet.hunger} emoji="🍖" />
          <StatusBar label="清洁度" value={pet.hygiene} emoji="✨" />
          <StatusBar label="快乐度" value={pet.happiness} emoji="😊" />
          <StatusBar label="健康值" value={pet.health} emoji="❤️" />
        </div>

        <div style={{
          flex: '0 0 auto',
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#4a3728',
            marginBottom: '20px',
          }}>
            🎮 互动
          </h3>
          <InteractionPanel petId={pet.id} />
        </div>
      </div>
    </div>
  );
}
