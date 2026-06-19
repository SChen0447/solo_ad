import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore, calculateSettlements } from '../store';
import type { Schedule, Expense } from '../../../shared/types';
import {
  Plus,
  Clock,
  MapPin,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  DollarSign,
  Users,
  Calendar,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const DAY_COLORS = [
  'from-rose-50 to-orange-50 border-rose-200',
  'from-sky-50 to-blue-50 border-sky-200',
  'from-emerald-50 to-teal-50 border-emerald-200',
  'from-amber-50 to-yellow-50 border-amber-200',
  'from-violet-50 to-purple-50 border-violet-200',
  'from-pink-50 to-rose-50 border-pink-200',
];

const MARKER_COLORS = ['#E74C3C', '#3498DB', '#27AE60', '#F39C12', '#9B59B6', '#E91E63'];

function formatDate(dayKey: string, idx: number) {
  const d = new Date(dayKey + 'T00:00:00');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return {
    day: `Day ${idx + 1}`,
    date: `${d.getMonth() + 1}月${d.getDate()}日`,
    weekday: weekdays[d.getDay()],
  };
}

function SortableScheduleCard({
  schedule,
  colorClass,
  dayIdx,
}: {
  schedule: Schedule;
  colorClass: string;
  dayIdx: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const { trip, sendMessage, currentMember, showToast } = useAppStore();
  const [form, setForm] = useState(schedule);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: schedule.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const saveEdit = () => {
    if (!trip) return;
    sendMessage({ type: 'UPDATE_SCHEDULE', tripId: trip.id, schedule: form });
    setEditing(false);
    showToast('日程已更新', 'success');
  };

  const del = () => {
    if (!trip) return;
    sendMessage({ type: 'DELETE_SCHEDULE', tripId: trip.id, scheduleId: schedule.id });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gradient-to-br ${colorClass} border rounded-xl shadow-md mb-3 overflow-hidden`}
    >
      <div className="p-4">
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing pt-1 text-gray-400 hover:text-gray-600 touch-none"
          >
            <GripVertical size={18} />
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-2 py-1 rounded border border-navy/30 font-semibold text-navy bg-white"
              />
            ) : (
              <h3 className="font-semibold text-navy truncate">{schedule.title}</h3>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600 flex-wrap">
              <div className="flex items-center gap-1">
                <Clock size={12} />
                {editing ? (
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="px-1 py-0.5 rounded border text-xs"
                  />
                ) : (
                  <span>{schedule.time}</span>
                )}
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <MapPin size={12} className="flex-shrink-0" />
                {editing ? (
                  <input
                    value={form.location.name}
                    onChange={(e) => setForm({ ...form, location: { ...form.location, name: e.target.value } })}
                    className="px-1 py-0.5 rounded border text-xs w-32"
                  />
                ) : (
                  <span className="truncate">{schedule.location.name}</span>
                )}
              </div>
              {schedule.budget > 0 && (
                <div className="flex items-center gap-1">
                  <DollarSign size={12} />
                  <span>¥{schedule.budget}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {editing ? (
              <>
                <button onClick={saveEdit} className="p-1.5 hover:bg-green-100 rounded-lg transition-colors">
                  <Check size={16} className="text-green-600" />
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setForm(schedule);
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
                >
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
                >
                  <Pencil size={16} className="text-navy" />
                </button>
                <button
                  onClick={del}
                  className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 size={16} className="text-coral" />
                </button>
              </>
            )}
          </div>
        </div>

        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: expanded ? '300px' : '0', opacity: expanded ? 1 : 0 }}
        >
          <div className="pt-3 mt-3 border-t border-black/5 space-y-2">
            {(schedule.notes || editing) && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">备注</label>
                {editing ? (
                  <textarea
                    value={form.notes || ''}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="w-full mt-1 px-2 py-1.5 text-sm rounded border bg-white"
                    placeholder="输入备注..."
                  />
                ) : (
                  <p className="text-sm text-gray-700 mt-1">{schedule.notes || '-'}</p>
                )}
              </div>
            )}
            {editing && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500">预算</label>
                  <input
                    type="number"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                    className="w-full mt-1 px-2 py-1 text-sm rounded border bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">纬度</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.location.lat}
                    onChange={(e) => setForm({ ...form, location: { ...form.location, lat: Number(e.target.value) } })}
                    className="w-full mt-1 px-2 py-1 text-sm rounded border bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">经度</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.location.lng}
                    onChange={(e) => setForm({ ...form, location: { ...form.location, lng: Number(e.target.value) } })}
                    className="w-full mt-1 px-2 py-1 text-sm rounded border bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleCardOverlay({ schedule, colorClass }: { schedule: Schedule; colorClass: string }) {
  return (
    <div className={`bg-gradient-to-br ${colorClass} border rounded-xl shadow-2xl p-4 opacity-90`}>
      <h3 className="font-semibold text-navy">{schedule.title}</h3>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span>{schedule.time}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin size={12} />
          <span>{schedule.location.name}</span>
        </div>
      </div>
    </div>
  );
}

function AddScheduleForm({ dayKey, onClose }: { dayKey: string; onClose: () => void }) {
  const { trip, currentMember, sendMessage, showToast } = useAppStore();
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState('35.6762');
  const [lng, setLng] = useState('139.6503');
  const [budget, setBudget] = useState('0');
  const [notes, setNotes] = useState('');

  const submit = () => {
    if (!trip || !title.trim() || !location.trim()) {
      showToast('请填写标题和地点', 'error');
      return;
    }
    const s: Schedule = {
      id: uuidv4(),
      tripId: trip.id,
      dayKey,
      time,
      title: title.trim(),
      location: { name: location.trim(), lat: Number(lat), lng: Number(lng) },
      budget: Number(budget),
      notes: notes.trim() || undefined,
    };
    sendMessage({ type: 'ADD_SCHEDULE', tripId: trip.id, schedule: s });
    onClose();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 mb-3 animate-slide-down">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-navy">添加日程</h4>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X size={16} className="text-gray-500" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="活动名称 *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="col-span-2 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-coral focus:outline-none"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-coral focus:outline-none"
        />
        <input
          placeholder="预算 (¥)"
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-coral focus:outline-none"
        />
        <input
          placeholder="地点名称 *"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="col-span-2 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-coral focus:outline-none"
        />
        <input
          placeholder="纬度"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-coral focus:outline-none"
        />
        <input
          placeholder="经度"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-coral focus:outline-none"
        />
        <textarea
          placeholder="备注 (可选)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="col-span-2 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-coral focus:outline-none resize-none"
        />
      </div>
      <button
        onClick={submit}
        className="mt-3 w-full py-2 bg-coral text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors"
      >
        添加日程
      </button>
    </div>
  );
}

function ExpenseForm({ onClose }: { onClose: () => void }) {
  const { trip, sendMessage, currentMember, showToast } = useAppStore();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentMember?.id || '');
  const [splitAmong, setSplitAmong] = useState<string[]>(trip?.members.map((m) => m.id) || []);

  const toggleMember = (id: string) => {
    setSplitAmong((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = () => {
    if (!trip || !description.trim() || !amount || !paidBy || splitAmong.length === 0) {
      showToast('请完整填写费用信息', 'error');
      return;
    }
    const e: Expense = {
      id: uuidv4(),
      tripId: trip.id,
      description: description.trim(),
      amount: Number(amount),
      paidBy,
      splitAmong,
    };
    sendMessage({ type: 'ADD_EXPENSE', tripId: trip.id, expense: e });
    onClose();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 animate-slide-down">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-navy flex items-center gap-1.5">
          <DollarSign size={16} className="text-coral" /> 记录费用
        </h4>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X size={16} className="text-gray-500" />
        </button>
      </div>
      <div className="space-y-2">
        <input
          placeholder="费用描述（如：晚餐、打车）"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-coral focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="金额 (¥)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-coral focus:outline-none"
          />
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-coral focus:outline-none bg-white"
          >
            <option value="">支付人</option>
            {trip?.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.username}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block flex items-center gap-1">
            <Users size={12} /> 分摊成员
          </label>
          <div className="flex flex-wrap gap-2">
            {trip?.members.map((m) => (
              <button
                key={m.id}
                onClick={() => toggleMember(m.id)}
                className={`px-3 py-1.5 text-xs rounded-full border-2 transition-all ${
                  splitAmong.includes(m.id)
                    ? 'bg-coral text-white border-coral'
                    : 'bg-white text-navy border-gray-200 hover:border-gray-300'
                }`}
              >
                {m.username}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={submit}
          className="w-full py-2 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 transition-colors mt-2"
        >
          记录费用
        </button>
      </div>
    </div>
  );
}

export default function TripBoard() {
  const { trip, sendMessage } = useAppStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showAddDay, setShowAddDay] = useState(false);
  const [newDayKey, setNewDayKey] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const grouped = useMemo(() => {
    if (!trip) return [];
    const map = new Map<string, Schedule[]>();
    for (const s of trip.schedules) {
      if (!map.has(s.dayKey)) map.set(s.dayKey, []);
      map.get(s.dayKey)!.push(s);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dayKey, schedules]) => ({
        dayKey,
        schedules: schedules.sort((a, b) => a.time.localeCompare(b.time)),
      }));
  }, [trip]);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over || !trip || active.id === over.id) return;

    const dayGroup = grouped.find((g) => g.schedules.some((s) => s.id === active.id));
    if (!dayGroup) return;

    const ids = dayGroup.schedules.map((s) => s.id);
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;

    const newOrder = arrayMove(ids, oldIdx, newIdx);
    sendMessage({
      type: 'REORDER_SCHEDULES',
      tripId: trip.id,
      dayKey: dayGroup.dayKey,
      order: newOrder,
    });
  };

  const settlements = calculateSettlements(trip);
  const totalExpense = trip?.expenses.reduce((s, e) => s + e.amount, 0) || 0;

  const activeSchedule = activeId ? trip?.schedules.find((s) => s.id === activeId) : null;
  const activeDayIdx = activeSchedule
    ? grouped.findIndex((g) => g.dayKey === activeSchedule.dayKey)
    : 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4 md:p-6 space-y-6">
        {grouped.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Calendar size={48} className="mx-auto mb-3 opacity-40" />
            <p>还没有日程，点击下方按钮开始规划吧！</p>
          </div>
        )}

        {grouped.map((group, idx) => {
          const colorClass = DAY_COLORS[idx % DAY_COLORS.length];
          const info = formatDate(group.dayKey, idx);
          const reorderMap = new Map(group.schedules.map((s, i) => [s.id, i]));
          const orderedSchedules = [...group.schedules].sort(
            (a, b) => (reorderMap.get(a.id) ?? 0) - (reorderMap.get(b.id) ?? 0)
          );

          return (
            <div key={group.dayKey}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-display text-white shadow-md"
                    style={{ backgroundColor: MARKER_COLORS[idx % MARKER_COLORS.length] }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <h2 className="font-display text-lg text-navy leading-tight">{info.day}</h2>
                    <p className="text-xs text-gray-500">
                      {info.date} · {info.weekday}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 ml-2">
                    {group.schedules.length} 项日程
                  </div>
                </div>
                <button
                  onClick={() => setAddingDay(addingDay === group.dayKey ? null : group.dayKey)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-navy hover:border-coral hover:text-coral transition-colors"
                >
                  <Plus size={14} /> 添加
                </button>
              </div>

              {addingDay === group.dayKey && (
                <AddScheduleForm dayKey={group.dayKey} onClose={() => setAddingDay(null)} />
              )}

              <SortableContext items={orderedSchedules.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {orderedSchedules.map((s) => (
                  <SortableScheduleCard
                    key={s.id}
                    schedule={s}
                    colorClass={colorClass}
                    dayIdx={idx}
                  />
                ))}
              </SortableContext>
            </div>
          );
        })}

        <div className="pt-2">
          {!showAddDay ? (
            <button
              onClick={() => setShowAddDay(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-coral hover:text-coral transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Plus size={16} /> 添加新的一天
            </button>
          ) : (
            <div className="bg-white rounded-xl border-2 border-dashed border-coral/50 p-4">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={newDayKey}
                  onChange={(e) => setNewDayKey(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-coral focus:outline-none"
                />
                <button
                  onClick={() => {
                    setAddingDay(newDayKey);
                    setShowAddDay(false);
                  }}
                  className="px-4 py-2 bg-coral text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                >
                  确定
                </button>
                <button
                  onClick={() => setShowAddDay(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-navy flex items-center gap-2">
              <DollarSign size={18} className="text-coral" />
              费用分摊
              {totalExpense > 0 && (
                <span className="text-sm font-body font-normal text-gray-500">
                  总计 ¥{totalExpense.toFixed(2)}
                </span>
              )}
            </h2>
            {!showExpenseForm && (
              <button
                onClick={() => setShowExpenseForm(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-navy text-white rounded-lg text-sm hover:bg-navy/90 transition-colors"
              >
                <Plus size={14} /> 记录费用
              </button>
            )}
          </div>

          {showExpenseForm && <ExpenseForm onClose={() => setShowExpenseForm(false)} />}

          {trip && trip.expenses.length > 0 && (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="py-2 px-3 font-semibold">描述</th>
                    <th className="py-2 px-3 font-semibold">金额</th>
                    <th className="py-2 px-3 font-semibold">支付人</th>
                    <th className="py-2 px-3 font-semibold">分摊</th>
                  </tr>
                </thead>
                <tbody>
                  {trip.expenses.map((e) => {
                    const payer = trip.members.find((m) => m.id === e.paidBy);
                    const share = (e.amount / e.splitAmong.length).toFixed(2);
                    return (
                      <tr
                        key={e.id}
                        className="border-t border-gray-100 hover:bg-cream/60 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-navy">{e.description}</td>
                        <td className="py-2.5 px-3 font-semibold text-coral">¥{e.amount.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-gray-600">{payer?.username || '-'}</td>
                        <td className="py-2.5 px-3 text-gray-500 text-xs">
                          {e.splitAmong.length}人 × ¥{share}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {settlements.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-cream/60 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  结算明细
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="py-2 px-4 font-medium">成员</th>
                    <th className="py-2 px-4 font-medium">已支付</th>
                    <th className="py-2 px-4 font-medium">应分摊</th>
                    <th className="py-2 px-4 font-medium">差额</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((s) => (
                    <tr
                      key={s.memberId}
                      className="border-t border-gray-100 hover:bg-cream/60 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-navy font-medium">{s.username}</td>
                      <td className="py-2.5 px-4 text-green-600">¥{s.paid.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-orange-600">¥{s.owed.toFixed(2)}</td>
                      <td
                        className={`py-2.5 px-4 font-semibold ${
                          s.balance > 0
                            ? 'text-green-600'
                            : s.balance < 0
                            ? 'text-coral'
                            : 'text-gray-500'
                        }`}
                      >
                        {s.balance > 0 ? '+' : ''}¥{s.balance.toFixed(2)}
                        {s.balance > 0 && <span className="text-xs ml-1 font-normal">应收</span>}
                        {s.balance < 0 && <span className="text-xs ml-1 font-normal">应付</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeSchedule && (
          <ScheduleCardOverlay
            schedule={activeSchedule}
            colorClass={DAY_COLORS[activeDayIdx % DAY_COLORS.length]}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
