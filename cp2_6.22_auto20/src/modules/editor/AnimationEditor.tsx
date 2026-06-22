import { useState } from 'react';
import styled from 'styled-components';
import AnimationCard from './AnimationCard';
import { AnimationConfig, AnimationType, ANIMATION_TYPE_LABELS } from '@/types/animation';

interface AnimationEditorProps {
  animations: AnimationConfig[];
  selectedId: string;
  onSelect: (id: string) => void;
  onChange: (id: string, updates: Partial<AnimationConfig>) => void;
  onTypeChange: (id: string, type: AnimationType) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const EditorTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 4px;
`;

const InstanceList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
`;

const InstanceButton = styled.button<{ $selected: boolean }>`
  padding: 8px 12px;
  border-radius: 8px;
  border: 2px solid ${props => props.$selected ? '#8B5CF6' : '#E5E7EB'};
  background: ${props => props.$selected ? 'linear-gradient(135deg, #8B5CF620, #3B82F620)' : 'white'};
  color: ${props => props.$selected ? '#8B5CF6' : '#374151'};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.$selected ? '#8B5CF6' : '#8B5CF680'};
  }
`;

const AddButton = styled.button`
  padding: 8px 12px;
  border-radius: 8px;
  border: 2px dashed #D1D5DB;
  background: white;
  color: #6B7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #8B5CF6;
    color: #8B5CF6;
  }
`;

const SectionTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 8px 0;
`;

const TypeSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
`;

const TypeButton = styled.button<{ $selected: boolean }>`
  padding: 10px 12px;
  border-radius: 10px;
  border: 2px solid ${props => props.$selected ? '#8B5CF6' : '#E5E7EB'};
  background: ${props => props.$selected ? 'linear-gradient(135deg, #8B5CF615, #3B82F615)' : '#F9FAFB'};
  color: ${props => props.$selected ? '#8B5CF6' : '#374151'};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.$selected ? '#8B5CF6' : '#8B5CF660'};
    background: ${props => props.$selected ? 'linear-gradient(135deg, #8B5CF620, #3B82F620)' : '#F3F4F6'};
  }
`;

const AnimationEditor = ({
  animations,
  selectedId,
  onSelect,
  onChange,
  onTypeChange,
  onAdd,
  onRemove,
}: AnimationEditorProps) => {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set(['duration', 'easing']));

  const selectedAnimation = animations.find(a => a.id === selectedId);

  const toggleCard = (cardName: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardName)) {
        next.delete(cardName);
      } else {
        next.add(cardName);
      }
      return next;
    });
  };

  if (!selectedAnimation) return null;

  return (
    <EditorContainer>
      <EditorTitle>动画实例</EditorTitle>
      <InstanceList>
        {animations.map(anim => (
          <InstanceButton
            key={anim.id}
            $selected={anim.id === selectedId}
            onClick={() => onSelect(anim.id)}
          >
            {anim.name}
          </InstanceButton>
        ))}
        {animations.length < 4 && (
          <AddButton onClick={onAdd}>+ 添加</AddButton>
        )}
      </InstanceList>

      <SectionTitle>动画类型</SectionTitle>
      <TypeSelector>
        {(Object.keys(ANIMATION_TYPE_LABELS) as AnimationType[]).map(type => (
          <TypeButton
            key={type}
            $selected={selectedAnimation.type === type}
            onClick={() => onTypeChange(selectedId, type)}
          >
            {ANIMATION_TYPE_LABELS[type]}
          </TypeButton>
        ))}
      </TypeSelector>

      <AnimationCard
        title="时间设置"
        isExpanded={expandedCards.has('duration')}
        onToggle={() => toggleCard('duration')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#374151' }}>
              持续时长: <span style={{ color: '#8B5CF6', fontWeight: 600 }}>{selectedAnimation.duration.toFixed(1)}s</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={selectedAnimation.duration}
              onChange={(e) => onChange(selectedId, { duration: parseFloat(e.target.value) })}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: '#E5E7EB',
                outline: 'none',
                cursor: 'pointer',
                accentColor: '#8B5CF6',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
              <span>0.1s</span>
              <span>5s</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#374151' }}>
              延迟: <span style={{ color: '#8B5CF6', fontWeight: 600 }}>{selectedAnimation.delay.toFixed(1)}s</span>
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={selectedAnimation.delay}
              onChange={(e) => onChange(selectedId, { delay: parseFloat(e.target.value) })}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: '#E5E7EB',
                outline: 'none',
                cursor: 'pointer',
                accentColor: '#8B5CF6',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
              <span>0s</span>
              <span>2s</span>
            </div>
          </div>
        </div>
      </AnimationCard>

      <AnimationCard
        title="缓动函数"
        isExpanded={expandedCards.has('easing')}
        onToggle={() => toggleCard('easing')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'].map(easing => (
              <button
                key={easing}
                onClick={() => onChange(selectedId, { easing: easing as any })}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: `2px solid ${selectedAnimation.easing === easing ? '#8B5CF6' : '#E5E7EB'}`,
                  background: selectedAnimation.easing === easing ? 'linear-gradient(135deg, #8B5CF615, #3B82F615)' : 'white',
                  color: selectedAnimation.easing === easing ? '#8B5CF6' : '#374151',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'monospace',
                }}
              >
                {easing}
              </button>
            ))}
          </div>

          <button
            onClick={() => onChange(selectedId, { easing: 'cubic-bezier' })}
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              border: `2px solid ${selectedAnimation.easing === 'cubic-bezier' ? '#8B5CF6' : '#E5E7EB'}`,
              background: selectedAnimation.easing === 'cubic-bezier' ? 'linear-gradient(135deg, #8B5CF615, #3B82F615)' : 'white',
              color: selectedAnimation.easing === 'cubic-bezier' ? '#8B5CF6' : '#374151',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'monospace',
            }}
          >
            cubic-bezier (自定义)
          </button>

          {selectedAnimation.easing === 'cubic-bezier' && (
            <div style={{
              background: '#F9FAFB',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              {['x1', 'y1', 'x2', 'y2'].map((label, index) => (
                <div key={label}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>
                    {label}: <span style={{ color: '#8B5CF6', fontWeight: 600 }}>{selectedAnimation.cubicBezier[index].toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedAnimation.cubicBezier[index]}
                    onChange={(e) => {
                      const newBezier = [...selectedAnimation.cubicBezier] as [number, number, number, number];
                      newBezier[index] = parseFloat(e.target.value);
                      onChange(selectedId, { cubicBezier: newBezier });
                    }}
                    style={{
                      width: '100%',
                      height: '4px',
                      borderRadius: '2px',
                      background: '#E5E7EB',
                      outline: 'none',
                      cursor: 'pointer',
                      accentColor: '#8B5CF6',
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </AnimationCard>

      {animations.length > 1 && (
        <button
          onClick={() => onRemove(selectedId)}
          style={{
            marginTop: '8px',
            padding: '10px',
            borderRadius: '10px',
            border: '2px solid #FEE2E2',
            background: '#FEF2F2',
            color: '#EF4444',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FEE2E2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#FEF2F2';
          }}
        >
          删除此动画实例
        </button>
      )}
    </EditorContainer>
  );
};

export default AnimationEditor;
