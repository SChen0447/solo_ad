import React, { useReducer, useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Clock, Users, FileText, Plus, X, Edit3, Upload } from 'lucide-react';
import { useAppStore, RehearsalEvent, Member } from '../store/appStore';
import PDFViewer from './PDFViewer';

interface CalendarState {
  currentDate: Date;
  selectedEvent: RehearsalEvent | null;
  showPDFViewer: boolean;
  selectedSheetId: string | null;
  editingLocation: string | null;
  showUploadModal: boolean;
  uploadEventId: string | null;
}

type CalendarAction =
  | { type: 'PREV_MONTH' }
  | { type: 'NEXT_MONTH' }
  | { type: 'SELECT_EVENT'; payload: RehearsalEvent | null }
  | { type: 'SHOW_PDF'; payload: { event: RehearsalEvent; sheetId: string } }
  | { type: 'CLOSE_PDF' }
  | { type: 'START_EDIT_LOCATION'; payload: string }
  | { type: 'CANCEL_EDIT_LOCATION' }
  | { type: 'SHOW_UPLOAD'; payload: string }
  | { type: 'CLOSE_UPLOAD' };

const calendarReducer = (state: CalendarState, action: CalendarAction): CalendarState => {
  switch (action.type) {
    case 'PREV_MONTH':
      return {
        ...state,
        currentDate: new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() - 1, 1),
      };
    case 'NEXT_MONTH':
      return {
        ...state,
        currentDate: new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + 1, 1),
      };
    case 'SELECT_EVENT':
      return { ...state, selectedEvent: action.payload };
    case 'SHOW_PDF':
      return {
        ...state,
        showPDFViewer: true,
        selectedEvent: action.payload.event,
        selectedSheetId: action.payload.sheetId,
      };
    case 'CLOSE_PDF':
      return { ...state, showPDFViewer: false, selectedSheetId: null };
    case 'START_EDIT_LOCATION':
      return { ...state, editingLocation: action.payload };
    case 'CANCEL_EDIT_LOCATION':
      return { ...state, editingLocation: null };
    case 'SHOW_UPLOAD':
      return { ...state, showUploadModal: true, uploadEventId: action.payload };
    case 'CLOSE_UPLOAD':
      return { ...state, showUploadModal: false, uploadEventId: null };
    default:
      return state;
  }
};

