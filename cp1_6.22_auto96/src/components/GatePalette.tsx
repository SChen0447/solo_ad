import { GateIcon } from './GateIcon';
import type { GateType } from '../types';

interface GatePaletteProps {
  availableGates: { type: GateType; count: number }[];
  selectedGate: GateType | null;
  onSelectGate: (type: GateType | null) => void;
  placedGatesCount: Record<GateType, number>;
}

const gateNames: Record<GateType, string> = {
  AND: '与门',
  OR: '或门',
  NOT: '非门',
};

export function GatePalette({
  availableGates,
  selectedGate,
  onSelectGate,
  placedGatesCount,
}: GatePaletteProps) {
  const handleDragStart = (e: React.DragEvent, type: GateType) => {
    e.dataTransfer.setData('gateType', type);
    onSelectGate(type);
  };

  return (
    <div className="gate-palette">
      <h3 className="palette-title">逻辑门库</h3>
      <div className="palette-gates">
        {availableGates.map(({ type, count }) => {
          const remaining = count - (placedGatesCount[type] || 0);
          const isSelected = selectedGate === type;
          const isDisabled = remaining <= 0;

          return (
            <div
              key={type}
              className={`gate-button ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
              draggable={!isDisabled}
              onDragStart={(e) => !isDisabled && handleDragStart(e, type)}
              onClick={() => !isDisabled && onSelectGate(isSelected ? null : type)}
              title={gateNames[type]}
            >
              <GateIcon type={type} size={44} />
              <span className="gate-name">{gateNames[type]}</span>
              <span className="gate-count">×{remaining}</span>
            </div>
          );
        })}
      </div>
      <style>{`
        .gate-palette {
          width: 200px;
          background: #2d3748;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-shrink: 0;
        }

        .palette-title {
          color: #a0aec0;
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 8px 0;
          text-align: center;
        }

        .palette-gates {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }

        .gate-button {
          width: 60px;
          height: 80px;
          border-radius: 50%;
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          border: 2px solid transparent;
        }

        .gate-button:hover:not(.disabled) {
          background: #4a5568;
          transform: translateY(-4px);
        }

        .gate-button.selected {
          border-color: #f6e05e;
          background: rgba(246, 224, 94, 0.1);
        }

        .gate-button.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .gate-name {
          color: #a0aec0;
          font-size: 12px;
          margin-top: 4px;
        }

        .gate-count {
          color: #f6e05e;
          font-size: 11px;
          font-weight: bold;
        }

        @media (max-width: 900px) {
          .gate-palette {
            width: 100%;
            flex-direction: row;
            align-items: center;
            overflow-x: auto;
            padding: 12px;
          }

          .palette-title {
            margin: 0 16px 0 0;
            white-space: nowrap;
          }

          .palette-gates {
            flex-direction: row;
            gap: 8px;
          }

          .gate-button {
            width: 60px;
            height: 70px;
            flex-shrink: 0;
          }
        }
      `}</style>
    </div>
  );
}
