import React, { useMemo } from 'react';

const Particles: React.FC = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${6 + Math.random() * 4}s`,
      rotateDuration: `${15 + Math.random() * 10}s`,
      size: `${18 + Math.random() * 16}px`,
      emoji: ['📖', '📚', '📕', '📗', '📘', '📙'][Math.floor(Math.random() * 6)]
    }));
  }, []);

  return (
    <div className="particles-container">
      {particles.map(p => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            bottom: `${Math.random() * 80}px`,
            animationDelay: p.delay,
            animationDuration: p.duration + ', ' + p.rotateDuration,
            fontSize: p.size
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
};

export default Particles;
