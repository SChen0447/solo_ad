import { useState, useEffect } from 'react';
import StormBoard from './StormBoard';
import MeetingRoom from './MeetingRoom';
import type { Meeting } from './types';

function generateUserId(): string {
  let userId = localStorage.getItem('brainstorm_user_id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('brainstorm_user_id', userId);
  }
  return userId;
}

const appStyles: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#111827',
  color: '#f9fafb',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const headerStyles: React.CSSProperties = {
  padding: '24px 32px',
  borderBottom: '1px solid #374151',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const titleStyles: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#f9fafb',
  margin: 0,
};

const backButtonStyles: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: 'transparent',
  color: '#9ca3af',
  border: '1px solid #374151',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  minWidth: '44px',
  minHeight: '44px',
  transition: 'all 0.2s',
};

export default function App() {
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [userId] = useState<string>(generateUserId());
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);

  const handleEnterMeeting = (meetingId: string) => {
    setCurrentMeetingId(meetingId);
  };

  const handleBackToBoard = () => {
    setCurrentMeetingId(null);
    setCurrentMeeting(null);
  };

  return (
    <div style={appStyles}>
      <header style={headerStyles}>
        <h1 style={titleStyles}>
          {currentMeetingId ? '会议房间' : '头脑风暴看板'}
        </h1>
        {currentMeetingId && (
          <button style={backButtonStyles} onClick={handleBackToBoard}>
            ← 返回看板
          </button>
        )}
      </header>
      <main style={{ padding: '24px 32px' }}>
        {currentMeetingId ? (
          <MeetingRoom
            meetingId={currentMeetingId}
            userId={userId}
            onMeetingLoad={setCurrentMeeting}
          />
        ) : (
          <StormBoard onEnterMeeting={handleEnterMeeting} />
        )}
      </main>
    </div>
  );
}
