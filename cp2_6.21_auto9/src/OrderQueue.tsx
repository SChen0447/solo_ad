import type { QueueInfo } from './types';

interface OrderQueueProps {
  queueInfo: QueueInfo;
}

function OrderQueue({ queueInfo }: OrderQueueProps) {
  const activeOrders = queueInfo.orders.filter(
    o => o.status === 'queued' || o.status === 'preparing'
  );

  const maxWait = queueInfo.orders.length > 0
    ? Math.max(...queueInfo.orders.map(o => o.estimatedWaitTime))
    : 0;

  return (
    <div className="order-queue">
      <h3 className="queue-title">📋 排队状态</h3>
      <div className="queue-stats">
        <div className="queue-stat-item">
          <span className="stat-value">{queueInfo.totalInQueue}</span>
          <span className="stat-label">正在制作</span>
        </div>
        <div className="queue-stat-item">
          <span className="stat-value">{maxWait}</span>
          <span className="stat-label">预计等待(分钟)</span>
        </div>
      </div>
      <div className="queue-list">
        {activeOrders.length === 0 ? (
          <div className="empty-queue">暂无排队订单</div>
        ) : (
          activeOrders.slice(0, 5).map(order => (
            <div key={order.id} className="queue-item">
              <span className="queue-order-num">#{order.orderNumber}</span>
              <span className={`queue-status ${order.status}`}>
                {order.status === 'queued' ? '排队中' : '制作中'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default OrderQueue;