const CalendarView: React.FC = () => {
  const [state, dispatch] = useReducer(calendarReducer, {
    currentDate: new Date(),
    selectedEvent: null,
    showPDFViewer: false,
    selectedSheetId: null,
    editingLocation: null,
    showUploadModal: false,
    uploadEventId: null,
  });

  const [locationInput, setLocationInput] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAnnotation, setUploadAnnotation] = useState('');

  const {
    currentBandId,
    currentUser,
    events,
    fetchEvents,
    confirmAttendance,
    updateEventLocation,
    uploadSheet,
    bands,
  } = useAppStore();

  const currentBand = bands.find(b => b.id === currentBandId);

  const getMonthString = useCallback((date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (currentBandId) {
      fetchEvents(currentBandId, getMonthString(state.currentDate));
    }
  }, [currentBandId, state.currentDate, fetchEvents, getMonthString]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventForDate = (date: Date | null) => {
    if (!date) return null;
    const dateStr = date.toISOString().split('T')[0];
    return events.find(e => e.date === dateStr);
  };

  const handleConfirm = (event: RehearsalEvent, confirmed: boolean) => {
    if (!currentUser) return;
    confirmAttendance(event.id, currentUser.id, confirmed);
  };

  const handleSaveLocation = (eventId: string) => {
    updateEventLocation(eventId, locationInput);
    dispatch({ type: 'CANCEL_EDIT_LOCATION' });
  };

  const handleUpload = async () => {
    if (!state.uploadEventId || !uploadFile) return;
    await uploadSheet(state.uploadEventId, uploadFile, uploadAnnotation);
    setUploadFile(null);
    setUploadAnnotation('');
    dispatch({ type: 'CLOSE_UPLOAD' });
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const days = getDaysInMonth(state.currentDate);
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  const isConfirmed = (event: RehearsalEvent) => {
    return currentUser && event.confirmedMembers.includes(currentUser.id);
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button className="nav-btn" onClick={() => dispatch({ type: 'PREV_MONTH' })}>
          <ChevronLeft size={20} />
        </button>
        <h2 className="month-title">
          {state.currentDate.getFullYear()}年 {monthNames[state.currentDate.getMonth()]}
        </h2>
        <button className="nav-btn" onClick={() => dispatch({ type: 'NEXT_MONTH' })}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="weekday-row">
        {weekDays.map(day => (
          <div key={day} className="weekday-header">{day}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {days.map((date, index) => {
          const event = getEventForDate(date);
          const isToday = date && date.toDateString() === new Date().toDateString();

          return (
            <div
              key={index}
              className={`day-cell ${!date ? 'empty' : ''} ${isToday ? 'today' : ''}`}
            >
              {date && (
                <>
                  <span className="day-number">{date.getDate()}</span>
                  {event && (
                    <div
                      className="event-card"
                      onClick={() => dispatch({ type: 'SELECT_EVENT', payload: event })}
                    >
                      <div className="event-time">
                        <Clock size={12} />
                        <span>{event.startTime} - {event.endTime}</span>
                      </div>
                      <div className="event-location">
                        <MapPin size={12} />
                        <span>{event.location}</span>
                      </div>
                      <div className="event-members">
                        <Users size={12} />
                        <span>{event.confirmedMembers.length}人确认</span>
                      </div>
                      <div className="member-avatars">
                        {event.confirmedMemberDetails.slice(0, 3).map(member => (
                          <img
                            key={member.id}
                            src={member.avatar}
                            alt={member.name}
                            className="mini-avatar"
                            title={member.name}
                          />
                        ))}
                        {event.confirmedMemberDetails.length > 3 && (
                          <span className="more-members">+{event.confirmedMemberDetails.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {state.selectedEvent && (
        <div className="event-modal-overlay" onClick={() => dispatch({ type: 'SELECT_EVENT', payload: null })}>
          <div className="event-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => dispatch({ type: 'SELECT_EVENT', payload: null })}>
              <X size={20} />
            </button>

            <h3 className="event-modal-title">
              {state.selectedEvent.date} 排练详情
            </h3>

            <div className="event-detail-row">
              <Clock size={16} />
              <span>{state.selectedEvent.startTime} - {state.selectedEvent.endTime}</span>
            </div>

            <div className="event-detail-row">
              <MapPin size={16} />
              {state.editingLocation === state.selectedEvent.id ? (
                <div className="location-edit">
                  <input
                    type="text"
                    value={locationInput}
                    onChange={e => setLocationInput(e.target.value)}
                    placeholder="输入地点"
                    className="location-input"
                  />
                  <button
                    className="save-btn"
                    onClick={() => handleSaveLocation(state.selectedEvent!.id)}
                  >
                    保存
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => dispatch({ type: 'CANCEL_EDIT_LOCATION' })}
                  >
                    取消
                  </button>
                </div>
              ) : (
                <>
                  <span>{state.selectedEvent.location}</span>
                  {isAdmin && (
                    <button
                      className="edit-btn"
                      onClick={() => {
                        setLocationInput(state.selectedEvent!.location);
                        dispatch({ type: 'START_EDIT_LOCATION', payload: state.selectedEvent!.id });
                      }}
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="event-detail-section">
              <h4><Users size={16} /> 已确认成员</h4>
              <div className="members-list">
                {state.selectedEvent.confirmedMemberDetails.map(member => (
                  <div key={member.id} className="member-item">
                    <img src={member.avatar} alt={member.name} className="member-avatar" />
                    <span>{member.name}</span>
                  </div>
                ))}
                {state.selectedEvent.confirmedMemberDetails.length === 0 && (
                  <span className="empty-text">暂无成员确认</span>
                )}
              </div>
            </div>

            <div className="event-detail-section">
              <h4><FileText size={16} /> 乐谱文件</h4>
              <div className="sheets-list">
                {state.selectedEvent.sheets.map(sheet => (
                  <div key={sheet.id} className="sheet-item">
                    <span className="sheet-name">{sheet.fileName}</span>
                    <span className="sheet-version">v{sheet.version}</span>
                    <button
                      className="view-sheet-btn"
                      onClick={() => dispatch({
                        type: 'SHOW_PDF',
                        payload: { event: state.selectedEvent!, sheetId: sheet.id }
                      })}
                    >
                      查看
                    </button>
                  </div>
                ))}
                {state.selectedEvent.sheets.length === 0 && (
                  <span className="empty-text">暂无乐谱</span>
                )}
                {isAdmin && (
                  <button
                    className="upload-btn"
                    onClick={() => dispatch({ type: 'SHOW_UPLOAD', payload: state.selectedEvent!.id })}
                  >
                    <Upload size={16} /> 上传乐谱
                  </button>
                )}
                {state.selectedEvent.sheets.length > 0 && state.selectedEvent.sheets[0].annotation && (
                  <div className="annotation">
                    <strong>标注：</strong>{state.selectedEvent.sheets[0].annotation}
                  </div>
                )}
              </div>
            </div>

            <div className="event-actions">
              {isConfirmed(state.selectedEvent) ? (
                <button
                  className="cancel-attendance-btn"
                  onClick={() => handleConfirm(state.selectedEvent!, false)}
                >
                  取消参与
                </button>
              ) : (
                <button
                  className="confirm-btn"
                  onClick={() => handleConfirm(state.selectedEvent!, true)}
                >
                  确认参与
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {state.showPDFViewer && state.selectedEvent && state.selectedSheetId && (
        <PDFViewer
          event={state.selectedEvent}
          sheetId={state.selectedSheetId}
          onClose={() => dispatch({ type: 'CLOSE_PDF' })}
        />
      )}

      {state.showUploadModal && (
        <div className="event-modal-overlay" onClick={() => dispatch({ type: 'CLOSE_UPLOAD' })}>
          <div className="upload-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => dispatch({ type: 'CLOSE_UPLOAD' })}>
              <X size={20} />
            </button>
            <h3 className="event-modal-title">上传乐谱</h3>
            <div className="upload-form">
              <div className="form-group">
                <label>选择PDF文件（最大10MB）</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="form-group">
                <label>标注说明</label>
                <textarea
                  value={uploadAnnotation}
                  onChange={e => setUploadAnnotation(e.target.value)}
                  placeholder="如：第3页第12小节需重点练习"
                  rows={3}
                />
              </div>
              <button
                className="confirm-btn"
                onClick={handleUpload}
                disabled={!uploadFile}
              >
                <Plus size={16} /> 上传
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
