import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export interface Pet {
  id: number;
  name: string;
  breed: string;
  age: string;
  gender: string;
  personality: string;
  photos: string[];
  status: string;
}

interface PetCardProps {
  pet: Pet;
}

const PetCard: React.FC<PetCardProps> = ({ pet }) => {
  const navigate = useNavigate();
  const thumbnail = pet.photos && pet.photos.length > 0 ? pet.photos[0] : '';

  return (
    <motion.div
      className="pet-card"
      onClick={() => navigate(`/pet/${pet.id}`)}
      whileHover={{ y: -4, boxShadow: '0 8px 24px #bdbdbd' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        background: 'var(--bg-white)',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 2px 8px #e0e0e0',
      }}
    >
      <div
        style={{
          width: '100%',
          paddingTop: '75%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={pet.name}
            loading="lazy"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
            }}
            onMouseEnter={(e) => { (e.target as HTMLImageElement).style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { (e.target as HTMLImageElement).style.transform = 'scale(1)'; }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'var(--placeholder)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
            }}
          >
            🐾
          </div>
        )}
        {pet.status === 'adopted' && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            已领养
          </div>
        )}
      </div>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{pet.name}</h3>
          <span
            style={{
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: pet.gender === 'Male' ? '#e3f2fd' : '#fce4ec',
              color: pet.gender === 'Male' ? '#1565c0' : '#c62828',
            }}
          >
            {pet.gender === 'Male' ? '♂' : '♀'} {pet.gender === 'Male' ? '公' : '母'}
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '4px' }}>
          {pet.breed} · {pet.age}
        </p>
        {pet.personality && (
          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {pet.personality}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default PetCard;
