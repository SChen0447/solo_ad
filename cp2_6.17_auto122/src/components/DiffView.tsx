import { useCallback, useRef } from 'react';
import type { DiffLine, Review } from '../types';
import ReviewPopup from './ReviewPopup';

interface DiffViewProps {
  diffLines: DiffLine[];
  reviews: Review[];
  onAddReview: (review: Review) => void;
  onDeleteReview: (lineNumber: number) => void;
}

const BG_MAP: Record<string, string> = {
  add: '#d4edda',
  remove: '#f8d7da',
  modify: '#fff3cd',
  context: 'transparent',
};

const TYPE_LABEL: Record<string, string> = {
  add: '+',
  remove: '-',
  modify: '~',
  context: ' ',
};

function DiffView({ diffLines, reviews, onAddReview, onDeleteReview }: DiffViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const getReviewForLine = useCallback(
    (lineNumber: number) => reviews.find(r => r.lineNumber === lineNumber),
    [reviews]
  );

  return (
    <div className="diff-view" ref={containerRef}>
      <table className="diff-table">
        <tbody>
          {diffLines.map(line => {
            const review = getReviewForLine(line.lineNumber);
            const isDiff = line.type !== 'context';
            return (
              <tr key={line.lineNumber}>
                {line.blockStart && line.blockRange && (
                  <td colSpan={4} className="block-range">
                    {line.blockRange}
                  </td>
                )}
                {!line.blockStart && (
                  <>
                    <td className="line-num old-line-num">
                      {line.oldLineNumber ?? ''}
                    </td>
                    <td className="line-num new-line-num">
                      {line.newLineNumber ?? ''}
                    </td>
                    <td className="type-indicator">{TYPE_LABEL[line.type]}</td>
                    <td
                      className={`diff-content ${isDiff ? 'clickable' : ''}`}
                      style={{ backgroundColor: BG_MAP[line.type] }}
                    >
                      <span className="diff-text">{line.content}</span>
                      {isDiff && (
                        <ReviewPopup
                          lineNumber={line.lineNumber}
                          existingReview={review}
                          containerRef={containerRef}
                          onSubmit={onAddReview}
                          onDelete={onDeleteReview}
                        />
                      )}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DiffView;
