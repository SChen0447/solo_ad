import { useState } from 'react'
import { useStore, Snapshot } from '../store/useStore'

interface SnapshotCardProps {
  snapshot: Snapshot
  isSelected: boolean
  onRestore: () => void
  onDelete: () => void
}

const SnapshotCard = ({ snapshot, isSelected, onRestore, onDelete }: SnapshotCardProps) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDeleting(true)
    setTimeout(() => {
      onDelete()
    }, 300)
  }

  const handleClick = () => {
    if (!isDeleting) {
      onRestore()
    }
  }

  return (
    <div
      onClick={handleClick}
      style={{
        ...styles.card,
        ...(isSelected ? styles.cardSelected : {}),
        transform: isDeleting ? 'scale(0.5)' : 'scale(1)',
        opacity: isDeleting ? 0 : 1,
        transition: 'transform 0.3s ease, opacity 0.3s ease, border-color 0.2s ease'
      }}
    >
      <button
        onClick={handleDelete}
        style={styles.deleteButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 100, 100, 0.8)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'
        }}
      >
        ×
      </button>
      <div style={styles.thumbnailContainer}>
        <img src={snapshot.thumbnail} alt="Snapshot" style={styles.thumbnail} />
      </div>
      <div style={styles.colorsRow}>
        <div style={{ ...styles.colorDot, background: snapshot.colors.shade }} title="灯罩" />
        <div style={{ ...styles.colorDot, background: snapshot.colors.pole }} title="灯杆" />
        <div style={{ ...styles.colorDot, background: snapshot.colors.base }} title="底座" />
      </div>
      <div style={styles.colorsText}>
        <span style={styles.colorCode}>{snapshot.colors.shade.toUpperCase()}</span>
        <span style={styles.colorCode}>{snapshot.colors.pole.toUpperCase()}</span>
        <span style={styles.colorCode}>{snapshot.colors.base.toUpperCase()}</span>
      </div>
    </div>
  )
}

const SnapshotGrid = () => {
  const { snapshots, selectedSnapshotId, restoreSnapshot, removeSnapshot } = useStore()

  return (
    <div className="snapshot-grid" style={styles.container}>
      <h4 style={styles.title}>快照方案</h4>
      <div style={styles.grid}>
        {snapshots.map((snapshot) => (
          <SnapshotCard
            key={snapshot.id}
            snapshot={snapshot}
            isSelected={selectedSnapshotId === snapshot.id}
            onRestore={() => restoreSnapshot(snapshot.id)}
            onDelete={() => removeSnapshot(snapshot.id)}
          />
        ))}
        {snapshots.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>修改颜色后自动生成快照</p>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '16px 20px',
    zIndex: 100,
    maxWidth: 'calc(100vw - 40px)'
  },
  title: {
    color: '#e0e0e0',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '12px',
    textAlign: 'center' as const
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    minWidth: '420px'
  },
  card: {
    position: 'relative' as const,
    width: '140px',
    padding: '8px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'border-color 0.2s ease'
  },
  cardSelected: {
    borderColor: 'rgba(74, 144, 217, 0.8)'
  },
  deleteButton: {
    position: 'absolute' as const,
    top: '4px',
    right: '4px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'rgba(0, 0, 0, 0.5)',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    lineHeight: '1',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    transition: 'background 0.2s ease'
  },
  thumbnailContainer: {
    width: '120px',
    height: '120px',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#16213e',
    marginBottom: '8px',
    margin: '0 auto 8px auto'
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const
  },
  colorsRow: {
    display: 'flex',
    gap: '6px',
    marginBottom: '6px',
    justifyContent: 'center' as const
  },
  colorDot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  colorsText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    alignItems: 'center' as const
  },
  colorCode: {
    color: 'rgba(224, 224, 224, 0.7)',
    fontSize: '9px',
    fontFamily: 'monospace'
  },
  emptyState: {
    gridColumn: '1 / -1',
    padding: '40px 20px',
    textAlign: 'center' as const
  },
  emptyText: {
    color: 'rgba(224, 224, 224, 0.5)',
    fontSize: '12px'
  }
}

export default SnapshotGrid
