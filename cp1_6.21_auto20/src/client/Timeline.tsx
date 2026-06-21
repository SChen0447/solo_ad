import { useState, useMemo } from 'react';
import { TravelPlan, Activity, ActivityCategory } from './types';

interface TimelineProps {
  plan: TravelPlan;
  currentMemberId: string;
}

const categoryIcons: Record<ActivityCategory, string> = {
  '景点': '🏛️',
  '餐厅': '🍽️',
  '交通': '🚗',
  '住宿': '🏨',
  '门票': '🎫',
  '其他': '📍',
};

function formatDate(startDate: string, dayIndex: number): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayIndex);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]}`;
}

export default function Timeline({ plan, currentMemberId }: TimelineProps) {
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isCreating, setIsCreating] = useState<number | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const days = useMemo(() => {
    const result: Activity[][] = [];
    for (let i = 0; i < plan.days; i++) {
      result.push(
        plan.activities
          .filter(a => a.dayIndex === i)
          .sort((a, b) => a.order - b.order)
      );
    }
    return result;
  }, [plan.activities, plan.days]);

  const createActivity = async (dayIndex: number, data: Partial<Activity>) => {
    await fetch(`/api/plans/${plan.id}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayIndex, ...data }),
    });
  };

  const updateActivity = async (activityId: string, data: Partial<Activity>) => {
    await fetch(`/api/plans/${plan.id}/activities/${activityId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  };

  const deleteActivity = async (activityId: string) => {
    if (!confirm('确定删除这个活动吗？')) return;
    await fetch(`/api/plans/${plan.id}/activities/${activityId}`, {
      method: 'DELETE',
    });
  };

  const handleDragStart = (e: React.DragEvent, activity: Activity) => {
    setDragId(activity.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dayIndex: number, overId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(dayIndex);
    setDragOverId(overId || null);
  };

  const handleDrop = async (e: React.DragEvent, dayIndex: number, overId?: string) => {
    e.preventDefault();
    if (!dragId) return;

    const currentDay = days[dayIndex].map(a => a.id);
    let newOrder = [...currentDay];

    const fromDayIdx = plan.activities.find(a => a.id === dragId)?.dayIndex;
    if (fromDayIdx !== dayIndex) {
      if (overId) {
        const idx = newOrder.indexOf(overId);
        newOrder.splice(idx, 0, dragId);
      } else {
        newOrder.push(dragId);
      }
    } else {
      newOrder = newOrder.filter(id => id !== dragId);
      if (overId) {
        const idx = newOrder.indexOf(overId);
        newOrder.splice(idx, 0, dragId);
      } else {
        newOrder.push(dragId);
      }
    }

    await fetch(`/api/plans/${plan.id}/activities/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reorderedIds: newOrder, dayIndex }),
    });

    setDragId(null);
    setDragOverDay(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverDay(null);
    setDragOverId(null);
  };

  return (
    <div>
      <div className="timeline-container">
        {days.map((activities, dayIndex) => {
          const dayBudget = activities.reduce((sum, a) => sum + a.budget, 0);
          return (
            <div
              key={dayIndex}
              className="day-column"
              onDragOver={e => handleDragOver(e, dayIndex)}
              onDrop={e => handleDrop(e, dayIndex)}
            >
              <div className="day-header">
                <div>
                  <div className="day-title">第 {dayIndex + 1} 天</div>
                  <div className="day-date">{formatDate(plan.startDate, dayIndex)}</div>
                </div>
                <div className="day-budget">¥{dayBudget}</div>
              </div>

              <div className="timeline">
                {activities.map((activity, idx) => {
                  const payer = activity.payerId
                    ? plan.members.find(m => m.id === activity.payerId)
                    : null;
                  const isDragging = dragId === activity.id;
                  const isDropTarget = dragOverId === activity.id && dragId !== activity.id;

                  return (
                    <div
                      key={activity.id}
                      className={`timeline-item ${isDragging ? 'dragging' : ''}`}
                      draggable
                      onDragStart={e => handleDragStart(e, activity)}
                      onDragOver={e => handleDragOver(e, dayIndex, activity.id)}
                      onDrop={e => handleDrop(e, dayIndex, activity.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="timeline-dot">{categoryIcons[activity.category]}</div>
                      <div
                        className={`activity-card ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
                        onClick={() => setEditingActivity(activity)}
                      >
                        <div className="activity-top">
                          <div className="activity-title">{activity.title}</div>
                          <span className="activity-category">{activity.category}</span>
                        </div>
                        <div className="activity-meta">
                          {activity.address && <span>📍 {activity.address}</span>}
                          {activity.budget > 0 && <span className="activity-budget">¥{activity.budget}</span>}
                        </div>
                        {activity.notes && (
                          <div className="activity-notes">{activity.notes}</div>
                        )}
                        {activity.images.length > 0 && (
                          <div className="activity-images">
                            {activity.images.slice(0, 3).map((img, i) => (
                              <img key={i} src={img} alt="" className="activity-thumb" />
                            ))}
                          </div>
                        )}
                        <div className="activity-bottom">
                          {payer ? (
                            <span className="payer-badge" style={{ background: payer.color + '22', color: payer.color }}>
                              <span className="payer-dot" style={{ background: payer.color }} />
                              {payer.name} 支付
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: '#aaa' }}>未认领付款</span>
                          )}
                          <div className="activity-actions" onClick={e => e.stopPropagation()}>
                            <button className="icon-btn" onClick={() => setEditingActivity(activity)}>✏️</button>
                            <button className="icon-btn" onClick={() => deleteActivity(activity.id)}>🗑️</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                className="add-activity-btn"
                onClick={() => setIsCreating(dayIndex)}
              >
                + 添加活动
              </button>
            </div>
          );
        })}
      </div>

      {(editingActivity || isCreating !== null) && (
        <ActivityModal
          plan={plan}
          activity={editingActivity}
          dayIndex={isCreating !== null ? isCreating : (editingActivity?.dayIndex ?? 0)}
          currentMemberId={currentMemberId}
          onClose={() => {
            setEditingActivity(null);
            setIsCreating(null);
          }}
          onSave={async (data) => {
            if (editingActivity) {
              await updateActivity(editingActivity.id, data);
            } else if (isCreating !== null) {
              await createActivity(isCreating, data);
            }
            setEditingActivity(null);
            setIsCreating(null);
          }}
          onDelete={editingActivity ? () => {
            deleteActivity(editingActivity.id);
            setEditingActivity(null);
          } : undefined}
        />
      )}
    </div>
  );
}

interface ActivityModalProps {
  plan: TravelPlan;
  activity: Activity | null;
  dayIndex: number;
  currentMemberId: string;
  onClose: () => void;
  onSave: (data: Partial<Activity>) => void;
  onDelete?: () => void;
}

function ActivityModal({ plan, activity, currentMemberId, onClose, onSave, onDelete }: ActivityModalProps) {
  const [title, setTitle] = useState(activity?.title || '');
  const [address, setAddress] = useState(activity?.address || '');
  const [budget, setBudget] = useState(activity?.budget?.toString() || '0');
  const [category, setCategory] = useState<ActivityCategory>(activity?.category || '景点');
  const [notes, setNotes] = useState(activity?.notes || '');
  const [payerId, setPayerId] = useState(activity?.payerId || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selfMember = plan.members.find(m => m.id === currentMemberId);
    onSave({
      title,
      address,
      budget: parseFloat(budget) || 0,
      category,
      notes,
      payerId: payerId || null,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{activity ? '编辑活动' : '新建活动'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>活动名称</label>
            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例如：参观故宫"
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>类别</label>
              <select
                className="input"
                value={category}
                onChange={e => setCategory(e.target.value as ActivityCategory)}
              >
                <option value="景点">🏛️ 景点</option>
                <option value="餐厅">🍽️ 餐厅</option>
                <option value="交通">🚗 交通</option>
                <option value="住宿">🏨 住宿</option>
                <option value="门票">🎫 门票</option>
                <option value="其他">📍 其他</option>
              </select>
            </div>
            <div className="form-group">
              <label>预算 (¥)</label>
              <input
                className="input"
                type="number"
                min={0}
                value={budget}
                onChange={e => setBudget(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>地址</label>
            <input
              className="input"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="例如：北京市东城区景山前街4号"
            />
          </div>

          <div className="form-group">
            <label>备注</label>
            <textarea
              className="input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="时间安排、注意事项等"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label>付款人</label>
            <select
              className="input"
              value={payerId}
              onChange={e => setPayerId(e.target.value)}
            >
              <option value="">— 暂未认领 —</option>
              {plan.members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            {onDelete && (
              <button type="button" className="btn-danger" onClick={onDelete}>
                删除
              </button>
            )}
            <button type="button" className="btn-cancel" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-save">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
