import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from './AppContext';
import App from './App';
import ReviewPage from './ReviewPage';
import { useApp } from './AppContext';
import './styles.css';

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  const { state, dispatch } = useApp();

  const handleSeek = (time: number) => {
    dispatch({ type: 'SET_CURRENT_TIME', payload: time });
  };

  const handleSelectTrack = (trackId: string | null) => {
    dispatch({ type: 'SET_CURRENT_TRACK', payload: trackId });
  };

  const handleTogglePlay = (playing?: boolean) => {
    dispatch({ type: 'TOGGLE_PLAY', payload: playing });
  };

  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<App />} />
      <Route
        path="/review/:id"
        element={
          <ReviewPage
            reviews={state.reviews}
            notes={state.notes}
            tracks={state.tracks}
            theme={state.theme}
            onSeek={handleSeek}
            onSelectTrack={handleSelectTrack}
            onTogglePlay={handleTogglePlay}
            currentTrackId={state.currentTrackId}
          />
        }
      />
    </Routes>
  );
};

const Root: React.FC = () => {
  return (
    <Router>
      <AppProvider>
        <AnimatedRoutes />
      </AppProvider>
    </Router>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
