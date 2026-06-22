import { ConflictInfo, Activity } from '../../types';
import './ConflictModal.css';

interface ConflictModalProps {
  isOpen: boolean;
  conflicts: ConflictInfo[];
  newActivity: Activity | null;
  onCancel: () => void;
  onOverride: () => void;
}

export default function ConflictModal({
  isOpen,
  conflicts,
  newActivity,
  onCancel,
  onOverride
}: ConflictModalProps) {
  if (!isOpen || !newActivity) return null;

  return (
    <div className="conflict-overlay">
      <div className="conflict-panel">
        <div className="conflict-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h3 className="conflict-title">时间冲突警告</h3>
        <p className="conflict-subtitle">
          您预约的活动与以下活动时间重叠超过10分钟
        </p>

        <div className="conflict-list">
          {conflicts.map((conflict, index) => (
            <div key={index} className="conflict-item">
              <div className="conflict-activity-title">
                {conflict.conflictingActivityTitle}
              </div>
              <div className="conflict-activity-time">
                与「{newActivity.title}」重叠 {conflict.overlappingMinutes} 分钟
              </div>
            </div>
          ))}
        </div>

        <div className="conflict-actions">
          <button className="conflict-btn cancel" onClick={onCancel}>
            取消预约
          </button>
          <button className="conflict-btn override" onClick={onOverride}>
            覆盖原预约
          </button>
        </div>
      </div>
    </div>
  );
}
