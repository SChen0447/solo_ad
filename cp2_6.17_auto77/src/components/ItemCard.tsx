import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Package } from 'lucide-react';

interface Item {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  desiredTags: string[];
  ownerId: string;
  ownerNickname?: string;
  ownerCreditScore?: number;
  createdAt: string;
}

interface ItemCardProps {
  item: Item;
}

const getCreditColorClass = (score: number): string => {
  if (score < 50) return 'red';
  if (score < 80) return 'yellow';
  return 'green';
};

const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const creditScore = item.ownerCreditScore ?? 70;
  const creditColorClass = getCreditColorClass(creditScore);

  const handleClick = () => {
    navigate(`/items/${item.id}`);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="item-card" onClick={handleClick}>
      <div className="item-card-image">
        {imageError || !item.imageUrl ? (
          <div className="item-card-image-placeholder">
            <Package size={48} />
          </div>
        ) : (
          <img
            src={item.imageUrl}
            alt={item.title}
            onError={handleImageError}
          />
        )}

        <div className={`credit-badge ${creditColorClass}`}>
          <UserCheck className="credit-badge-icon" />
          <span>{creditScore}</span>
        </div>

        <div className="item-card-hover-overlay">
          <div className="overlay-title">期望交换</div>
          <div className="overlay-tags">
            {item.desiredTags.map((tag, index) => (
              <span key={index} className="overlay-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="item-card-content">
        <h3 className="item-card-title">{item.title}</h3>
        <div className="item-card-tags">
          {item.desiredTags.slice(0, 2).map((tag, index) => (
            <span key={index} className="item-card-tag">
              {tag}
            </span>
          ))}
          {item.desiredTags.length > 2 && (
            <span className="item-card-tag">+{item.desiredTags.length - 2}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
