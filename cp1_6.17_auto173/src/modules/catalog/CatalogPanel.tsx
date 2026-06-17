import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Flower } from '../../types';
import { useStore } from '../store/Store';

const categories = ['全部', '玫瑰', '百合', '满天星', '尤加利叶', '康乃馨', '向日葵'];
const priceRanges = [
  { label: '全部价格', min: 0, max: 999 },
  { label: '0-10元', min: 0, max: 10 },
  { label: '10-30元', min: 10, max: 30 },
  { label: '30元以上', min: 30, max: 999 },
];

const CatalogPanel: React.FC = () => {
  const { state, dispatch } = useStore();
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [selectedPriceRange, setSelectedPriceRange] = useState(priceRanges[0]);
  const [draggingFlower, setDraggingFlower] = useState<Flower | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFlowers = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const response = await axios.get<Flower[]>('/api/flowers');
        dispatch({ type: 'SET_FLOWERS', payload: response.data });
      } catch (error) {
        const mockFlowers: Flower[] = [
          { id: 1, name: '红玫瑰', category: '玫瑰', price: 8, stock: 50, image: '🌹', description: '热情似火的红玫瑰', color: '#FF4444' },
          { id: 2, name: '粉玫瑰', category: '玫瑰', price: 9, stock: 30, image: '🌷', description: '温柔的粉玫瑰', color: '#FF99AA' },
          { id: 3, name: '白百合', category: '百合', price: 15, stock: 20, image: '🌸', description: '纯洁的白百合', color: '#FFFFFF' },
          { id: 4, name: '粉百合', category: '百合', price: 18, stock: 15, image: '🌺', description: '优雅的粉百合', color: '#FFB6C1' },
          { id: 5, name: '白色满天星', category: '满天星', price: 5, stock: 100, image: '✨', description: '梦幻的白色满天星', color: '#F0F0F0' },
          { id: 6, name: '粉色满天星', category: '满天星', price: 6, stock: 80, image: '💫', description: '浪漫的粉色满天星', color: '#FFB6C1' },
          { id: 7, name: '尤加利叶', category: '尤加利叶', price: 4, stock: 60, image: '🌿', description: '清新的尤加利叶', color: '#8FBC8F' },
          { id: 8, name: '红色康乃馨', category: '康乃馨', price: 7, stock: 40, image: '🌼', description: '温馨的康乃馨', color: '#FF6B6B' },
          { id: 9, name: '向日葵', category: '向日葵', price: 12, stock: 25, image: '🌻', description: '阳光的向日葵', color: '#FFD700' },
        ];
        dispatch({ type: 'SET_FLOWERS', payload: mockFlowers });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    fetchFlowers();
  }, [dispatch]);

  const filteredFlowers = state.flowers.filter(flower => {
    const categoryMatch = selectedCategory === '全部' || flower.category === selectedCategory;
    const priceMatch = flower.price >= selectedPriceRange.min && flower.price <= selectedPriceRange.max;
    return categoryMatch && priceMatch;
  });

  const handleDragStart = (e: React.DragEvent, flower: Flower) => {
    if (flower.stock <= 0) {
      e.preventDefault();
      return;
    }
    setDraggingFlower(flower);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(flower));
  };

  const handleDragEnd = () => {
    setDraggingFlower(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingFlower) {
      setDragPosition({ x: e.clientX, y: e.clientY });
    }
  };

  return (
    <>
      <div
        ref={panelRef}
        className={`catalog-panel ${isCollapsed ? 'collapsed' : ''}`}
        onMouseMove={handleMouseMove}
      >
        <div className="catalog-header">
          <h2>花材目录</h2>
          <button className="toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? '▶' : '◀'}
          </button>
        </div>

        {!isCollapsed && (
          <>
            <div className="filter-section">
              <div className="filter-group">
                <label>类别筛选</label>
                <div className="category-buttons">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label>价格筛选</label>
                <select
                  value={selectedPriceRange.label}
                  onChange={(e) => {
                    const range = priceRanges.find(r => r.label === e.target.value);
                    if (range) setSelectedPriceRange(range);
                  }}
                >
                  {priceRanges.map(range => (
                    <option key={range.label} value={range.label}>{range.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flower-grid">
              {filteredFlowers.map(flower => (
                <div
                  key={flower.id}
                  className={`flower-card ${flower.stock <= 0 ? 'sold-out' : ''} ${draggingFlower?.id === flower.id ? 'dragging' : ''}`}
                  draggable={flower.stock > 0}
                  onDragStart={(e) => handleDragStart(e, flower)}
                  onDragEnd={handleDragEnd}
                >
                  {flower.stock <= 0 && <div className="sold-out-tag">售罄</div>}
                  <div className="flower-emoji" style={{ backgroundColor: flower.color + '30' }}>
                    {flower.image}
                  </div>
                  <div className="flower-info">
                    <div className="flower-name">{flower.name}</div>
                    <div className="flower-meta">
                      <span className="flower-price">¥{flower.price}/枝</span>
                      <span className="flower-stock">库存: {flower.stock}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {draggingFlower && (
        <div
          className="drag-ghost"
          style={{
            left: dragPosition.x + 10,
            top: dragPosition.y + 10,
          }}
        >
          <div className="flower-emoji" style={{ backgroundColor: draggingFlower.color + '30' }}>
            {draggingFlower.image}
          </div>
          <div className="flower-name">{draggingFlower.name}</div>
        </div>
      )}
    </>
  );
};

export default CatalogPanel;
