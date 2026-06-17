import React, { useEffect, useState } from 'react';

interface CoffeeCupProps {
  cupColor: string;
  cupColorDark?: string;
}

const CoffeeCup: React.FC<CoffeeCupProps> = ({ cupColor, cupColorDark }) => {
  const [isFading, setIsFading] = useState(false);
  const [displayColor, setDisplayColor] = useState(cupColor);
  const [displayDark, setDisplayDark] = useState(cupColorDark || cupColor);

  useEffect(() => {
    if (cupColor !== displayColor) {
      setIsFading(true);
      const timer = setTimeout(() => {
        setDisplayColor(cupColor);
        setDisplayDark(cupColorDark || cupColor);
        setIsFading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [cupColor, cupColorDark, displayColor]);

  return (
    <div className="coffee-cup-container">
      <div className={`coffee-cup-scene ${isFading ? 'fading' : ''}`}>
        <div className="cup-face cup-face-front">
          <div className="cup-upper" style={{ backgroundColor: displayColor }} />
          <div className="cup-lower" />
        </div>
        <div className="cup-face cup-face-back">
          <div className="cup-upper" style={{ backgroundColor: displayDark }} />
          <div className="cup-lower" />
        </div>
        <div className="cup-face cup-face-left" />
        <div className="cup-face cup-face-right" />
        <div
          className="cup-rim"
          style={{
            background: `linear-gradient(to bottom, ${displayColor} 0%, ${displayDark} 100%)`,
          }}
        />
        <div className="cup-handle" />
        <div className="cup-handle-back" />
      </div>
    </div>
  );
};

export default CoffeeCup;
