import { useMemo } from 'react';
import { VideoCard } from './VideoCard';
import { useWebRTCStore } from '../store/webrtcStore';

const MAX_VISIBLE = 6;

export function VideoGrid() {
  const { remoteStreams, processedLocalStream, nickname, visibleParticipantsOffset, isScreenSharing } =
    useWebRTCStore();

  const visibleRemote = useMemo(() => {
    const offset = Math.min(visibleParticipantsOffset, Math.max(0, remoteStreams.length - MAX_VISIBLE + 1));
    return remoteStreams.slice(offset, offset + MAX_VISIBLE);
  }, [remoteStreams, visibleParticipantsOffset]);

  const totalSlots = Math.min(MAX_VISIBLE, Math.max(1, remoteStreams.length + (processedLocalStream ? 1 : 0)));
  const gridCols = totalSlots <= 1 ? 1 : totalSlots <= 2 ? 2 : 3;
  const gridRows = Math.ceil(totalSlots / gridCols);

  if (isScreenSharing) {
    return null;
  }

  const cardStyle = {
    aspectRatio: '16 / 9',
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridTemplateRows: `repeat(${gridRows}, 1fr)`,
        gap: '12px',
        width: '100%',
        height: '100%',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      {processedLocalStream && (
        <VideoCard
          stream={processedLocalStream}
          nickname={nickname || '我'}
          isLocal
          isMirrored
          style={cardStyle}
        />
      )}

      {visibleRemote.map((participant) => (
        <VideoCard
          key={participant.id}
          stream={participant.stream}
          nickname={participant.nickname}
          style={cardStyle}
        />
      ))}

      {Array.from({ length: Math.max(0, totalSlots - (processedLocalStream ? 1 : 0) - visibleRemote.length) }).map(
        (_, i) => (
          <VideoCard
            key={`empty-${i}`}
            nickname="等待加入..."
            style={cardStyle}
          />
        )
      )}
    </div>
  );
}
