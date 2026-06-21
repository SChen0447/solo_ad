import { useMemo, useState } from 'react';
import type { Material } from '../types';

interface Props {
  materials: Material[];
  selectedId: string | null;
  onSelect: (material: Material) => void;
}

const TYPE_COLORS: Record<string, string> = {
  PNG: '#4ADE80',
  GIF: '#FACC15',
};

export default function MaterialGallery({ materials, selectedId, onSelect }: Props) {
  const [searchText, setSearchText] = useState('');

  const sortedMaterials = useMemo(() => {
    return [...materials].sort((a, b) => b.uploadedAt - a.uploadedAt);
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    if (!searchText.trim()) return sortedMaterials;
    const keyword = searchText.trim().toLowerCase();
    return sortedMaterials.filter((m) => {
      const nameMatch = m.name.toLowerCase().includes(keyword);
      const typeMatch = m.type.toLowerCase().includes(keyword);
      return nameMatch || typeMatch;
    });
  }, [sortedMaterials, searchText]);

  const handleClearSearch = () => {
    setSearchText('');
  };

  if (materials.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6C7086',
        fontSize: 14,
      }}>
        暂无素材，点击上方按钮上传
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #313244',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}>
          <div style={{
            position: 'absolute',
            left: 10,
            color: '#6C7086',
            fontSize: 14,
            pointerEvents: 'none',
            fontFamily: 'monospace',
          }}>
            ⌕
          </div>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索素材名称或类型..."
            style={{
              width: '100%',
              padding: '8px 32px 8px 30px',
              backgroundColor: '#11111B',
              border: '2px solid #45475A',
              color: '#CDD6F4',
              fontSize: 13,
              fontFamily: "'Courier New', Courier, monospace",
              letterSpacing: '0.5px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#A78BFA';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#45475A';
            }}
          />
          {searchText && (
            <button
              onClick={handleClearSearch}
              style={{
                position: 'absolute',
                right: 6,
                width: 22,
                height: 22,
                borderRadius: 0,
                backgroundColor: '#45475A',
                color: '#CDD6F4',
                fontSize: 12,
                fontFamily: 'monospace',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#6C7086';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#45475A';
              }}
            >
              ✕
            </button>
          )}
        </div>
        {searchText.trim() && (
          <div style={{
            fontSize: 11,
            color: '#6C7086',
            marginTop: 6,
            fontFamily: 'monospace',
          }}>
            找到 {filteredMaterials.length} / {sortedMaterials.length} 个素材
          </div>
        )}
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 20,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, 240px)',
        gap: 20,
        justifyContent: 'center',
        alignContent: 'start',
      }}>
        {filteredMaterials.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            padding: 40,
            textAlign: 'center',
            color: '#6C7086',
            fontSize: 13,
            fontFamily: 'monospace',
          }}>
            未找到匹配「{searchText}」的素材
          </div>
        ) : (
          filteredMaterials.map((material) => {
            const isSelected = material.id === selectedId;
            const hasAnnotations = (material.annotationCount || 0) > 0;

            return (
              <div
                key={material.id}
                onClick={() => onSelect(material)}
                style={{
                  width: 240,
                  borderRadius: 8,
                  background: 'linear-gradient(180deg, #1E1E2E 0%, #2D2D3F 100%)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
                  transform: 'translateY(0)',
                  boxShadow: 'none',
                  border: isSelected ? '2px solid #A78BFA' : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  backgroundColor: TYPE_COLORS[material.type] || '#9399B2',
                  color: '#1E1E2E',
                  zIndex: 2,
                }}>
                  {material.type}
                </div>

                {hasAnnotations && (
                  <div style={{
                    position: 'absolute',
                    bottom: 56,
                    right: 12,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: '#FF4757',
                    boxShadow: '0 0 8px rgba(255, 71, 87, 0.6)',
                    zIndex: 2,
                  }} />
                )}

                <div style={{
                  width: '100%',
                  height: 180,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#11111B',
                  overflow: 'hidden',
                }}>
                  <img
                    src={material.data}
                    alt={material.name}
                    style={{
                      maxWidth: '80%',
                      maxHeight: '80%',
                      imageRendering: 'pixelated',
                    }}
                    draggable={false}
                  />
                </div>

                <div style={{
                  padding: '12px 14px 14px',
                }}>
                  <div style={{
                    fontSize: 14,
                    color: '#FFFFFF',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: 6,
                  }}>
                    {material.name}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: '#6C7086',
                    fontFamily: "'Courier New', Courier, monospace",
                    letterSpacing: '0.3px',
                  }}>
                    {material.uploadTime || ''}
                    {hasAnnotations && (
                      <span style={{ marginLeft: 8 }}>
                        · {material.annotationCount} 标注
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
