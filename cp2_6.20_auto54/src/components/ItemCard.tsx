import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Item } from '../api';

const cardStyle: React.CSSProperties = {
  width: 220,
  borderRadius: 12,
  background: '#FDF6EC',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
  breakInside: 'avoid',
  marginBottom: 12,
};

const cardHoverStyle: React.CSSProperties = {
  transform: 'translateY(-6px)',
  boxShadow: '0 8px 24px rgba(255, 107, 53, 0.15)',
};

const imageStyle: React.CSSProperties = {
  width: '100%',
  height: '60%',
  objectFit: 'cover',
  display: 'block',
  background: '#F0E6D6',
};

const textStyle: React.CSSProperties = {
  padding: 4,
};

const conditionTagStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 10,
  fontSize: 11,
  background: '#FFF0E5',
  color: '#FF6B35',
  marginBottom: 4,
};

export default function ItemCard({ item }: { item: Item }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      style={{ ...cardStyle, ...(hovered ? cardHoverStyle : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/item/${item.id}`)}
    >
      <img src={item.imageUrl} alt={item.title} style={imageStyle} loading="lazy" />
      <div style={textStyle}>
        <span style={conditionTagStyle}>{item.condition}</span>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#333', lineHeight: 1.4, marginBottom: 2 }}>
          {item.title}
        </div>
        <div style={{ fontSize: 12, color: '#999' }}>{item.ownerName}</div>
      </div>
    </div>
  );
}
