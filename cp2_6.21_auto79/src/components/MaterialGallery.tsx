import { useMemo } from 'react';
import type { Material } from '../types';

interface Props {
  materials: Material[];
  selectedId: string | null;
  onSelect: (material: Material) => void;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

const TYPE_COLORS: Record<string, string> = {
  PNG: '#4ADE80',
  GIF: '#FACC15',
};

export default function MaterialGallery({ materials, selectedId, onSelect }: Props) {
  const sortedMaterials = useMemo(() => {
    return [...materials].sort((a, b) => b.uploadedAt - a.uploadedAt);
  }, [materials]);

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
      {sortedMaterials.map((material) => {
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
                bottom: 50,
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
              }}>
                {formatDate(material.uploadedAt)}
                {hasAnnotations && (
                  <span style={{ marginLeft: 8 }}>
                    · {material.annotationCount} 个标注
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
