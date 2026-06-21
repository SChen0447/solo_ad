import { Cat } from '../utils/database';

interface CatCardProps {
  cat: Cat;
  onClick: () => void;
  onDelete: () => void;
}

function CatCard({ cat, onClick, onDelete }: CatCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div className="cat-card" onClick={onClick}>
      <div className="cat-avatar" style={{ backgroundColor: cat.color }}>
        {cat.avatar ? (
          <img src={cat.avatar} alt={cat.name} />
        ) : (
          <span className="cat-avatar-initials">
            {cat.name.charAt(0)}
          </span>
        )}
      </div>
      <div className="cat-info">
        <h3 className="cat-name">{cat.name}</h3>
        <p className="cat-breed">{cat.breed} · {cat.age}岁</p>
        <div className="cat-personality">
          {cat.personality.map((p, i) => (
            <span key={i} className="personality-tag">{p}</span>
          ))}
        </div>
      </div>
      <button
        className="cat-delete-btn"
        onClick={handleDelete}
        title="删除"
      >
        ×
      </button>
    </div>
  );
}

export default CatCard;
