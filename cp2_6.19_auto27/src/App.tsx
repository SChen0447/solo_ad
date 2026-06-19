import { useReducer, useEffect, useState, useCallback, useRef } from 'react';
import MoodRecorder from './MoodRecorder';
import WeeklyTrend from './WeeklyTrend';
import MonthlyStats from './MonthlyStats';
import type { MoodRecord, ViewMode, AppState, Action } from './types';
import { loadRecords, saveRecords } from './utils/storage';
import { exportToJSON } from './utils/export';

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_RECORD': {
      const newRecords = [...state.records, action.payload];
      return { ...state, records: newRecords };
    }
    case 'SET_RECORDS':
      return { ...state, records: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    default:
      return state;
  }
}

function initState(): AppState {
  const records = loadRecords();
  return {
    records,
    viewMode: 'week'
  };
}

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initState);
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    saveRecords(state.records);
  }, [state.records]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleAddRecord = useCallback((record: MoodRecord) => {
    dispatch({ type: 'ADD_RECORD', payload: record });
  }, []);

  const handleShowToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setShowToast(true);
    toastTimerRef.current = window.setTimeout(() => {
      setShowToast(false);
      toastTimerRef.current = null;
    }, 2000);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);

  const handleExport = useCallback(() => {
    exportToJSON(state.records);
  }, [state.records]);

  return (
    <div className="app">
      {showToast && <div className="toast">记录成功</div>}

      <header className="app-header">
        <h1 className="app-title">情绪日记</h1>
        <p className="app-subtitle">记录每一天的心情，了解真实的自己</p>
      </header>

      <div className="view-toggle">
        <button
          className={`btn ${state.viewMode === 'week' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleViewModeChange('week')}
        >
          周视图
        </button>
        <button
          className={`btn ${state.viewMode === 'month' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleViewModeChange('month')}
        >
          月视图
        </button>
        <button className="btn btn-secondary" onClick={handleExport}>
          导出JSON
        </button>
      </div>

      <div className="main-content">
        <MoodRecorder onAddRecord={handleAddRecord} onShowToast={handleShowToast} />
        
        {state.viewMode === 'week' ? (
          <WeeklyTrend records={state.records} />
        ) : (
          <MonthlyStats records={state.records} />
        )}
      </div>
    </div>
  );
}

export default App;
