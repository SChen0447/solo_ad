import React, { useState, useMemo } from 'react';
import { useFeedbackStore } from '../stores/feedbackStore';
import {
  themeColors,
  themeNames,
  emotionEmojis,
  emotionLabels,
  emotionColors,
  type Feedback,
} from '../types';

const glassCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  padding: '24px',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s ease-out',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.9)',
  marginBottom: '16px',
};

const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const FeedbackRow = React.memo(
  ({ feedback, onClick }: { feedback: Feedback; onClick: () => void }) => {
    const summary =
      feedback.description.length > 20
        ? feedback.description.slice(0, 20) + '...'
        : feedback.description;

    return (
      <tr
        onClick={onClick}
        style={{
          cursor: 'pointer',
          transition: 'background 0.2s ease-out',
        }}
        className="feedback-row"
      >
        <td
          style={{
            padding: '14px 16px',
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {summary}
        </td>
        <td
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: `${emotionColors[feedback.emotion]}20`,
              color: emotionColors[feedback.emotion],
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <span style={{ fontSize: '14px' }}>{emotionEmojis[feedback.emotion]}</span>
            {emotionLabels[feedback.emotion]}
          </span>
        </td>
        <td
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: themeColors[feedback.theme],
              }}
            />
            {themeNames[feedback.theme]}
          </span>
        </td>
        <td
          style={{
            padding: '14px 16px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '13px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {formatDate(feedback.timestamp)}
        </td>
      </tr>
    );
  }
);

FeedbackRow.displayName = 'FeedbackRow';

function DetailModal({
  feedback,
  onClose,
}: {
  feedback: Feedback | null;
  onClose: () => void;
}) {
  if (!feedback) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a1b23',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '20px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#fff',
                marginBottom: '8px',
              }}
            >
              {feedback.customerName}
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: `${emotionColors[feedback.emotion]}20`,
                  color: emotionColors[feedback.emotion],
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                <span style={{ fontSize: '14px' }}>{emotionEmojis[feedback.emotion]}</span>
                {emotionLabels[feedback.emotion]}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: `${themeColors[feedback.theme]}20`,
                  color: themeColors[feedback.theme],
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                {themeNames[feedback.theme]}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease-out',
            }}
            className="modal-close-btn"
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '6px',
            }}
          >
            反馈内容
          </div>
          <div
            style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.85)',
              lineHeight: 1.6,
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '16px',
              borderRadius: '8px',
            }}
          >
            {feedback.description}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '4px',
              }}
            >
              来源渠道
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.85)' }}>
              {feedback.channel}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '4px',
              }}
            >
              提交时间
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.85)' }}>
              {formatDate(feedback.timestamp)}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          animation: fadeIn 0.3s ease-out;
        }
        .modal-content {
          animation: scaleIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export const FeedbackTable: React.FC = () => {
  const feedbackList = useFeedbackStore((state) => state.feedbackList);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  const sortedFeedback = useMemo(
    () =>
      [...feedbackList].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [feedbackList]
  );

  return (
    <div style={glassCardStyle}>
      <h3 style={sectionTitleStyle}>反馈列表</h3>
      <div
        style={{
          maxHeight: '400px',
          overflowY: 'auto',
          borderRadius: '8px',
        }}
        className="feedback-table-container"
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              background: '#1a1b23',
              zIndex: 1,
            }}
          >
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  background: '#1a1b23',
                }}
              >
                反馈摘要
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  background: '#1a1b23',
                  width: '100px',
                }}
              >
                情感
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  background: '#1a1b23',
                  width: '100px',
                }}
              >
                主题
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  background: '#1a1b23',
                  width: '120px',
                }}
              >
                日期
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedFeedback.map((feedback) => (
              <FeedbackRow
                key={feedback.id}
                feedback={feedback}
                onClick={() => setSelectedFeedback(feedback)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <DetailModal
        feedback={selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
      />

      <style>{`
        .feedback-table-container::-webkit-scrollbar {
          width: 6px;
        }
        .feedback-table-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .feedback-table-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .feedback-table-container::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .feedback-row:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .feedback-row:nth-child(even) {
          background: rgba(255, 255, 255, 0.02);
        }
        .feedback-row:nth-child(even):hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          color: #fff !important;
        }
      `}</style>
    </div>
  );
};
