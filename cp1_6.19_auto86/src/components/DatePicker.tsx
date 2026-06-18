import { format, getDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getAvailableDates, formatDate } from '@/utils/dateUtils';

interface DatePickerProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

export default function DatePicker({ selectedDate, onDateSelect }: DatePickerProps) {
  const availableDates = getAvailableDates();

  return (
    <div>
      <label className="block text-gray-700 font-medium mb-3">选择取书日期</label>
      <div className="bg-white rounded-xl border-2 border-border-default p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: getDay(availableDates[0]) }).map((_, index) => (
            <div key={`empty-${index}`} className="py-3" />
          ))}
          {availableDates.map((date) => {
            const dateStr = formatDate(date);
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => onDateSelect(dateStr)}
                className={`py-3 rounded-lg text-sm font-medium transition-all duration-200 ease
                  ${isSelected
                    ? 'date-available ring-2 ring-date-highlight'
                    : 'date-available hover:bg-date-highlight/30'
                  }`}
              >
                {format(date, 'd', { locale: zhCN })}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          * 仅支持未来7天内预约，当天不可选
        </p>
      </div>
    </div>
  );
}
