import React, { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { useStore } from '@/store';
import type { FontPair } from '@/types';

const SAMPLE_HEADING = '设计是如何塑造我们日常的阅读体验';
const SAMPLE_BODY_PARAGRAPHS = [
  '字体的选择在任何设计项目中都扮演着至关重要的角色，它不仅传达信息，更影响着读者的情绪和阅读体验。一款优秀的正文字体应该在各种尺寸下都保持良好的可读性，而标题字体则需要在瞬间抓住注意力的同时，与正文形成和谐的视觉层次。',
  '行距和字间距的微妙调整可以极大地改变文本块的整体观感。过于紧凑的行距让文字显得拥挤不堪，而过于松散的行距则会让段落失去凝聚力。字间距同样如此：适当的收紧能提升紧凑感，而适度的放宽则会带来呼吸般的轻盈感。',
  '当我们在多种字体配对之间做选择时，能够实时预览并对比不同组合的效果，就显得尤为重要。这正是字体配对实验室存在的意义——让每一个排版决策都建立在直观、可靠的视觉反馈之上。',
];

function buildStyle(config: {
  family: string;
  size: number;
  lineHeight: number;
  letterSpacing: number;
  weight: number;
}): React.CSSProperties {
  return {
    fontFamily: `'${config.family}', ${getFallback(config.family)}`,
    fontSize: `${config.size}px`,
    lineHeight: config.lineHeight,
    letterSpacing: `${config.letterSpacing}px`,
    fontWeight: config.weight,
  };
}

function getFallback(family: string): string {
  const serif = ['Playfair Display', 'Merriweather', 'Lora', 'Georgia', 'Noto Serif', 'Crimson Pro', 'Libre Baskerville', 'Fraunces', 'DM Serif Display'];
  const mono = ['JetBrains Mono', 'IBM Plex Mono', 'Roboto Mono'];
  if (serif.includes(family)) return 'Georgia, serif';
  if (mono.includes(family)) return 'Consolas, monospace';
  return '-apple-system, BlinkMacSystemFont, sans-serif';
}

function PreviewSection({
  label,
  labelColor,
  removable,
  onRemove,
  headingConfig,
  bodyConfig,
}: {
  label: string;
  labelColor?: string;
  removable?: boolean;
  onRemove?: () => void;
  headingConfig: { family: string; size: number; lineHeight: number; letterSpacing: number; weight: number };
  bodyConfig: { family: string; size: number; lineHeight: number; letterSpacing: number; weight: number };
}) {
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    setHighlight(true);
    const timer = setTimeout(() => setHighlight(false), 120);
    return () => clearTimeout(timer);
  }, [headingConfig, bodyConfig]);

  return (
    <section className={`preview-section ${highlight ? 'highlight' : ''}`}>
      <div className="preview-label">
        <span
          className={`label-tag ${removable ? '' : 'current-label'}`}
          style={labelColor ? { background: labelColor } : undefined}
        >
          {label}
          {removable && onRemove && (
            <button className="remove-btn" onClick={onRemove} aria-label="删除卡片">
              ×
            </button>
          )}
        </span>
        <span className="section-title">
          H1 · {headingConfig.family} / Body · {bodyConfig.family}
        </span>
      </div>
      <h1 className="preview-heading" style={buildStyle(headingConfig)}>
        {SAMPLE_HEADING}
      </h1>
      <div className="preview-body" style={buildStyle(bodyConfig)}>
        {SAMPLE_BODY_PARAGRAPHS.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </div>
    </section>
  );
}

function CardItem({
  card,
  onRemove,
}: {
  card: FontPair;
  onRemove: () => void;
}) {
  return (
    <PreviewSection
      label={card.label}
      labelColor={card.labelColor}
      removable
      onRemove={onRemove}
      headingConfig={card.heading}
      bodyConfig={card.body}
    />
  );
}

function PreviewPanel() {
  const currentHeading = useStore(s => s.currentHeading);
  const currentBody = useStore(s => s.currentBody);
  const cards = useStore(s => s.cards);
  const removeCard = useStore(s => s.removeCard);
  const reorderCards = useStore(s => s.reorderCards);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderCards(result.source.index, result.destination.index);
  };

  return (
    <div className="preview-panel">
      <div className="preview-content">
        <PreviewSection
          label="当前预览"
          headingConfig={currentHeading}
          bodyConfig={currentBody}
        />

        {cards.length > 0 && (
          <>
            <div style={{ height: 24 }} />
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="cards">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                      background: snapshot.isDraggingOver ? 'rgba(59,130,246,0.04)' : 'transparent',
                      padding: snapshot.isDraggingOver ? 12 : 0,
                      borderRadius: 16,
                      transition: 'all 200ms ease',
                    }}
                  >
                    {cards.map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={snapshot.isDragging ? 'dragging' : ''}
                            style={{
                              ...provided.draggableProps.style,
                              transition: snapshot.isDragging ? 'none' : 'transform 200ms ease-out, opacity 200ms ease-out',
                            }}
                          >
                            <CardItem card={card} onRemove={() => removeCard(card.id)} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </>
        )}
      </div>
    </div>
  );
}

export default PreviewPanel;
