import React, { useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMetaStore } from '../stores/metaStore';
import type { EventNode, Character, Relationship, TimelineConfig } from '../types';

const NODE_RADIUS = 15;
const TIMELINE_Y = 300;
const BASE_X = 100;

interface TimelineRendererProps {
  width: number;
  height: number;
  onNodeMouseDown: (eventId: string, e: React.MouseEvent) => void;
  onNodeDoubleClick: (eventId: string) => void;
  onNodeClick: (eventId: string) => void;
  onCharacterClick: (characterId: string) => void;
  onCanvasDoubleClick: (x: number, y: number) => void;
}

const EVENT_TYPE_ICONS: Record<string, string> = {
  default: '●',
  meeting: '👥',
  conflict: '⚔️',
  turning: '↻',
  ending: '🏁'
};

const TimelineRenderer: React.FC<TimelineRendererProps> = ({
  width,
  height,
  onNodeMouseDown,
  onNodeDoubleClick,
  onNodeClick,
  onCharacterClick,
  onCanvasDoubleClick
}) => {
  const {
    events,
    characters,
    relationships,
    config,
    setHighlightedCharacter,
    setSelectedEvent
  } = useMetaStore(useShallow((state) => ({
    events: state.events,
    characters: state.characters,
    relationships: state.relationships,
    config: state.config,
    setHighlightedCharacter: state.setHighlightedCharacter,
    setSelectedEvent: state.setSelectedEvent
  })));

  const transform = `translate(${config.panX}, ${config.panY}) scale(${config.scale})`;

  const getCharacterById = useCallback((id: string): Character | undefined => {
    return characters.find(c => c.id === id);
  }, [characters]);

  const getPrimaryCharacterColor = useCallback((event: EventNode): string => {
    if (event.characterIds.length === 0) return '#e8a87c';
    const primaryChar = getCharacterById(event.characterIds[0]);
    return primaryChar?.color || '#e8a87c';
  }, [getCharacterById]);

  const isEventHighlighted = useCallback((event: EventNode): boolean => {
    if (!config.highlightedCharacterId) return true;
    return event.characterIds.includes(config.highlightedCharacterId);
  }, [config.highlightedCharacterId]);

  const calculateEventX = useCallback((event: EventNode): number => {
    const orderedEvents = [...events].sort((a, b) => a.order - b.order);
    const minOrder = orderedEvents[0]?.order || 0;
    return BASE_X + (event.order - minOrder) * config.nodeSpacing;
  }, [events, config.nodeSpacing]);

  const renderTimeline = useMemo(() => {
    if (events.length === 0) return null;

    const orderedEvents = [...events].sort((a, b) => a.order - b.order);
    const minOrder = orderedEvents[0]?.order || 0;
    const maxOrder = orderedEvents[orderedEvents.length - 1]?.order || 0;
    const timelineWidth = (maxOrder - minOrder + 2) * config.nodeSpacing;

    return (
      <g className="timeline-group">
        <line
          x1={BASE_X - 50}
          y1={TIMELINE_Y}
          x2={BASE_X + timelineWidth}
          y2={TIMELINE_Y}
          stroke="#8b7355"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            transition: 'all 0.5s ease',
            strokeDasharray: '1000',
            strokeDashoffset: '1000',
            animation: 'drawLine 0.8s ease forwards'
          }}
        />

        {orderedEvents.map((event, index) => {
          const x = calculateEventX(event);
          const y = TIMELINE_Y;
          const isHighlighted = isEventHighlighted(event);
          const isSelected = config.selectedEventId === event.id;
          const nodeColor = getPrimaryCharacterColor(event);
          const primaryChar = event.characterIds[0] ? getCharacterById(event.characterIds[0]) : null;

          return (
            <g
              key={event.id}
              className={`event-node ${isSelected ? 'selected' : ''}`}
              style={{
                opacity: isHighlighted ? 1 : 0.3,
                transition: 'all 0.3s ease',
                animation: `fadeInUp 0.5s ease ${index * 0.1}s both`
              }}
            >
              {event.timestamp && (
                <text
                  x={x}
                  y={y - 50}
                  textAnchor="middle"
                  className="timestamp-text"
                  fill="#8b7355"
                  fontSize={12 / config.scale}
                  style={{ transition: 'all 0.3s ease' }}
                >
                  {event.timestamp}
                </text>
              )}

              {event.location && (
                <text
                  x={x}
                  y={y - 35}
                  textAnchor="middle"
                  className="location-text"
                  fill="#6b8e6b"
                  fontSize={10 / config.scale}
                  style={{ transition: 'all 0.3s ease' }}
                >
                  📍 {event.location}
                </text>
              )}

              {primaryChar && (
                <g className="character-label">
                  <rect
                    x={x - primaryChar.name.length * 6 - 8}
                    y={y - 75}
                    width={primaryChar.name.length * 12 + 16}
                    height={20}
                    rx={8}
                    fill={primaryChar.color}
                    opacity={0.8}
                    style={{ transition: 'all 0.3s ease' }}
                  />
                  <text
                    x={x}
                    y={y - 61}
                    textAnchor="middle"
                    fill="white"
                    fontSize={11 / config.scale}
                    fontWeight="500"
                    style={{ transition: 'all 0.3s ease' }}
                  >
                    {primaryChar.name}
                  </text>
                </g>
              )}

              <circle
                cx={x}
                cy={y}
                r={NODE_RADIUS / config.scale}
                fill={nodeColor}
                stroke={isSelected ? '#3d3d3d' : 'white'}
                strokeWidth={isSelected ? 3 : 2}
                style={{
                  cursor: 'grab',
                  filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))',
                  transition: 'all 0.3s ease'
                }}
                className="event-circle"
                onMouseDown={(e) => onNodeMouseDown(event.id, e)}
                onDoubleClick={() => onNodeDoubleClick(event.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  onNodeClick(event.id);
                }}
                onMouseEnter={(e) => {
                  (e.target as SVGCircleElement).style.transform = 'scale(1.1)';
                  (e.target as SVGCircleElement).style.filter = 'drop-shadow(3px 3px 6px rgba(0,0,0,0.3))';
                }}
                onMouseLeave={(e) => {
                  (e.target as SVGCircleElement).style.transform = 'scale(1)';
                  (e.target as SVGCircleElement).style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))';
                }}
              />

              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                fill="white"
                fontSize={12 / config.scale}
                style={{ pointerEvents: 'none', transition: 'all 0.3s ease' }}
              >
                {EVENT_TYPE_ICONS[event.type] || EVENT_TYPE_ICONS.default}
              </text>

              <text
                x={x}
                y={y + NODE_RADIUS / config.scale + 20}
                textAnchor="middle"
                fill="#3d3d3d"
                fontSize={12 / config.scale}
                className="event-title"
                style={{ 
                  transition: 'all 0.3s ease',
                  maxWidth: '120px',
                  overflow: 'hidden'
                }}
              >
                {event.title.length > 15 ? event.title.slice(0, 15) + '...' : event.title}
              </text>

              <text
                x={x}
                y={y + NODE_RADIUS / config.scale + 35}
                textAnchor="middle"
                fill="#9b9b9b"
                fontSize={10 / config.scale}
                style={{ transition: 'all 0.3s ease' }}
              >
                #{event.order + 1}
              </text>
            </g>
          );
        })}
      </g>
    );
  }, [events, config, calculateEventX, isEventHighlighted, getPrimaryCharacterColor, getCharacterById, onNodeMouseDown, onNodeDoubleClick, onNodeClick]);

  const renderRelationshipGraph = useMemo(() => {
    if (characters.length === 0) return null;

    const centerX = width / 2 / config.scale - config.panX / config.scale;
    const centerY = height / 2 / config.scale - config.panY / config.scale;
    const baseRadius = Math.min(width, height) / 4 / config.scale;

    const characterPositions = characters.map((char, index) => {
      const angle = (2 * Math.PI * index) / characters.length - Math.PI / 2;
      const radius = baseRadius + (char.eventCount * 5);
      return {
        character: char,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    const maxEventCount = Math.max(...characters.map(c => c.eventCount), 1);

    return (
      <g className="relationship-graph">
        {relationships.map((rel, index) => {
          const pos1 = characterPositions.find(p => p.character.id === rel.characterId1);
          const pos2 = characterPositions.find(p => p.character.id === rel.characterId2);
          if (!pos1 || !pos2) return null;

          const char1 = getCharacterById(rel.characterId1);
          const char2 = getCharacterById(rel.characterId2);
          const strokeWidth = Math.min(rel.eventCount * 1.5, 6);
          
          const midX = (pos1.x + pos2.x) / 2;
          const midY = (pos1.y + pos2.y) / 2;
          
          const isHighlighted = 
            config.highlightedCharacterId === rel.characterId1 || 
            config.highlightedCharacterId === rel.characterId2;

          return (
            <g key={`rel-${index}`}>
              <line
                x1={pos1.x}
                y1={pos1.y}
                x2={pos2.x}
                y2={pos2.y}
                stroke={char1?.color || '#8b7355'}
                strokeWidth={strokeWidth}
                strokeOpacity={isHighlighted ? 0.8 : 0.4}
                strokeLinecap="round"
                style={{
                  transition: 'all 0.5s ease',
                  animation: `fadeIn 0.5s ease ${index * 0.05}s both`
                }}
              />
              
              <g
                style={{
                  animation: `flowArrow 1.5s linear infinite`,
                  transformOrigin: `${midX}px ${midY}px`
                }}
              >
                <polygon
                  points={`${midX},${midY - 5} ${midX + 8},${midY} ${midX},${midY + 5}`}
                  fill={char1?.eventCount > (char2?.eventCount || 0) ? char1?.color : char2?.color}
                  opacity={isHighlighted ? 0.9 : 0.6}
                />
              </g>
              
              <text
                x={midX}
                y={midY - 10}
                textAnchor="middle"
                fill="#6b6b6b"
                fontSize={10 / config.scale}
                style={{ transition: 'all 0.3s ease' }}
              >
                {rel.eventCount}次
              </text>
            </g>
          );
        })}

        {characterPositions.map(({ character, x, y }, index) => {
          const radius = 20 + (character.eventCount / maxEventCount) * 30;
          const isHighlighted = config.highlightedCharacterId === character.id;
          const scale = isHighlighted ? 1.1 : 1;

          return (
            <g
              key={character.id}
              className="character-node"
              style={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                animation: `popIn 0.5s ease ${index * 0.1}s both`,
                transform: `scale(${scale})`,
                transformOrigin: `${x}px ${y}px`
              }}
              onClick={() => onCharacterClick(character.id)}
            >
              <circle
                cx={x}
                cy={y}
                r={radius / config.scale}
                fill={character.color}
                stroke={isHighlighted ? '#3d3d3d' : 'white'}
                strokeWidth={isHighlighted ? 4 : 3}
                style={{
                  filter: 'drop-shadow(3px 3px 6px rgba(0,0,0,0.2))',
                  transition: 'all 0.3s ease'
                }}
              />
              
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                fill="white"
                fontSize={Math.max(10, radius / 3) / config.scale}
                fontWeight="600"
                style={{ pointerEvents: 'none', transition: 'all 0.3s ease' }}
              >
                {character.name.length > 3 ? character.name.slice(0, 3) : character.name}
              </text>
              
              <text
                x={x}
                y={y + radius / config.scale + 20}
                textAnchor="middle"
                fill="#3d3d3d"
                fontSize={11 / config.scale}
                style={{ transition: 'all 0.3s ease' }}
              >
                {character.name}
              </text>
              
              <text
                x={x}
                y={y + radius / config.scale + 35}
                textAnchor="middle"
                fill="#9b9b9b"
                fontSize={9 / config.scale}
                style={{ transition: 'all 0.3s ease' }}
              >
                {character.eventCount}个事件
              </text>
            </g>
          );
        })}
      </g>
    );
  }, [characters, relationships, width, height, config, getCharacterById, onCharacterClick]);

  const renderTimeRangeLabels = useMemo(() => {
    if (events.length === 0 || config.viewMode !== 'timeline') return null;

    const leftX = (-config.panX) / config.scale;
    const rightX = (-config.panX + width) / config.scale;
    
    const visibleEvents = events.filter(e => {
      const x = calculateEventX(e);
      return x >= leftX - 100 && x <= rightX + 100;
    }).sort((a, b) => a.order - b.order);

    if (visibleEvents.length === 0) return null;

    const firstEvent = visibleEvents[0];
    const lastEvent = visibleEvents[visibleEvents.length - 1];

    return (
      <g className="time-range-labels" style={{ pointerEvents: 'none' }}>
        <rect
          x={20}
          y={20}
          width={200}
          height={30}
          rx={8}
          fill="white"
          opacity={0.9}
          style={{ filter: 'drop-shadow(1px 1px 3px rgba(0,0,0,0.1))' }}
        />
        <text
          x={120}
          y={40}
          textAnchor="middle"
          fill="#8b7355"
          fontSize={12}
          fontWeight="500"
        >
          视角范围: #{firstEvent.order + 1} - #{lastEvent.order + 1}
        </text>
      </g>
    );
  }, [events, config, width, calculateEventX]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - config.panX) / config.scale;
    const y = (e.clientY - rect.top - config.panY) / config.scale;
    onCanvasDoubleClick(x, y);
  }, [config.panX, config.panY, config.scale, onCanvasDoubleClick]);

  return (
    <g transform={transform}>
      <defs>
        <style>
          {`
            @keyframes drawLine {
              to { stroke-dashoffset: 0; }
            }
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes popIn {
              0% {
                opacity: 0;
                transform: scale(0);
              }
              70% {
                transform: scale(1.1);
              }
              100% {
                opacity: 1;
                transform: scale(1);
              }
            }
            @keyframes flowArrow {
              0% { opacity: 0.3; }
              50% { opacity: 1; }
              100% { opacity: 0.3; }
            }
            .event-circle:active {
              cursor: grabbing;
            }
          `}
        </style>
      </defs>

      {renderTimeRangeLabels}

      <rect
        x={-10000}
        y={-10000}
        width={20000}
        height={20000}
        fill="#f0ecec"
        onDoubleClick={handleCanvasDoubleClick}
        style={{ cursor: 'grab' }}
      />

      {config.viewMode === 'timeline' ? renderTimeline : renderRelationshipGraph}
    </g>
  );
};

export default React.memo(TimelineRenderer);
