import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Plant } from '../types';

interface PlantCardProps {
  plant: Plant;
}

function getDaysUntilWatering(dateStr: string): number {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getSpeciesIcon(species: string): string {
  const icons: Record<string, string> = {
    '多肉植物': '🌵',
    '观叶植物': '🌿',
    '香草植物': '🌱',
    '开花植物': '🌸',
    '果树': '🍎',
    '仙人掌': '🌵',
  };
  return icons[species] || '🪴';
}

function PlantCardInner({ plant }: PlantCardProps) {
  const days = getDaysUntilWatering(plant.nextWateringDate);
  const isExpired = days < 0;
  const isToday = days === 0;

  return (
    <Link
      to={`/plant/${plant.id}`}
      style={{
        display: 'block',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-soft)',
        overflow: 'hidden',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-soft)';
      }}
      className="fade-in"
    >
      <div style={{
        width: '100%',
        height: 180,
        overflow: 'hidden',
        background: 'var(--hover-green)',
      }}>
        {plant.photoUrl ? (
          <img
            src={plant.photoUrl}
            alt={plant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 60,
          }}>
            {getSpeciesIcon(plant.species)}
          </div>
        )}
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 22 }}>{getSpeciesIcon(plant.species)}</span>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-dark)' }}>
            {plant.name}
          </h3>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          {plant.species}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderRadius: 8,
          background: isExpired || isToday
            ? 'rgba(229, 57, 53, 0.1)'
            : 'var(--hover-green)',
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            <i className="fas fa-tint" style={{ marginRight: 6 }} />
            下次浇水
          </span>
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: isExpired || isToday ? 'var(--accent-red)' : 'var(--primary-green-dark)',
          }}>
            {isExpired ? `已过期 ${Math.abs(days)} 天` : isToday ? '今天' : `${days} 天后`}
          </span>
        </div>
      </div>
    </Link>
  );
}

export const PlantCard = memo(PlantCardInner);
export default PlantCard;
