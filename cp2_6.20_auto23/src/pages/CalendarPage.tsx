import React from 'react';
import CalendarView from '../components/CalendarView';

const CalendarPage: React.FC = () => {
  return (
    <>
      <div className="page-header">
        <h1>演出日历</h1>
      </div>
      <CalendarView />
    </>
  );
};

export default CalendarPage;
