import React from 'react'
import { useProcessingStore } from '../store/processingStore'

interface ProgressModalProps {
  visible: boolean
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  animation: 'fadeIn 0.3s ease',
}

const containerStyle: React.CSSProperties = {
  width: '80%',
  maxWidth: '800px',
  padding: '40px',
}

const progressTextStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '16px',
  textAlign: 'center',
  marginBottom: '24px',
  fontWeight: 500,
  fontFamily: 'Inter, sans-serif',
}

const progressBarContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
  width: '100%',
  height: '48px',
}

const segmentStyle = (
  isComplete: boolean,
  isCurrent: boolean,
  total: number,
  _index: number
): React.CSSProperties => {
  const baseWidth = `calc(${100 / total}% - 4px)`
  return {
    flex: `0 0 ${baseWidth}`,
    minWidth: baseWidth,
    height: '100%',
    backgroundColor: isComplete ? '#34a853' : 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '2px',
    transition: 'background-color 0.5s ease-out',
    transform: isComplete ? 'scaleY(1)' : 'scaleY(0.8)',
    transformOrigin: 'bottom',
    opacity: isComplete ? 1 : (isCurrent ? 0.8 : 0.5),
  }
}

export const ProgressModal: React.FC<ProgressModalProps> = ({ visible }) => {
  const { processingProgress, processingTotal } = useProcessingStore()

  if (!visible || processingTotal === 0) return null

  const segments = Array.from({ length: processingTotal }, (_, i) => i)

  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>
        <div style={progressTextStyle}>
          已处理 {processingProgress}/{processingTotal}
        </div>
        <div style={progressBarContainerStyle}>
          {segments.map((index) => (
            <div
              key={index}
              style={segmentStyle(
                index < processingProgress,
                index === processingProgress,
                processingTotal,
                index
              )}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
