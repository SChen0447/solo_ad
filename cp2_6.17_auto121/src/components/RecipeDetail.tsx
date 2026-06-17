import React, { useState } from 'react';
import { ArrowLeft, ShoppingCart, X } from 'lucide-react';
import type { Recipe } from '@/types';

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
}

const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onBack }) => {
  const [showModal, setShowModal] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleCheck = (key: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          color: '#3b82f6',
          fontSize: 15,
          cursor: 'pointer',
          marginBottom: 20,
          fontWeight: 500,
        }}
      >
        <ArrowLeft size={18} /> 返回首页
      </button>

      <div style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 24 }}>
        <img
          src={recipe.image}
          alt={recipe.title}
          style={{ width: '100%', height: 280, objectFit: 'cover' }}
        />
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
        {recipe.title}
      </h1>
      <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 32 }}>
        ⏱ 烹饪时间：{recipe.cookingTime} 分钟
      </p>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px', minWidth: 280 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>
            🥘 食材清单
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {recipe.ingredients.map((ing, i) => (
              <span
                key={i}
                style={{
                  borderRadius: 12,
                  padding: '8px 12px',
                  background: '#f3f4f6',
                  fontSize: 14,
                  color: '#374151',
                }}
              >
                {ing.name} · {ing.amount}
              </span>
            ))}
          </div>
        </div>

        <div style={{ flex: '1 1 300px', minWidth: 280 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>
            📝 烹饪步骤
          </h2>
          <div>
            {recipe.steps.map((step, i) => (
              <div key={step.order}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0' }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#3b82f6',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {step.order}
                  </span>
                  <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.6, margin: 0 }}>
                    {step.description}
                  </p>
                </div>
                {i < recipe.steps.length - 1 && (
                  <div
                    style={{
                      borderBottom: '1px dashed #d1d5db',
                      marginLeft: 40,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '14px 32px',
            borderRadius: 12,
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#2563eb'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#3b82f6'; }}
        >
          <ShoppingCart size={18} /> 生成购物清单
        </button>
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 32,
              maxWidth: 480,
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937' }}>
                🛒 购物清单
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                <X size={20} />
              </button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {recipe.ingredients.map((ing, i) => {
                const key = `${i}-${ing.name}`;
                const checked = checkedItems.has(key);
                return (
                  <li
                    key={key}
                    onClick={() => toggleCheck(key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 18,
                        color: checked ? '#3b82f6' : '#d1d5db',
                        transition: 'color 0.2s',
                      }}
                    >
                      {checked ? '☑' : '☐'}
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        color: '#374151',
                        textDecoration: checked ? 'line-through' : 'none',
                        opacity: checked ? 0.5 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {ing.name} · {ing.amount}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeDetail;
