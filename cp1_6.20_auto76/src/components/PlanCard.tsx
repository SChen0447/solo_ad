import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plan } from '../types';

interface PlanCardProps {
  plan: Plan;
  index: number;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, index }) => {
  const navigate = useNavigate();
  const progress = plan.total_tasks > 0 ? (plan.completed_tasks / plan.total_tasks) * 100 : 0;

  const handleClick = () => {
    navigate(`/plan/${plan.id}`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1, ease: 'easeOut' }}
      onClick={handleClick}
      className="plan-card"
    >
      <h3 className="plan-card-title">{plan.name}</h3>
      {plan.description && (
        <p className="plan-card-desc">{plan.description}</p>
      )}
      <div className="plan-card-date">
        {formatDate(plan.start_date)} - {formatDate(plan.end_date)}
      </div>
      <div className="plan-card-tasks">
        {plan.completed_tasks} / {plan.total_tasks} 任务完成
      </div>
      <div className="progress-bar">
        <div 
          className="progress-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
};

export default PlanCard;
