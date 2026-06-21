import { useState, useEffect } from 'react';
import type { Material } from '../../common/types';

interface MaterialPanelProps {
  materials: Material[];
  onPurchase: (materialId: string) => void;
}

function PurchaseModal({
  material,
  onClose,
  onConfirm,
}: {
  material: Material;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#00000070',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          width: 360,
          padding: 24,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#1E293B' }}>补货确认</h3>
        <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#64748B' }}>
          确定要为 <strong style={{ color: '#334155' }}>{material.name}</strong> 补货吗？
        </p>
        <div
          style={{
            background: '#F0FDF4',
            borderRadius: 8,
            padding: 12,
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13, color: '#166534' }}>补货数量</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#15803D' }}>
            +1 {material.unit}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              fontSize: 14,
              color: '#475569',
              background: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#fff';
            }}
          >
            取消
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              color: '#fff',
              background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            确认补货
          </button>
        </div>
      </div>
    </div>
  );
}

function MaterialRow({
  material,
  isLowStock,
  onPurchase,
}: {
  material: Material;
  isLowStock: boolean;
  onPurchase: () => void;
}) {
  const [shouldBlink, setShouldBlink] = useState(isLowStock);

  useEffect(() => {
    if (isLowStock) {
      setShouldBlink(true);
      const timer = setTimeout(() => {
        setShouldBlink(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isLowStock, material.id]);

  return (
    <tr
      style={{
        height: 48,
        background: isLowStock ? '#FEF2F2' : '#fff',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!isLowStock) {
          (e.currentTarget as HTMLElement).style.background = '#F8FAFC';
        }
      }}
      onMouseLeave={(e) => {
        if (!isLowStock) {
          (e.currentTarget as HTMLElement).style.background = '#fff';
        } else {
          (e.currentTarget as HTMLElement).style.background = '#FEF2F2';
        }
      }}
    >
      <td style={{ padding: '0 16px', fontSize: 14, color: '#1E293B', fontWeight: 500 }}>
        {material.name}
      </td>
      <td style={{ padding: '0 16px', fontSize: 13, color: '#64748B' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 10,
            background: '#E0E7FF',
            color: '#4F46E5',
            fontSize: 12,
          }}
        >
          {material.category}
        </span>
      </td>
      <td style={{ padding: '0 16px' }}>
        <span
          className={isLowStock && shouldBlink ? 'blink-red' : ''}
          style={{
            fontSize: 14,
            fontWeight: isLowStock ? 700 : 500,
            color: isLowStock ? '#EF4444' : '#1E293B',
          }}
        >
          {material.currentStock} {material.unit}
        </span>
        {isLowStock && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 11,
              color: '#EF4444',
              background: '#FEE2E2',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            预警
          </span>
        )}
      </td>
      <td style={{ padding: '0 16px', fontSize: 13, color: '#64748B' }}>
        {material.safetyStock} {material.unit}
      </td>
      <td style={{ padding: '0 16px', fontSize: 13, color: '#64748B' }}>{material.supplier}</td>
      <td style={{ padding: '0 16px', textAlign: 'right' }}>
        <button
          onClick={onPurchase}
          style={{
            padding: '6px 14px',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            color: '#fff',
            background: isLowStock ? '#EF4444' : '#6366F1',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          补货
        </button>
      </td>
    </tr>
  );
}

function MaterialPanel({ materials, onPurchase }: MaterialPanelProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  const sortedMaterials = [...materials].sort((a, b) => {
    const aLow = a.currentStock < a.safetyStock;
    const bLow = b.currentStock < b.safetyStock;
    if (aLow && !bLow) return -1;
    if (!aLow && bLow) return 1;
    return a.currentStock - b.currentStock;
  });

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1E293B', margin: '0 0 20px 0' }}>
        物料库存
      </h2>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 6px #CBD5E1',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', height: 48 }}>
              <th
                style={{
                  textAlign: 'left',
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                物料名称
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                类别
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                当前库存
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                安全库存
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                供应商
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedMaterials.map((material) => (
              <MaterialRow
                key={material.id}
                material={material}
                isLowStock={material.currentStock < material.safetyStock}
                onPurchase={() => setSelectedMaterial(material)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {selectedMaterial && (
        <PurchaseModal
          material={selectedMaterial}
          onClose={() => setSelectedMaterial(null)}
          onConfirm={() => onPurchase(selectedMaterial.id)}
        />
      )}

      <style>{`
        .blink-red {
          animation: blink-red 1s ease-in-out 3;
        }
        @keyframes blink-red {
          0%, 100% {
            color: #EF4444;
            opacity: 1;
          }
          50% {
            color: #EF4444;
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}

export default MaterialPanel;
