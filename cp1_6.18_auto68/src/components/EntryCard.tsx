import React, { useEffect, useRef } from "react";
import {
  JournalEntry,
  gradientToCss,
  getBrightColor,
} from "../context/JournalContext";

interface EntryCardProps {
  entry: JournalEntry;
  onAnimationEnd?: (id: string) => void;
}

export const EntryCard: React.FC<EntryCardProps> = ({ entry, onAnimationEnd }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (entry.isNew && onAnimationEnd && cardRef.current) {
      const handler = () => {
        onAnimationEnd(entry.id);
      };
      cardRef.current.addEventListener("animationend", handler, { once: true });
      return () => {
        if (cardRef.current) {
          cardRef.current.removeEventListener("animationend", handler);
        }
      };
    }
  }, [entry.id, entry.isNew, onAnimationEnd]);

  return (
    <div
      ref={cardRef}
      className={`entry-card${entry.isNew ? " flying" : ""}`}
      style={{ background: gradientToCss(entry.gradient) }}
    >
      <div className="card-date">{entry.date}</div>
      <div className="card-mood">{entry.mood}</div>
      <div className="card-content">{entry.content}</div>
      <div
        className="card-decoration"
        style={{ background: getBrightColor(entry.gradient) }}
      />
    </div>
  );
};
