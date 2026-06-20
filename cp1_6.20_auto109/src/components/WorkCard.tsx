import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Work } from '../types';
import LazyImage from './LazyImage';

interface WorkCardProps {
  work: Work;
}

const WorkCard: React.FC<WorkCardProps> = ({ work }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      className="work-card"
      whileHover={{ y: -6, boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onClick={() => navigate(`/work/${work.id}`)}
    >
      <LazyImage
        src={work.thumbnail_path}
        alt={work.title}
        className="work-card-image"
      />
      <div className="work-card-info">
        <h3 className="work-card-title">{work.title}</h3>
        <p className="work-card-author">@{work.author.username}</p>
      </div>
    </motion.div>
  );
};

export default WorkCard;
