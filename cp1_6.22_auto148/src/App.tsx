import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import InspirationBoard from './pages/InspirationBoard';
import RelationGraph from './pages/RelationGraph';

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [displayed, setDisplayed] = useState(children);
  const [animState, setAnimState] = useState<'enter' | 'exit' | 'idle'>('idle');
  const prevKey = useLocation().pathname;
  const [key, setKey] = useState(prevKey);

  useEffect(() => {
    if (location.pathname !== key) {
      setAnimState('exit');
      const timer = setTimeout(() => {
        setDisplayed(children);
        setKey(location.pathname);
        setAnimState('enter');
        setTimeout(() => setAnimState('idle'), 300);
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  useEffect(() => {
    setDisplayed(children);
  }, [children]);

  const style: React.CSSProperties = {
    width: '100%',
    minHeight: '100vh',
    opacity: animState === 'exit' ? 0 : 1,
    transform: animState === 'exit'
      ? 'translateX(-20px)'
      : animState === 'enter'
        ? 'translateX(0)'
        : 'translateX(0)',
    transition: 'opacity 280ms cubic-bezier(0.4, 0, 0.2, 1), transform 280ms cubic-bezier(0.4, 0, 0.2, 1)'
  };

  return <div style={style}>{displayed}</div>;
};

const App: React.FC = () => {
  return (
    <PageTransition>
      <Routes>
        <Route path="/" element={<Navigate to="/board" replace />} />
        <Route path="/board" element={<InspirationBoard />} />
        <Route path="/graph" element={<RelationGraph />} />
        <Route path="*" element={<Navigate to="/board" replace />} />
      </Routes>
    </PageTransition>
  );
};

export default App;
