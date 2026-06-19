import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, GripVertical } from 'lucide-react';
import type { Record, Photo } from '../types';
import { MEAL_TYPE_LABELS, MEAL_TYPE_COLORS } from '../types';

interface CalendarViewProps {
  records: Record[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onAddRecord: (date: string) => void;
  getDayBalanceScore: (date: string) => number;
  getBalanceColor: (score: number) => string;
  getRecordsByDate: (date: string) => Record[];
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function CalendarView({
  selectedDate,
  onDateSelect,
  getDayBalanceScore,
  getBalanceColor,
  getRecordsByDate,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const [popupDate, setPopupDate] = useState<string | null>(null);
  const [draggedPhoto, setDraggedPhoto] = useState<Photo | null>(null);
  const [dragOverPhoto, setDragOverPhoto] = useState<Photo | null>(null);
  const [localPhotos, setLocalPhotos] = useState<Photo[]>([]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days: { date: string; isCurrentMonth: boolean }[] = [];
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d.toISOString().split('T')[0],
        isCurrentMonth: false,
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d.toISOString().split('T')[0],
        isCurrentMonth: true,
      });
    }
    
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d.toISOString().split('T')[0],
        isCurrentMonth: false,
      });
    }
    
    return days;
  }, [currentMonth]);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (date: string) => {
    onDateSelect(date);
    const dayRecords = getRecordsByDate(date);
    if (dayRecords.length > 0) {
      setPopupDate(date);
      const allPhotos = dayRecords.flatMap(r => 
        r.photos.map(p => ({ ...p, recordId: r.id } as Photo & { recordId: string }))
      ).sort((a, b) => a.order - b.order) as Photo[];
      setLocalPhotos(allPhotos);
    }
  };

  const closePopup = () => {
    setPopupDate(null);
    setDraggedPhoto(null);
    setDragOverPhoto(null);
  };

  const handleDragStart = (photo: Photo) => {
    setDraggedPhoto(photo);
  };

  const handleDragOver = (e: React.DragEvent, photo: Photo) => {
    e.preventDefault();
    setDragOverPhoto(photo);
  };

  const handleDragLeave = () => {
    setDragOverPhoto(null);
  };

  const handleDrop = (targetPhoto: Photo) => {
    if (!draggedPhoto || draggedPhoto.id === targetPhoto.id) {
      setDraggedPhoto(null);
      setDragOverPhoto(null);
      return;
    }

    const newPhotos = [...localPhotos];
    const dragIndex = newPhotos.findIndex(p => p.id === draggedPhoto.id);
    const dropIndex = newPhotos.findIndex(p => p.id === targetPhoto.id);
    
    [newPhotos[dragIndex], newPhotos[dropIndex]] = [newPhotos[dropIndex], newPhotos[dragIndex]];
    newPhotos.forEach((p, i) => p.order = i);
    
    setLocalPhotos(newPhotos);
    setDraggedPhoto(null);
    setDragOverPhoto(null);
  };

  const handleDragEnd = () => {
    setDraggedPhoto(null);
    setDragOverPhoto(null);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const popupRecords = popupDate ? getRecordsByDate(popupDate) : [];
  const dayScore = popupDate ? getDayBalanceScore(popupDate) : -1;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-cream-50">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-orange-600" />
        </button>
        <h2 className="text-lg font-serif font-bold text-gray-800">
          {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-orange-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-orange-100">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="py-3 text-center text-sm font-medium text-gray-500 bg-cream-50"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map(({ date, isCurrentMonth }) => {
          const balanceScore = getDayBalanceScore(date);
          const balanceColor = getBalanceColor(balanceScore);
          const isSelected = date === selectedDate;
          const isToday = date === new Date().toISOString().split('T')[0];
          const dayNum = new Date(date).getDate();

          return (
            <div
              key={date}
              onClick={() => handleDayClick(date)}
              className={`
                calendar-day relative aspect-square p-2 flex flex-col items-center justify-center
                cursor-pointer border-r border-b border-orange-50
                ${!isCurrentMonth ? 'bg-cream-50/50' : 'bg-white'}
                ${isSelected ? 'ring-2 ring-orange-400 ring-inset' : ''}
                ${isToday ? 'bg-orange-50' : ''}
              `}
            >
              <span
                className={`
                  text-sm font-medium mb-1
                  ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                  ${isToday ? 'text-orange-600 font-bold' : ''}
                `}
              >
                {dayNum}
              </span>
              {balanceScore >= 0 && (
                <div
                  className="balance-dot w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: balanceColor }}
                  title={`均衡度: ${balanceScore}分`}
                />
              )}
            </div>
          );
        })}
      </div>

      {popupDate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="record-card bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-cream-50">
              <div>
                <h3 className="text-lg font-serif font-bold text-gray-800">
                  {formatDate(popupDate)}
                </h3>
                {dayScore >= 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getBalanceColor(dayScore) }}
                    />
                    <span className="text-sm text-gray-600">
                      均衡度: <span className="font-medium">{dayScore}分</span>
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={closePopup}
                className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar max-h-[60vh]">
              {localPhotos.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">食物照片</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {localPhotos.map(photo => (
                      <div
                        key={photo.id}
                        draggable
                        onDragStart={() => handleDragStart(photo)}
                        onDragOver={(e) => handleDragOver(e, photo)}
                        onDragLeave={handleDragLeave}
                        onDrop={() => handleDrop(photo)}
                        onDragEnd={handleDragEnd}
                        className={`
                          photo-item relative aspect-square rounded-lg overflow-hidden
                          ${draggedPhoto?.id === photo.id ? 'dragging opacity-50' : ''}
                          ${dragOverPhoto?.id === photo.id ? 'ring-2 ring-orange-400 scale-105' : ''}
                        `}
                      >
                        <img
                          src={photo.url}
                          alt="食物照片"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                          <GripVertical className="w-3 h-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">拖动照片可调整顺序</p>
                </div>
              )}

              <div className="space-y-4">
                {popupRecords.map(record => (
                  <div
                    key={record.id}
                    className="p-4 bg-cream-50 rounded-xl border border-orange-100"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${MEAL_TYPE_COLORS[record.mealType]}`}>
                        {MEAL_TYPE_LABELS[record.mealType]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(record.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                      {record.comment}
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-green-100">
                      <p className="text-xs font-medium text-green-700 mb-2">营养分析摘要</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">热量</span>
                          <span className="font-medium text-gray-700">{record.nutrition.calories} kcal</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">蛋白质</span>
                          <span className="font-medium text-gray-700">{record.nutrition.protein}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">碳水</span>
                          <span className="font-medium text-gray-700">{record.nutrition.carbs}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">脂肪</span>
                          <span className="font-medium text-gray-700">{record.nutrition.fat}g</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarView;
