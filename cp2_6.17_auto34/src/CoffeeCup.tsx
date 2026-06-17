import React, { useEffect, useState } from 'react';

interface CoffeeCupProps {
  cupColor: string;
  cupColorDark?: string;
}

const CoffeeCup: React.FC<CoffeeCupProps> = ({ cupColor, cupColorDark }) => {
  const [isFading, setIsFading] = useState(false);
  const [displayColor, setDisplayColor] = useState(cupColor);
  const [displayDarkColor, setDisplayDarkColor] = useState(cupColorDark || cupColor);

  useEffect(() => {
    if (cupColor !== displayColor) {
      setIsFading(true);
      const timer = setTimeout(() => {
        setDisplayColor(cupColor);
        setDisplayDarkColor(cupColorDark || cupColor);
        setIsFading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [cupColor, cupColorDark, displayColor]);

  return (
    <div className="coffee-cup-container">
      <div
        className={`coffee-cup ${isFading ? 'fading' : ''}`}
        style={{
          ['--cup-color' as string]: displayColor,
          ['--cup-color-dark' as string]: displayDarkColor,
        } as React.CSSProperties}
      >
        <div className="cup-body">
          <div className="cup-rim" />
          <div className="cup-upper" />
          <div className="cup-lower" />
          <div className="cup-handle" />
        </div>
      </div>
    </div>
  );
};

export default CoffeeCup;
