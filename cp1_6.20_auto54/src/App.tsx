import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Assignment, PageType } from './types';
import { getToken, removeToken, initSocket, closeSocket } from './services/api';

const LoginPage = lazy(() => import('./components/LoginPage'));
const RegisterPage = lazy(() => import('./components/RegisterPage'));
const AssignmentList = lazy(() => import('./components/AssignmentList'));
const SubmissionPanel = lazy(() => import('./components/SubmissionPanel'));
const HistoryPage = lazy(() => import('./components/HistoryPage'));

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('login');
  const [userEmail, setUserEmail] = useState<string>('');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const decodedToken = JSON.parse(atob(parts[1]));
          setUserEmail(decodedToken.email || '');
        }
      } catch (e) {
        console.error('Failed to parse token:', e);
      }
      setCurrentPage('assignments');
      initSocket();
    }
  }, []);

  const handleLogin = (email: string) => {
    setUserEmail(email);
    setCurrentPage('assignments');
  };

  const handleRegister = (email: string) => {
    setUserEmail(email);
    setCurrentPage('assignments');
  };

  const handleLogout = () => {
    removeToken();
    closeSocket();
    setUserEmail('');
    setCurrentPage('login');
    setSelectedAssignment(null);
  };

  const handleSelectAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setCurrentPage('submission');
  };

  const handleBack = () => {
    if (currentPage === 'submission') {
      setSelectedAssignment(null);
      setCurrentPage('assignments');
    } else if (currentPage === 'history') {
      setCurrentPage('assignments');
    }
  };

  const handleViewHistory = () => {
    setCurrentPage('history');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return (
          <LoginPage
            onLogin={handleLogin}
            onSwitchToRegister={() => setCurrentPage('register')}
          />
        );
      case 'register':
        return (
          <RegisterPage
            onRegister={handleRegister}
            onSwitchToLogin={() => setCurrentPage('login')}
          />
        );
      case 'assignments':
        return (
          <AssignmentList
            onSelectAssignment={handleSelectAssignment}
            onViewHistory={handleViewHistory}
            onLogout={handleLogout}
            userEmail={userEmail}
          />
        );
      case 'submission':
        return selectedAssignment ? (
          <SubmissionPanel
            assignment={selectedAssignment}
            onBack={handleBack}
            userEmail={userEmail}
            onLogout={handleLogout}
            onViewHistory={handleViewHistory}
          />
        ) : null;
      case 'history':
        return (
          <HistoryPage
            onBack={handleBack}
            onLogout={handleLogout}
            userEmail={userEmail}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Suspense
      fallback={
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      }
    >
      {renderPage()}
    </Suspense>
  );
};

export default App;
