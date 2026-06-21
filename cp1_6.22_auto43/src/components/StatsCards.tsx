import type { Stats } from '../types';

interface Props {
  stats: Stats;
}

function StatsCards({ stats }: Props) {
  const cards = [
    {
      label: '图书种类数',
      value: stats.totalBooks,
      icon: '📖',
      gradient: 'linear-gradient(135deg, rgba(49, 130, 206, 0.15), rgba(66, 153, 225, 0.1))',
      border: '1px solid rgba(49, 130, 206, 0.25)',
      iconBg: 'linear-gradient(135deg, #3182ce, #4299e1)',
    },
    {
      label: '当前借出数量',
      value: stats.borrowedCount,
      icon: '📤',
      gradient: 'linear-gradient(135deg, rgba(237, 137, 54, 0.15), rgba(246, 173, 85, 0.1))',
      border: '1px solid rgba(237, 137, 54, 0.25)',
      iconBg: 'linear-gradient(135deg, #ed8936, #f6ad55)',
    },
    {
      label: '逾期借阅数量',
      value: stats.overdueCount,
      icon: '⚠️',
      gradient: 'linear-gradient(135deg, rgba(229, 62, 62, 0.15), rgba(245, 101, 101, 0.1))',
      border: '1px solid rgba(229, 62, 62, 0.25)',
      iconBg: 'linear-gradient(135deg, #e53e3e, #f56565)',
    },
  ];

  return (
    <div style={styles.container}>
      {cards.map((card, idx) => (
        <div
          key={idx}
          style={{
            ...styles.card,
            background: card.gradient,
            border: card.border,
            animation: `fadeIn 0.5s ease ${idx * 0.1}s both`,
          }}
        >
          <div
            style={{
              ...styles.iconWrap,
              background: card.iconBg,
            }}
          >
            <span style={styles.icon}>{card.icon}</span>
          </div>
          <div style={styles.textWrap}>
            <div style={styles.value}>{card.value}</div>
            <div style={styles.label}>{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 20,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    flexShrink: 0,
  },
  icon: {
    fontSize: 28,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  value: {
    fontSize: 32,
    fontWeight: 600,
    color: '#1a202c',
    lineHeight: 1.2,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#718096',
  },
};

export default StatsCards;
