import { Clock, Users } from 'lucide-react';
import { getTimeSlotLabel } from '@/utils/dateUtils';
import type { TimeSlot, TimeSlotAvailability } from '@/types';

interface TimeSlotPickerProps {
  selectedSlot: TimeSlot | null;
  onSlotSelect: (slot: TimeSlot) => void;
  availability: {
    morning: TimeSlotAvailability;
    afternoon: TimeSlotAvailability;
  };
}

export default function TimeSlotPicker({
  selectedSlot,
  onSlotSelect,
  availability,
}: TimeSlotPickerProps) {
  const slots: Array<{
    key: TimeSlot;
    label: string;
    data: TimeSlotAvailability;
  }> = [
    { key: 'morning', label: getTimeSlotLabel('morning'), data: availability.morning },
    { key: 'afternoon', label: getTimeSlotLabel('afternoon'), data: availability.afternoon },
  ];

  return (
    <div>
      <label className="block text-gray-700 font-medium mb-3">选择取书时段</label>
      
      <div className="md:hidden">
        <select
          value={selectedSlot || ''}
          onChange={(e) => onSlotSelect(e.target.value as TimeSlot)}
          className="input-field"
        >
          <option value="" disabled>请选择时段</option>
          {slots.map((slot) => (
            <option
              key={slot.key}
              value={slot.key}
              disabled={slot.data.remaining <= 0}
            >
              {slot.label} (剩余{slot.data.remaining}个名额)
            </option>
          ))}
        </select>
      </div>

      <div className="hidden md:grid grid-cols-2 gap-4">
        {slots.map((slot) => {
          const isDisabled = slot.data.remaining <= 0;
          const isSelected = selectedSlot === slot.key;
          return (
            <button
              key={slot.key}
              type="button"
              onClick={() => !isDisabled && onSlotSelect(slot.key)}
              disabled={isDisabled}
              className={`timeslot-option text-left
                ${isSelected ? 'selected' : ''}
                ${isDisabled ? 'disabled' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="font-medium text-gray-800">{slot.label}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-gray-500" />
                <span className={isDisabled ? 'text-red-500' : 'text-gray-600'}>
                  {isDisabled
                    ? '名额已满'
                    : `剩余 ${slot.data.remaining} / ${slot.data.total} 个名额`}
                </span>
              </div>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ease ${
                    isDisabled ? 'bg-red-400' : 'bg-secondary'
                  }`}
                  style={{
                    width: `${((slot.data.total - slot.data.remaining) / slot.data.total) * 100}%`,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
