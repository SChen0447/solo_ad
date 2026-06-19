import { useState, useEffect } from 'react';
import { MarineCreature, EnvironmentData, marineCreatures, depthLayers, getDepthLayer } from './MarineData';
import * as THREE from 'three';

interface ControlPanelProps {
  targetDepth: number;
  onDepthChange: (depth: number) => void;
  selectedCreature: MarineCreature | null;
  onCreatureSelect: (creature: MarineCreature | null) => void;
  environmentData: EnvironmentData;
  cameraAngle: number;
  creaturePositions: { id: string; position: THREE.Vector3 }[];
}

const depthMarks = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500];

export default function ControlPanel({
  targetDepth,
  onDepthChange,
  selectedCreature,
  onCreatureSelect,
  environmentData,
  cameraAngle,
  creaturePositions
}: ControlPanelProps) {
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const currentLayer = getDepthLayer(targetDepth);
  const [infoPanelScale, setInfoPanelScale] = useState(1);

  useEffect(() => {
    if (selectedCreature) {
      setInfoPanelScale(0);
      setTimeout(() => setInfoPanelScale(1.1), 50);
      setTimeout(() => setInfoPanelScale(1), 200);
    }
  }, [selectedCreature]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDepth = Number(e.target.value);
    onDepthChange(newDepth);
  };

  const handleCreatureClick = (creature: MarineCreature) => {
    const midDepth = (creature.depthRange[0] + creature.depthRange[1]) / 2;
    onDepthChange(midDepth);
    onCreatureSelect(creature);
  };

  const isCreatureInCurrentDepth = (creature: MarineCreature) => {
    return targetDepth >= creature.depthRange[0] && targetDepth <= creature.depthRange[1];
  };

  const compassRotation = (cameraAngle * 180 / Math.PI + 360) % 360;

  return (
    <>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 260,
        height: '100%',
        background: 'rgba(10, 22, 40, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRight: '1px solid rgba(0, 229, 255, 0.3)',
        display: isPanelVisible ? 'flex' : 'none',
        flexDirection: 'column',
        padding: '20px 16px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        zIndex: 100,
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          fontSize: '22px',
          fontWeight: 'bold',
          color: '#00e5ff',
          marginBottom: '20px',
          textAlign: 'center',
          textShadow: '0 0 10px rgba(0, 229, 255, 0.5)',
          letterSpacing: '2px'
        }}>
          水下探秘
        </div>

        <div style={{
          background: 'rgba(0, 229, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          border: '1px solid rgba(0, 229, 255, 0.2)'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#88ccff',
            marginBottom: '8px'
          }}>
            当前深度
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#00e5ff',
            textShadow: '0 0 15px rgba(0, 229, 255, 0.5)'
          }}>
            {targetDepth.toFixed(0)} <span style={{ fontSize: '16px' }}>米</span>
          </div>
          <div style={{
            fontSize: '12px',
            color: '#39ff14',
            marginTop: '4px'
          }}>
            {currentLayer.name}
          </div>
        </div>

        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#88ccff',
            marginBottom: '12px',
            fontWeight: '600'
          }}>
            环境数据
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#aabbcc', fontSize: '12px' }}>水温</span>
              <span style={{ color: '#ff6b6b', fontWeight: '600', fontSize: '14px' }}>
                {environmentData.temperature.toFixed(1)}°C
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#aabbcc', fontSize: '12px' }}>光照强度</span>
              <span style={{ color: '#ffd700', fontWeight: '600', fontSize: '14px' }}>
                {(environmentData.lightIntensity * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#aabbcc', fontSize: '12px' }}>压力</span>
              <span style={{ color: '#00e5ff', fontWeight: '600', fontSize: '14px' }}>
                {environmentData.pressure.toFixed(1)} atm
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#aabbcc', fontSize: '12px' }}>能见度</span>
              <span style={{ color: '#39ff14', fontWeight: '600', fontSize: '14px' }}>
                {environmentData.visibility.toFixed(0)} m
              </span>
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#88ccff',
            marginBottom: '12px',
            fontWeight: '600'
          }}>
            小地图
          </div>
          <div style={{
            position: 'relative',
            width: '100%',
            paddingBottom: '100%',
            background: 'rgba(0, 229, 255, 0.05)',
            borderRadius: '8px',
            border: '1px solid rgba(0, 229, 255, 0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '8px',
              height: '8px',
              background: '#39ff14',
              borderRadius: '50%',
              boxShadow: '0 0 10px #39ff14',
              zIndex: 10
            }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(${compassRotation}deg)`,
              width: '20px',
              height: '20px'
            }}>
              <div style={{
                position: 'absolute',
                top: '0',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '0',
                height: '0',
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderBottom: '10px solid #ff6b6b'
              }} />
            </div>
            {creaturePositions.map(({ id, position }) => {
              const creature = marineCreatures.find(c => c.id === id);
              if (!creature) return null;
              const isVisible = isCreatureInCurrentDepth(creature);
              const mapX = 50 + (position.x / 80) * 45;
              const mapY = 50 - (position.z / 80) * 45;
              return (
                <div
                  key={id}
                  style={{
                    position: 'absolute',
                    top: `${mapY}%`,
                    left: `${mapX}%`,
                    transform: 'translate(-50%, -50%)',
                    width: isVisible ? '6px' : '4px',
                    height: isVisible ? '6px' : '4px',
                    background: isVisible ? '#00e5ff' : '#666',
                    borderRadius: '50%',
                    boxShadow: isVisible ? '0 0 8px #00e5ff' : 'none',
                    opacity: isVisible ? 1 : 0.4,
                    transition: 'all 0.3s ease'
                  }}
                  title={creature.name}
                />
              );
            })}
            {depthLayers.map((_, index) => (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: '10%',
                  right: '10%',
                  top: `${20 + index * 15}%`,
                  height: '1px',
                  background: `linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.3), transparent)`
                }}
              />
            ))}
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '8px',
            fontSize: '10px',
            color: '#666'
          }}>
            <span>0m</span>
            <span>250m</span>
            <span>500m</span>
          </div>
        </div>

        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          flex: 1,
          overflowY: 'auto'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#88ccff',
            marginBottom: '12px',
            fontWeight: '600'
          }}>
            海洋生物
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {marineCreatures.map(creature => {
              const isActive = isCreatureInCurrentDepth(creature);
              const isSelected = selectedCreature?.id === creature.id;
              return (
                <button
                  key={creature.id}
                  onClick={() => handleCreatureClick(creature)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: isSelected
                      ? 'rgba(0, 229, 255, 0.2)'
                      : isActive
                        ? 'rgba(57, 255, 20, 0.1)'
                        : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isSelected
                      ? 'rgba(0, 229, 255, 0.5)'
                      : isActive
                        ? 'rgba(57, 255, 20, 0.3)'
                        : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    color: isActive ? '#ffffff' : '#666666'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.background = 'rgba(0, 229, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = isSelected
                      ? 'rgba(0, 229, 255, 0.2)'
                      : isActive
                        ? 'rgba(57, 255, 20, 0.1)'
                        : 'rgba(255, 255, 255, 0.02)';
                  }}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isActive ? '#39ff14' : '#444',
                    boxShadow: isActive ? '0 0 8px #39ff14' : 'none',
                    flexShrink: 0,
                    transition: 'all 0.3s ease'
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {creature.name}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: isActive ? '#88ccff' : '#555'
                    }}>
                      {creature.depthRange[0]}-{creature.depthRange[1]}m
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: '50%',
        right: '30px',
        transform: 'translateY(-50%)',
        height: '70%',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        zIndex: 100
      }}>
        <div style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '4px'
        }}>
          {depthMarks.map(mark => (
            <div
              key={mark}
              style={{
                position: 'absolute',
                right: '0',
                top: `${(1 - mark / 500) * 100}%`,
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: mark <= 50 ? '#ffd700' : mark <= 200 ? '#88ccff' : '#6688aa',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{mark}m</span>
              <div style={{
                width: mark % 100 === 0 ? '12px' : '6px',
                height: '1px',
                background: mark % 100 === 0 ? 'rgba(0, 229, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'
              }} />
            </div>
          ))}
        </div>

        <div style={{
          position: 'relative',
          width: '8px',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${(targetDepth / 500) * 100}%`,
            background: 'linear-gradient(to top, #00e5ff, #39ff14)',
            borderRadius: '4px',
            transition: 'height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 0 15px rgba(0, 229, 255, 0.5)'
          }} />
          <input
            type="range"
            min="0"
            max="500"
            value={targetDepth}
            onChange={handleSliderChange}
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%) rotate(-90deg)',
              transformOrigin: 'center center',
              width: 'calc(100% + 20px)',
              height: '40px',
              opacity: 0,
              cursor: 'pointer',
              writingMode: 'vertical-lr',
              direction: 'rtl'
            } as React.CSSProperties}
          />
          <div style={{
            position: 'absolute',
            bottom: `calc(${(targetDepth / 500) * 100}% - 10px)`,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '20px',
            height: '20px',
            background: '#ffffff',
            borderRadius: '50%',
            boxShadow: '0 0 15px rgba(0, 229, 255, 0.8), 0 0 30px rgba(57, 255, 20, 0.5)',
            transition: 'bottom 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            pointerEvents: 'none'
          }} />
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '80px',
        height: '80px',
        background: 'rgba(10, 22, 40, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '50%',
        border: '2px solid rgba(0, 229, 255, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        boxShadow: '0 0 20px rgba(0, 229, 255, 0.2)'
      }}>
        <div style={{
          position: 'relative',
          width: '60px',
          height: '60px'
        }}>
          {['N', 'E', 'S', 'W'].map((dir, i) => (
            <span
              key={dir}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) rotate(${i * 90}deg) translateY(-25px)`,
                fontSize: '10px',
                color: i === 0 ? '#ff6b6b' : '#88ccff',
                fontWeight: 'bold'
              }}
            >
              {dir}
            </span>
          ))}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) rotate(${compassRotation}deg)`,
            width: '4px',
            height: '40px'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '20px solid #ff6b6b'
            }} />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '20px solid #88ccff'
            }} />
          </div>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '8px',
            height: '8px',
            background: '#00e5ff',
            borderRadius: '50%',
            boxShadow: '0 0 10px #00e5ff'
          }} />
        </div>
      </div>

      {selectedCreature && (
        <div
          onClick={() => onCreatureSelect(null)}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${infoPanelScale})`,
            width: '400px',
            maxWidth: '90vw',
            background: 'rgba(10, 22, 40, 0.9)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            boxShadow: '0 0 40px rgba(0, 229, 255, 0.3), inset 0 0 60px rgba(0, 229, 255, 0.05)',
            padding: '24px',
            zIndex: 200,
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            cursor: 'default'
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #00e5ff, #39ff14, #00e5ff, transparent)',
            borderRadius: '20px 20px 0 0'
          }} />
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #00e5ff, #39ff14, #00e5ff, transparent)',
            borderRadius: '0 0 20px 20px'
          }} />

          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreatureSelect(null);
            }}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '28px',
              height: '28px',
              background: 'rgba(255, 107, 107, 0.2)',
              border: '1px solid rgba(255, 107, 107, 0.5)',
              borderRadius: '50%',
              color: '#ff6b6b',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 107, 107, 0.4)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ×
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px',
            paddingRight: '30px'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, #${selectedCreature.color.toString(16).padStart(6, '0')}, #${selectedCreature.glowColor.toString(16).padStart(6, '0')})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              boxShadow: `0 0 20px #${selectedCreature.glowColor.toString(16).padStart(6, '0')}40`
            }}>
              {selectedCreature.modelType === 'fish' && '🐟'}
              {selectedCreature.modelType === 'turtle' && '🐢'}
              {selectedCreature.modelType === 'shark' && '🦈'}
              {selectedCreature.modelType === 'jellyfish' && '🪼'}
              {selectedCreature.modelType === 'whale' && '🐋'}
              {selectedCreature.modelType === 'dolphin' && '🐬'}
              {selectedCreature.modelType === 'octopus' && '🐙'}
              {selectedCreature.modelType === 'ray' && '🦈'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#ffffff',
                marginBottom: '4px'
              }}>
                {selectedCreature.name}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#88ccff',
                fontStyle: 'italic'
              }}>
                {selectedCreature.scientificName}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              background: 'rgba(0, 229, 255, 0.1)',
              borderRadius: '10px',
              padding: '12px',
              border: '1px solid rgba(0, 229, 255, 0.2)'
            }}>
              <div style={{ fontSize: '11px', color: '#88ccff', marginBottom: '4px' }}>栖息深度</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00e5ff' }}>
                {selectedCreature.depthRange[0]} - {selectedCreature.depthRange[1]} m
              </div>
            </div>
            <div style={{
              background: 'rgba(57, 255, 20, 0.1)',
              borderRadius: '10px',
              padding: '12px',
              border: '1px solid rgba(57, 255, 20, 0.2)'
            }}>
              <div style={{ fontSize: '11px', color: '#88ccff', marginBottom: '4px' }}>尺寸</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#39ff14' }}>
                {selectedCreature.size} 米
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 215, 0, 0.1)',
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '16px',
            border: '1px solid rgba(255, 215, 0, 0.2)'
          }}>
            <div style={{ fontSize: '11px', color: '#ffd700', marginBottom: '4px' }}>主要食物</div>
            <div style={{ fontSize: '14px', color: '#ffffff' }}>{selectedCreature.food}</div>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '13px', color: '#88ccff', marginBottom: '8px', fontWeight: '600' }}>
              物种介绍
            </div>
            <div style={{ fontSize: '13px', color: '#cccccc', lineHeight: '1.6' }}>
              {selectedCreature.description}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.1), rgba(57, 255, 20, 0.1))',
            borderRadius: '10px',
            padding: '14px',
            border: '1px solid rgba(0, 229, 255, 0.3)'
          }}>
            <div style={{ fontSize: '13px', color: '#39ff14', marginBottom: '8px', fontWeight: '600' }}>
              💡 趣味知识
            </div>
            <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: '1.6' }}>
              {selectedCreature.funFact}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsPanelVisible(!isPanelVisible)}
        style={{
          position: 'absolute',
          top: '20px',
          left: isPanelVisible ? '280px' : '20px',
          width: '40px',
          height: '40px',
          background: 'rgba(10, 22, 40, 0.8)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: '10px',
          color: '#00e5ff',
          fontSize: '20px',
          cursor: 'pointer',
          zIndex: 150,
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 229, 255, 0.2)';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(10, 22, 40, 0.8)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isPanelVisible ? '◀' : '▶'}
      </button>
    </>
  );
}
