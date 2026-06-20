import type { Order, OrderStatus } from './types';

interface OrderQueueProps {
  orders: Order[];
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: string }> = {
  queued: { label: '排队中', color: '#FF9800', icon: '⏳' },
  preparing: { label: '制作中', color: '#2196F3', icon: '☕' },
  ready: { label: '待取餐', color: '#4CAF50', icon: '✅' },
  completed: { label: '已完成', color: '#9E9E9E', icon: '✔' },
};

export default function OrderQueue({ orders }: OrderQueueProps) {
  const activeOrders = orders.filter((o) => o.status !== 'completed');

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>📋 排队队列</h4>

      {activeOrders.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>暂无进行中的订单</p>
        </div>
      ) : (
        <div style={styles.ordersList}>
          {activeOrders.map((order) => {
            const config = statusConfig[order.status];
            return (
              <div key={order.id} style={styles.orderCard}>
                <div style={styles.orderHeader}>
                  <span style={styles.orderNumber}>#{order.queueNumber}</span>
                  <span
                    style={{
                      ...styles.orderStatus,
                      backgroundColor: `${config.color}20`,
                      color: config.color,
                    }}
                  >
                    {config.icon} {config.label}
                  </span>
                </div>
                <div style={styles.orderDrinks}>
                  {order.items.map((item, idx) => (
                    <span key={idx} style={styles.orderDrinkItem}>
                      {item.drink.image} {item.drink.name}
                      {item.quantity > 1 && ` ×${item.quantity}`}
                      {idx < order.items.length - 1 ? '，' : ''}
                    </span>
                  ))}
                </div>
                <div style={styles.orderFooter}>
                  <span style={styles.orderTotal}>¥{order.totalPrice}</span>
                  {order.status === 'queued' && (
                    <span style={styles.estimate}>
                      预计等待 ~{order.estimatedWaitMinutes} 分钟
                    </span>
                  )}
                  {order.status === 'ready' && (
                    <span style={styles.readyText}>请到吧台取餐 🎉</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {},
  title: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: '12px',
  },
  empty: {
    padding: '20px 12px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '12px',
    color: '#A1887F',
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  orderNumber: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#6F4E37',
  },
  orderStatus: {
    fontSize: '11px',
    padding: '3px 8px',
    borderRadius: '10px',
    fontWeight: '500',
  },
  orderDrinks: {
    fontSize: '12px',
    color: '#5D4037',
    marginBottom: '8px',
    lineHeight: '1.5',
  },
  orderDrinkItem: { display: 'inline' },
  orderFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '8px',
    borderTop: '1px dashed #EFEBE9',
  },
  orderTotal: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#6F4E37',
  },
  estimate: {
    fontSize: '11px',
    color: '#FF9800',
  },
  readyText: {
    fontSize: '11px',
    color: '#4CAF50',
    fontWeight: 'bold',
  },
};
