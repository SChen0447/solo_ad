import { useState, useMemo } from 'react';
import { Cat, getRecommendationsForCat, addToy } from '../utils/database';

interface RecommendationSectionProps {
  cats: Cat[];
  onAddCat: () => void;
}

const typeColors: Record<string, string> = {
  chase: '#FF7A00',
  scratch: '#4CAF50',
  puzzle: '#9C27B0',
};

const typeBgColors: Record<string, string> = {
  chase: 'rgba(255, 122, 0, 0.1)',
  scratch: 'rgba(76, 175, 80, 0.1)',
  puzzle: 'rgba(156, 39, 176, 0.1)',
};

const typeIcons: Record<string, string> = {
  chase: '🏃',
  scratch: '🐾',
  puzzle: '🧩',
};

function RecommendationSection({ cats, onAddCat }: RecommendationSectionProps) {
  const [selectedCatId, setSelectedCatId] = useState<number | null>(
    cats.length > 0 ? cats[0].id : null
  );
  const [toys, setToys] = useState<any[]>([]);

  const recommendations = useMemo(() => {
    if (selectedCatId === null) return [];
    return getRecommendationsForCat(selectedCatId);
  }, [selectedCatId, toys.length]);

  const handleAddToy = (toyName: string, toyData: any) => {
    if (selectedCatId === null) {
      onAddCat();
      return;
    }
    const newToy = addToy({
      ...toyData,
      cat_id: selectedCatId,
      is_custom: 0,
    });
    setToys(prev => [...prev, newToy]);
  };

  if (cats.length === 0) {
    return (
      <section className="section recommendation-section">
        <h2 className="section-title">玩具推荐</h2>
        <div className="empty-state">
          <p>添加猫咪后，我们会根据互动数据为你推荐合适的玩具～</p>
          <button className="primary-btn" onClick={onAddCat}>添加猫咪</button>
        </div>
      </section>
    );
  }

  return (
    <section className="section recommendation-section">
      <div className="section-header">
        <h2 className="section-title">玩具推荐</h2>
        <div className="cat-selector">
          {cats.map(cat => (
            <button
              key={cat.id}
              className={`cat-chip ${selectedCatId === cat.id ? 'active' : ''}`}
              style={{
                backgroundColor: selectedCatId === cat.id ? cat.color : 'transparent',
                color: selectedCatId === cat.id ? '#fff' : '#333',
                borderColor: cat.color,
              }}
              onClick={() => setSelectedCatId(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="recommendation-scroll">
        <div className="recommendation-track">
          {recommendations.map((rec, index) => {
            const { toy, owned } = rec;
            return (
              <div
                key={`${toy.name}-${index}`}
                className="recommendation-card"
                style={{
                  background: `linear-gradient(135deg, ${typeBgColors[toy.type]} 0%, #fff 100%)`,
                }}
              >
                <div className="rec-icon-wrapper">
                  <span className="rec-icon" style={{ fontSize: '48px' }}>
                    {typeIcons[toy.type]}
                  </span>
                </div>
                <div className="rec-content">
                  <h4 className="rec-name">{toy.name}</h4>
                  <span
                    className="rec-type-tag"
                    style={{
                      backgroundColor: typeBgColors[toy.type],
                      color: typeColors[toy.type],
                    }}
                  >
                    {toy.type === 'chase' ? '追逐型' : toy.type === 'scratch' ? '抓挠型' : '智力型'}
                  </span>
                </div>
                {owned ? (
                  <div className="rec-status owned">
                    <span>✓</span>
                    <span className="status-text">已拥有</span>
                  </div>
                ) : (
                  <button
                    className="rec-add-btn"
                    onClick={() => handleAddToy(toy.name, toy)}
                    title="添加到玩具库"
                  >
                    +
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default RecommendationSection;
