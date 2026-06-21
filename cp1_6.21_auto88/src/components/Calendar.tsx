import React, { useState, useMemo } from 'react';
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Appointment, Service, Customer } from '../types';
import { getServiceColor, getServiceBgColor, getTimeSlots, addMinutes } from '../utils/storage';
import '../styles/Calendar.css';

interface CalendarProps {
  appointments: Appointment[];
  services: Service[];
  customers: Customer[];
  onAddAppointment: () => void;
  onAppointmentClick?: (appointment: Appointment) => void;
}

type ViewMode = 'week' | 'month';

const Calendar: React.FC<CalendarProps> = ({
  appointments,
  services,
  customers,
  onAddAppointment,
  onAppointmentClick,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );

  const timeSlots = useMemo(() => getTimeSlots(9, 19, 30), []);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = startOfWeek(firstDay, { weekStartsOn: 1 });
    const endDay = endOfWeek(lastDay, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDay, end: endDay });
  }, [currentDate]);

  const getPetName = (petId: string, customerId: string): string => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return '未知';
    const pet = customer.pets.find((p) => p.id === petId);
    return pet?.name || '未知';
  };

  const getService = (serviceId: string): Service | undefined => {
    return services.find((s) => s.id === serviceId);
  };

  const getAppointmentsForDate = (date: Date): Appointment[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter((a) => a.date === dateStr);
  };

  const calculateOccupancyRate = (date: Date): number => {
    const dayApts = getAppointmentsForDate(date);
    const totalSlots = timeSlots.length;
    const occupiedSlots = new Set<string>();

    dayApts.forEach((apt) => {
      const service = getService(apt.serviceId);
      if (!service) return;
      const duration = service.duration;
      let currentTime = apt.startTime;
      const endTime = addMinutes(apt.startTime, duration);
      while (currentTime < endTime) {
        if (timeSlots.includes(currentTime)) {
          occupiedSlots.add(currentTime);
        }
        currentTime = addMinutes(currentTime, 30);
      }
    });

    return occupiedSlots.size / totalSlots;
  };

  const isHighOccupancy = (date: Date): boolean => {
    return calculateOccupancyRate(date) > 0.5;
  };

  const navigatePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      );
    }
  };

  const navigateNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      );
    }
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'));
    if (viewMode === 'month') {
      setCurrentDate(date);
    }
  };

  const renderAppointmentBar = (
    appointment: Appointment
  ) => {
    const service = getService(appointment.serviceId);
    if (!service) return null;

    const [startHour, startMin] = appointment.startTime.split(':').map(Number);
    const startMinutesFrom9 = (startHour - 9) * 60 + startMin;
    const totalDayMinutes = 10 * 60;
    const topPercent = (startMinutesFrom9 / totalDayMinutes) * 100;
    const heightPercent = (service.duration / totalDayMinutes) * 100;

    const petName = getPetName(appointment.petId, appointment.customerId);
    const isCompleted = appointment.status === 'completed';

    return (
      <div
        key={appointment.id}
        className={`appointment-bar ${isCompleted ? 'completed' : ''}`}
        style={{
          top: `${topPercent}%`,
          height: `${heightPercent}%`,
          backgroundColor: getServiceColor(service.category),
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!isCompleted && onAppointmentClick) {
            onAppointmentClick(appointment);
          }
        }}
      >
        <div className="appointment-bar-pet">{petName}</div>
        <div className="appointment-bar-service">{service.name}</div>
        {isCompleted && <div className="appointment-bar-stripe" />}
      </div>
    );
  };

  const renderWeekView = () => {
    return (
      <div className="calendar-week-view">
        <div className="calendar-time-column">
          <div className="calendar-time-header">&nbsp;</div>
          <div className="calendar-time-slots">
            {timeSlots.map((slot) => (
              <div key={slot} className="calendar-time-slot">
                {slot}
              </div>
            ))}
          </div>
        </div>
        <div className="calendar-days-row">
          {weekDays.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const isSelected = dayStr === selectedDate;
            const dayApts = getAppointmentsForDate(day);
            const highOcc = isHighOccupancy(day);

            return (
              <div
                key={dayStr}
                className={`calendar-day-column ${isSelected ? 'selected' : ''} ${isToday(day) ? 'today' : ''}`}
                onClick={() => handleDateClick(day)}
              >
                <div className="calendar-day-header">
                  <div className="calendar-day-name">
                    {format(day, 'EEE', { locale: zhCN })}
                  </div>
                  <div className="calendar-day-date">{format(day, 'd')}</div>
                  {highOcc && (
                    <div className="calendar-occupancy-bar">
                      <div
                        className="calendar-occupancy-fill"
                        style={{ width: `${calculateOccupancyRate(day) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="calendar-day-content">
                  {dayApts.map((apt) => renderAppointmentBar(apt))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const weekDayNames = ['一', '二', '三', '四', '五', '六', '日'];

    return (
      <div className="calendar-month-view">
        <div className="calendar-month-header">
          {weekDayNames.map((name, index) => (
            <div key={index} className="calendar-month-weekday">
              {name}
            </div>
          ))}
        </div>
        <div className="calendar-month-grid">
          {monthDays.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isSelected = dayStr === selectedDate;
            const dayApts = getAppointmentsForDate(day);
            const highOcc = isHighOccupancy(day);

            return (
              <div
                key={dayStr}
                className={`calendar-month-cell ${!isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isToday(day) ? 'today' : ''}`}
                onClick={() => handleDateClick(day)}
              >
                <div className="calendar-month-cell-header">
                  <span className="calendar-month-cell-date">{format(day, 'd')}</span>
                  {highOcc && <span className="calendar-month-cell-dot" />}
                </div>
                <div className="calendar-month-cell-appointments">
                  {dayApts.slice(0, 3).map((apt) => {
                    const service = getService(apt.serviceId);
                    const petName = getPetName(apt.petId, apt.customerId);
                    return (
                      <div
                        key={apt.id}
                        className={`calendar-month-apt ${apt.status === 'completed' ? 'completed' : ''}`}
                        style={{
                          backgroundColor: service ? getServiceBgColor(service.category) : '#eee',
                          borderLeftColor: service ? getServiceColor(service.category) : '#ccc',
                        }}
                      >
                        <span className="calendar-month-apt-time">{apt.startTime}</span>
                        <span className="calendar-month-apt-pet">{petName}</span>
                      </div>
                    );
                  })}
                  {dayApts.length > 3 && (
                    <div className="calendar-month-more">+{dayApts.length - 3} 更多</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-container card">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="calendar-nav-btn" onClick={navigatePrev}>
            ‹
          </button>
          <button className="calendar-nav-btn today" onClick={navigateToday}>
            今天
          </button>
          <button className="calendar-nav-btn" onClick={navigateNext}>
            ›
          </button>
          <h2 className="calendar-title">
            {viewMode === 'week'
              ? `${format(weekDays[0], 'M月d日')} - ${format(weekDays[6], 'M月d日')}`
              : format(currentDate, 'yyyy年M月', { locale: zhCN })}
          </h2>
        </div>
        <div className="calendar-actions">
          <div className="calendar-view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              周视图
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              月视图
            </button>
          </div>
          <button className="btn-secondary" onClick={onAddAppointment}>
            + 新增预约
          </button>
        </div>
      </div>
      <div className="calendar-body">
        {viewMode === 'week' ? renderWeekView() : renderMonthView()}
      </div>
    </div>
  );
};

export default Calendar;
