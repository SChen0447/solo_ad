import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import ItemDetail from './pages/ItemDetail';
import QnA from './pages/QnA';
import AskQuestion from './pages/AskQuestion';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';

const pageStyles: Record<string, React.CSSProperties> = {
  entering: { transform: 'translateX(100%)', opacity: 0 },
  entered: { transform: 'translateX(0)', opacity: 1 },
  exiting: { transform: 'translateX(-100%)', opacity: 0 },
};

function AnimatedRoutes() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<'entering' | 'entered' | 'exiting'>('entered');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('exiting');
    }
  }, [location, displayLocation]);

  const handleAnimationEnd = () => {
    if (transitionStage === 'exiting') {
      setDisplayLocation(location);
      setTransitionStage('entering');
    } else if (transitionStage === 'entering') {
      setTransitionStage('entered');
    }
  };

  return (
    <div
      onTransitionEnd={handleAnimationEnd}
      style={{
        ...pageStyles[transitionStage],
        transition: transitionStage === 'entered' ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
        minHeight: '100vh',
      }}
    >
      <Routes location={displayLocation}>
        <Route path="/" element={<Home />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route path="/qna" element={<QnA />} />
        <Route path="/ask" element={<AskQuestion />} />
        <Route path="/profile/:userId" element={<Profile />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
