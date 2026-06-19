import type { ActionType, Pet } from './types';
import { PET_NAMES } from './petSprites';

interface ActionPanelProps {
  pet: Pet;
  onAction: (action: ActionType) => void;
  disabled: boolean;
}

const ACTIONS: {
  type: ActionType;
  icon: string;
  label: string;
  sublabel: string;
}[] = [
  { type: 'feed', icon: '🍪', label: '喂食', sublabel: '饱腹+10 / 快乐-5' },
  { type: 'play', icon: '⚽', label: '玩耍', sublabel: '快乐+15 / 清洁-8' },
  { type: 'clean', icon: '🧺', label: '清洁', sublabel: '清洁+20 / 饱腹-3' },
];

function formatId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ActionPanel({ pet, onAction, disabled }: ActionPanelProps) {
  return (
    <aside className="action-panel">
      <div className="action-panel-title">互动面板</div>

      <div className="action-buttons">
        {ACTIONS.map((a) => (
          <button
            key={a.type}
            className={`action-btn ${a.type}`}
            onClick={() => onAction(a.type)}
            disabled={disabled}
          >
            <span className="action-btn-icon">{a.icon}</span>
            <span className="action-btn-label">
              <span>{a.label}</span>
              <span>{a.sublabel}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="pet-info-card">
        <div className="pet-info-row">
          <span>名字</span>
          <span>{pet.name}</span>
        </div>
        <div className="pet-info-row">
          <span>种类</span>
          <span>{PET_NAMES[pet.type]}</span>
        </div>
        <div className="pet-info-row">
          <span>编号</span>
          <span>#{formatId(pet.id)}</span>
        </div>
        <div className="pet-info-row">
          <span>领养日</span>
          <span>{formatDate(pet.createdAt)}</span>
        </div>
      </div>
    </aside>
  );
}
