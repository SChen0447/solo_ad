import React from 'react';
import { calculateReadingProgress } from '@/utils/statsCalculator';
import type { Book } from '@/types';

interface ProgressBarProps {
  book: Book;
  showLabel?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ book, showLabel = true }) => {
  const progress = calculateReadingProgress(book);

  return (
    <div className="progress-wrapper">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      {showLabel && (
        <span className="progress-label">{progress}%</span>
      )}
    </div>
  );
};

export default ProgressBar;
