import { usePetStore } from '../store/petStore';

export default function InteractionLog() {
  const logs = usePetStore((s) => s.interactionLogs);

  if (logs.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'center',
      zIndex: 999,
      pointerEvents: 'none',
    }}>
      {logs.map((log) => (
        <div
          key={log.id}
          className="interaction-log-enter"
          style={{
            fontSize: '14px',
            color: '#8e44ad',
            fontWeight: 600,
            background: 'rgba(255,255,255,0.9)',
            padding: '8px 20px',
            borderRadius: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {log.message}
        </div>
      ))}
    </div>
  );
}
