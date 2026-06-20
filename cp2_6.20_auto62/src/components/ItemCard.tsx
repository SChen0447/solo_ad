import { useNavigate } from 'react-router-dom';
import type { Item } from '../api';

interface ItemCardProps {
  item: Item;
}

export default function ItemCard({ item }: ItemCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/item/${item.id}`);
  };

  return (
    <div className="item-card" onClick={handleClick}>
      <img
        className="item-card-img"
        src={item.imageUrl}
        alt={item.title}
        loading="lazy"
      />
      <div className="item-card-body">
        <div className="item-card-title">{item.title}</div>
        <span className="item-card-condition">{item.condition}</span>
        <div className="item-card-owner">{item.ownerName}</div>
      </div>
    </div>
  );
}
