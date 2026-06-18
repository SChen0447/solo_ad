import { useNavigate } from 'react-router-dom';
import { Pet } from '../store/petStore';
import { getPetAvatar } from './PetAvatars';

interface PetCardProps {
  pet: Pet;
  isNew?: boolean;
  onDragStart?: (e: React.DragEvent, petId: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, petId: string) => void;
  isDragOver?: boolean;
  isDragging?: boolean;
}

function getMoodEmoji(happiness: number): { emoji: string; color: string } {
  if (happiness > 70) return { emoji: '😊', color: '#27ae60' };
  if (happiness >= 40) return { emoji: '😐', color: '#f39c12' };
  return { emoji: '😢', color: '#e74c3c' };
}

function getHealthColor(health: number): string {
  if (health > 60) return '#27ae60';
  if (health > 30) return '#f39c12';
  return '#e74c3c';
}

export default function PetCard({ pet, isNew, onDragStart, onDragOver, onDrop, isDragOver, isDragging }: PetCardProps) {
  const navigate = useNavigate();
  const mood = getMoodEmoji(pet.happiness);
  const healthColor = getHealthColor(pet.health);
  const isLowHealth = pet.health < 30;

  return (
    <div
      className={`pet-card ${isNew ? 'pet-card-enter' : ''} ${isDragOver ? 'drag-over' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => navigate(`/pet/${pet.id}`)}
      draggable
      onDragStart={(e) => onDragStart?.(e, pet.id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(e);
      }}
      onDrop={(e) => onDrop?.(e, pet.id)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        border: isDragOver ? '2px solid #27ae60' : '1px solid transparent',
      }}
    >
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: '#f0e6d3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {getPetAvatar(pet.species, 80)}
      </div>
      <div style={{
        fontSize: '16px',
        color: '#4a3728',
        fontWeight: 700,
        textAlign: 'center',
      }}>
        {pet.name}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        color: mood.color,
        fontWeight: 600,
      }}>
        <span>{mood.emoji}</span>
        <span>{pet.happiness > 70 ? '开心' : pet.happiness >= 40 ? '一般' : '难过'}</span>
      </div>
      <div style={{ width: '100%' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#999',
          marginBottom: '4px',
        }}>
          <span>健康指数</span>
          <span>{pet.health}%</span>
        </div>
        <div className="progress-bar-container">
          <div
            className={`progress-bar-fill ${isLowHealth ? 'health-bar-flash' : ''}`}
            style={{
              width: `${pet.health}%`,
              backgroundColor: healthColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}
