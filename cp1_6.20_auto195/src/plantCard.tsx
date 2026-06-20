import { motion } from 'framer-motion';
import { Plant } from './types';
import { SPECIES_CONFIG, STATUS_COLORS } from './constants';

interface PlantCardProps {
  plant: Plant;
  onDelete: (id: string) => void;
}

export default function PlantCard({ plant, onDelete }: PlantCardProps) {
  const speciesConfig = SPECIES_CONFIG[plant.species];
  const statusConfig = STATUS_COLORS[plant.status];

  const daysSincePlanted = Math.floor(
    (Date.now() - new Date(plant.plantDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const getGradientBackground = () => {
    const baseColor = statusConfig.bg;
    return `linear-gradient(135deg, ${baseColor} 0%, ${speciesConfig.bgColor} 100%)`;
  };

  return (
    <motion.div
      className="plant-card"
      style={{
        width: '220px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(76, 175, 80, 0.15)',
        background: getGradientBackground(),
        overflow: 'hidden',
        cursor: 'pointer'
      }}
      whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(76, 175, 80, 0.25)' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      layout
    >
      <div style={{ position: 'relative', height: '140px', overflow: 'hidden' }}>
        <img
          src={plant.photo}
          alt={plant.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '4px 10px',
            borderRadius: '12px',
            backgroundColor: speciesConfig.bgColor,
            color: speciesConfig.textColor,
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>{speciesConfig.icon}</span>
          <span>{plant.species}</span>
        </div>
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            padding: '4px 10px',
            borderRadius: '12px',
            backgroundColor: statusConfig.bg,
            color: statusConfig.text,
            fontSize: '12px',
            fontWeight: '600',
            border: `1px solid ${statusConfig.text}`
          }}
        >
          {statusConfig.label}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#2E7D32',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {plant.name}
        </h3>

        <div style={{ fontSize: '12px', color: '#558B2F', marginBottom: '4px' }}>
          种植于 {plant.plantDate}
        </div>
        <div style={{ fontSize: '12px', color: '#558B2F', marginBottom: '12px' }}>
          已养护 {daysSincePlanted} 天
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '12px'
          }}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '6px 4px',
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              borderRadius: '6px'
            }}
          >
            <div style={{ fontSize: '14px' }}>💧</div>
            <div style={{ fontSize: '10px', color: '#2E7D32', marginTop: '2px' }}>
              {plant.waterFrequency}天
            </div>
          </div>
          <div
            style={{
              textAlign: 'center',
              padding: '6px 4px',
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              borderRadius: '6px'
            }}
          >
            <div style={{ fontSize: '14px' }}>🌱</div>
            <div style={{ fontSize: '10px', color: '#2E7D32', marginTop: '2px' }}>
              {plant.fertilizeFrequency}天
            </div>
          </div>
          <div
            style={{
              textAlign: 'center',
              padding: '6px 4px',
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              borderRadius: '6px'
            }}
          >
            <div style={{ fontSize: '14px' }}>🪴</div>
            <div style={{ fontSize: '10px', color: '#2E7D32', marginTop: '2px' }}>
              {plant.repotFrequency}天
            </div>
          </div>
        </div>

        <motion.button
          className="btn btn-secondary"
          style={{ width: '100%', fontSize: '12px', padding: '8px' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(plant.id);
          }}
        >
          删除
        </motion.button>
      </div>
    </motion.div>
  );
}
