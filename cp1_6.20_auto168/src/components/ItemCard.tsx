import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Item } from '@/types';
import LazyImage from './LazyImage';
import CategoryBadge from './CategoryBadge';
import ConditionBar from './ConditionBar';
import CreditBadge from './CreditBadge';
import ApiService from '@/modules/common/ApiService';
import { useState, useEffect } from 'react';
import { User } from '@/types';

interface ItemCardProps {
  item: Item;
}

const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const navigate = useNavigate();
  const [owner, setOwner] = useState<User | null>(null);

  useEffect(() => {
    const fetchOwner = async () => {
      try {
        const user = await ApiService.get<User>(`/users/${item.currentOwnerId}`);
        setOwner(user);
      } catch (error) {
        console.error('Failed to fetch owner:', error);
      }
    };
    fetchOwner();
  }, [item.currentOwnerId]);

  const statusMap: Record<Item['status'], { label: string; color: string }> = {
    available: { label: '可交换', color: '#27ae60' },
    exchanging: { label: '交换中', color: '#f39c12' },
    completed: { label: '已结案', color: '#95a5a6' },
  };

  const statusConfig = statusMap[item.status];

  const handleClick = () => {
    navigate(`/item/${item.id}`);
  };

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
      transition={{ duration: 0.3, ease: 'ease' }}
      className="flex bg-white rounded-2xl cursor-pointer overflow-hidden"
      style={{
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
      }}
      onClick={handleClick}
    >
      <div className="flex-shrink-0" style={{ width: '300px', height: '200px' }}>
        <LazyImage
          src={item.imagePaths[0]}
          alt={item.title}
          className="w-full h-full"
        />
      </div>
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800 line-clamp-1">{item.title}</h3>
            <span
              className="px-2 py-1 text-xs text-white rounded"
              style={{ backgroundColor: statusConfig.color }}
            >
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <CategoryBadge category={item.category} />
            <ConditionBar score={item.conditionScore} />
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{item.description}</p>
        </div>
        {owner && (
          <div className="flex items-center gap-2">
            <img
              src={owner.avatar}
              alt={owner.name}
              className="w-7 h-7 rounded-full"
            />
            <span className="text-sm text-gray-700">{owner.name}</span>
            <CreditBadge score={owner.creditScore} size="sm" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ItemCard;
