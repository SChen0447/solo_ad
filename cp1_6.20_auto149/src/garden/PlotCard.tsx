import { motion } from 'framer-motion';
import { Plot } from '../types';

interface PlotCardProps {
  plot: Plot;
  onClick: () => void;
}

const PlotCard = ({ plot, onClick }: PlotCardProps) => {
  const isClaimed = plot.user_id !== null;

  return (
    <motion.div
      layoutId={`plot-${plot.id}`}
      onClick={onClick}
      style={{
        width: '60px',
        height: '60px',
        borderRadius: '4px',
        backgroundColor: isClaimed ? '#7ebc59' : '#e8e0d4',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'all 0.2s ease',
        boxShadow: isClaimed ? '0 2px 8px rgba(126, 188, 89, 0.4)' : 'none',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          height: '6px',
          borderRadius: '3px 3px 0 0',
          backgroundColor: '#d9cdc1',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            height: '100%',
            width: '50%',
            backgroundColor: '#4ca6e6',
            transition: 'width 0.5s ease',
          }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${plot.water_level * 0.5}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            height: '100%',
            backgroundColor: '#4ca6e6',
          }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${plot.fertilizer_level * 0.5}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: '3px',
            left: '0',
            height: '3px',
            backgroundColor: '#8b5e3c',
          }}
        />
      </div>

      {isClaimed && plot.avatar ? (
        <motion.img
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          src={plot.avatar}
          alt={plot.username || '用户'}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid #fff',
            marginTop: '8px',
          }}
        />
      ) : (
        <span style={{ fontSize: '20px', opacity: 0.5 }}>➕</span>
      )}

      {isClaimed && plot.username && (
        <span
          style={{
            fontSize: '9px',
            color: '#fff',
            marginTop: '2px',
            maxWidth: '52px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {plot.username}
        </span>
      )}
    </motion.div>
  );
};

export default PlotCard;
