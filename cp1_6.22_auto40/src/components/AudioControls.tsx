import React from 'react';
import { formatTime, AudioInfo } from '../utils/audioProcessor';

interface AudioControlsProps {
  audioInfo: AudioInfo | null;
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  exportProgress: number | null;
  onExport: () => void;
  onUpload: () => void;
  hasAudio: boolean;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  audioInfo,
  currentTime,
  isPlaying,
  onPlayPause,
  onSeek,
  exportProgress,
  onExport,
  onUpload,
  hasAudio
}) => {
  const duration = audioInfo?.duration || 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <input
          type="file"
          id="audio-upload"
          accept="audio/wav,audio/mp3,audio/mpeg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              e.target.files = dataTransfer.files;
              onUpload();
            }
          }}
          style={{ display: 'none' }}
        />
        <label
          htmlFor="audio-upload"
          style={{
            padding: '10px 20px',
            borderRadius: '4px',
            border: '1px solid #3182ce',
            background: 'rgba(49, 130, 206, 0.2)',
            color: '#63b3ed',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'inline-block'
          }}
        >
          上传音频
        </label>

        <button
          onClick={onPlayPause}
          disabled={!hasAudio}
          style={{
            padding: '10px 24px',
            borderRadius: '4px',
            border: isPlaying ? '1px solid #805ad5' : '1px solid #48bb78',
            background: isPlaying ? 'rgba(128, 90, 213, 0.2)' : 'rgba(72, 187, 120, 0.2)',
            color: isPlaying ? '#b794f4' : '#68d391',
            fontSize: '14px',
            cursor: hasAudio ? 'pointer' : 'not-allowed',
            fontWeight: 500,
            opacity: hasAudio ? 1 : 0.5,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: '110px',
            justifyContent: 'center'
          }}
        >
          <span style={{ fontSize: '12px' }}>
            {isPlaying ? '⏸' : '▶'}
          </span>
          {isPlaying ? '暂停' : '播放'}
        </button>

        <button
          onClick={onExport}
          disabled={!hasAudio || exportProgress !== null}
          style={{
            padding: '10px 20px',
            borderRadius: '4px',
            border: '1px solid #ecc94b',
            background: 'rgba(236, 201, 75, 0.2)',
            color: '#ecc94b',
            fontSize: '14px',
            cursor: hasAudio && exportProgress === null ? 'pointer' : 'not-allowed',
            fontWeight: 500,
            opacity: hasAudio && exportProgress === null ? 1 : 0.5,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          导出 WAV
        </button>

        <div style={{ flex: 1 }} />

        {audioInfo && (
          <div
            style={{
              display: 'flex',
              gap: '24px',
              fontSize: '13px',
              color: '#a0aec0',
              fontFamily: 'monospace'
            }}
          >
            <div>
              <span style={{ color: '#718096' }}>时长: </span>
              <span style={{ color: '#e2e8f0' }}>{formatTime(audioInfo.duration)}</span>
            </div>
            <div>
              <span style={{ color: '#718096' }}>采样率: </span>
              <span style={{ color: '#e2e8f0' }}>{audioInfo.sampleRate}Hz</span>
            </div>
            <div>
              <span style={{ color: '#718096' }}>位深: </span>
              <span style={{ color: '#e2e8f0' }}>{audioInfo.bitDepth}bit</span>
            </div>
            <div>
              <span style={{ color: '#718096' }}>声道: </span>
              <span style={{ color: '#e2e8f0' }}>{audioInfo.numberOfChannels}</span>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#63b3ed',
            minWidth: '70px'
          }}
        >
          {formatTime(currentTime)}
        </span>

        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.001}
          value={Math.min(currentTime, duration)}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          disabled={!hasAudio}
          style={{
            flex: 1,
            height: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            appearance: 'none',
            cursor: hasAudio ? 'pointer' : 'default'
          }}
        />

        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#a0aec0',
            minWidth: '70px',
            textAlign: 'right'
          }}
        >
          {formatTime(duration)}
        </span>
      </div>

      {exportProgress !== null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <span
            style={{
              fontSize: '13px',
              color: '#ecc94b',
              minWidth: '80px'
            }}
          >
            导出中...
          </span>
          <div
            style={{
              flex: 1,
              height: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${exportProgress * 100}%`,
                background: 'linear-gradient(90deg, #3182ce, #805ad5)',
                borderRadius: '3px',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </div>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#a0aec0',
              minWidth: '40px',
              textAlign: 'right'
            }}
          >
            {Math.round(exportProgress * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};
