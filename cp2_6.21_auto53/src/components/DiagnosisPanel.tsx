import React, { useState, useRef } from 'react';
import { DiagnosisRecord } from '@/types';
import { formatDate } from '@/utils/dateUtils';

interface DiagnosisPanelProps {
  plantId: string;
  records: DiagnosisRecord[];
  onDiagnosisComplete: (record: DiagnosisRecord) => void;
  plantPhotoUrl: string;
}

export const DiagnosisPanel: React.FC<DiagnosisPanelProps> = ({
  records,
  onDiagnosisComplete,
  plantPhotoUrl,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    marginTop: 24,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    color: '#1F2937',
    margin: 0,
    marginBottom: 16,
  };

  const photoPreviewStyle: React.CSSProperties = {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  };

  const photoImgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.3s ease',
    opacity: showResult || isScanning ? 1 : 0,
    pointerEvents: showResult || isScanning ? 'auto' : 'none',
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 24,
  };

  const cameraButtonStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4ADE80, #22C55E)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    transform: isPressed ? 'scale(0.95)' : 'scale(1)',
  };

  const timelineStyle: React.CSSProperties = {
    position: 'relative',
    paddingLeft: 24,
  };

  const timelineLineStyle: React.CSSProperties = {
    position: 'absolute',
    left: 3,
    top: 4,
    bottom: 4,
    width: 2,
    backgroundColor: '#E5E7EB',
  };

  const timelineItemStyle: React.CSSProperties = {
    position: 'relative',
    paddingBottom: 12,
    cursor: 'pointer',
  };

  const getDotStyle = (isSelected: boolean): React.CSSProperties => ({
    position: 'absolute',
    left: -24,
    top: 4,
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: isSelected ? '#22C55E' : '#9CA3AF',
    transform: isSelected ? 'scale(1.2)' : 'scale(1)',
    transition: 'all 0.2s ease',
    zIndex: 1,
  });

  const recordCardStyle: React.CSSProperties = {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginLeft: 8,
    border: '1px solid #E5E7EB',
  };

  const recordHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  };

  const recordDateStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
  };

  const scanAnimationStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    background: 'linear-gradient(90deg, transparent, #22C55E, transparent)',
    animation: 'scan-line 1.5s ease-in-out infinite',
  };

  const handlePhotoCapture = () => {
    setIsScanning(true);
    setShowResult(false);
    setCurrentScore(0);

    setTimeout(() => {
      const score = Math.floor(Math.random() * 40) + 60;
      setCurrentScore(score);
      setIsScanning(false);
      setShowResult(true);

      const newRecord: DiagnosisRecord = {
        id: Date.now().toString(),
        plantId: '',
        date: new Date().toISOString().split('T')[0],
        healthScore: score,
        photoUrl: plantPhotoUrl,
        notes: score >= 80 ? '状态非常健康' : score >= 60 ? '状态良好，继续保持' : '需要关注，建议检查',
      };
      onDiagnosisComplete(newRecord);
    }, 2000);
  };

  const handleButtonMouseDown = () => {
    setIsPressed(true);
  };

  const handleButtonMouseUp = () => {
    setIsPressed(false);
  };

  const handleRecordClick = (recordId: string) => {
    setSelectedRecordId(selectedRecordId === recordId ? null : recordId);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#22C55E';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const CircularProgress: React.FC<{ score: number; size?: number }> = ({ score, size = 100 }) => {
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    const svgStyle: React.CSSProperties = {
      transform: 'rotate(-90deg)',
    };

    const scoreTextStyle: React.CSSProperties = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: 24,
      fontWeight: 'bold',
      color: 'white',
    };

    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={svgStyle}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getScoreColor(score)}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div style={scoreTextStyle}>{score}</div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>健康诊断</h3>
      
      <div style={photoPreviewStyle}>
        <img src={plantPhotoUrl} alt="植物照片" style={photoImgStyle} />
        <div style={overlayStyle}>
          {isScanning && (
            <>
              <div style={scanAnimationStyle} />
              <p style={{ color: 'white', marginTop: 8, fontSize: 14 }}>正在分析中...</p>
            </>
          )}
          {showResult && <CircularProgress score={currentScore} />}
        </div>
      </div>

      <div style={buttonContainerStyle}>
        <button
          style={cameraButtonStyle}
          onClick={handlePhotoCapture}
          onMouseDown={handleButtonMouseDown}
          onMouseUp={handleButtonMouseUp}
          onMouseLeave={handleButtonMouseUp}
          onTouchStart={handleButtonMouseDown}
          onTouchEnd={handleButtonMouseUp}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
        />
      </div>

      <div>
        <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937', marginBottom: 12 }}>
          养护日志
        </h4>
        <div style={timelineStyle}>
          <div style={timelineLineStyle} />
          {records.map((record) => (
            <div
              key={record.id}
              style={timelineItemStyle}
              onClick={() => handleRecordClick(record.id)}
            >
              <div style={getDotStyle(selectedRecordId === record.id)} />
              <div style={recordCardStyle}>
                <div style={recordHeaderStyle}>
                  <span style={recordDateStyle}>{formatDate(record.date)}</span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: getScoreColor(record.healthScore),
                    }}
                  >
                    {record.healthScore}分
                  </span>
                </div>
                {selectedRecordId === record.id && (
                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                    {record.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
          {records.length === 0 && (
            <p style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', padding: 20 }}>
              暂无诊断记录
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scan-line {
          0% { top: 0; }
          50% { top: calc(100% - 3px); }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
};
