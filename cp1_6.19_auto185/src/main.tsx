import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { CanvasBoard } from './CanvasBoard';
import { Toolbar } from './Toolbar';
import { CardManager } from './CardManager';
import { ConnectionManager } from './ConnectionManager';
import './styles.css';

const App: React.FC = () => {
  const cardManagerRef = useRef(new CardManager());
  const connectionManagerRef = useRef(new ConnectionManager());
  const [addTrigger, setAddTrigger] = useState(0);

  const handleAddCard = () => {
    setAddTrigger(t => t + 1);
  };

  return (
    <>
      <Toolbar
        cardManager={cardManagerRef.current}
        connectionManager={connectionManagerRef.current}
        onAddCard={handleAddCard}
      />
      <CanvasBoard
        cardManager={cardManagerRef.current}
        connectionManager={connectionManagerRef.current}
        onRequestAdd={handleAddCard}
        addTrigger={addTrigger}
      />
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
