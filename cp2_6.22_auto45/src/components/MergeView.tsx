import { Fragment } from 'react';
import type { MergedOrderItem, PickupFilter } from '../types';

interface Props {
  mergedOrders: MergedOrderItem[];
  onMarkPicked: (productId: string, userId: string, picked: boolean) => void;
  filter: PickupFilter;
}

const MergeView = ({ mergedOrders, onMarkPicked, filter }: Props) => {
  const filtered = mergedOrders.map(mo => {
    const breakdown = mo.userBreakdown.filter(ub => {
      if (filter === 'all') return true;
      if (filter === 'picked') return ub.picked;
      return !ub.picked;
    });
    return { ...mo, userBreakdown: breakdown };
  }).filter(mo => mo.userBreakdown.length > 0);

  if (filtered.length === 0) {
    return <div className="empty-tip">暂无合并订单</div>;
  }

  return (
    <div className="merge-table-wrap">
      <table className="merge-table">
        <thead>
          <tr>
          </tr>
        </thead>
        <tbody>
          {filtered.map((mo, idx) => (
            <Fragment key={mo.productId}>
              <tr className={`merge-row merge-row-header ${idx % 2 === 1 ? 'even' : ''}`}>
                <td colSpan={3}>
                  <b>{mo.productName}</b>
                  <span className="merge-qty">总 {mo.totalQuantity} 件</span>
                  <span className="merge-amount">¥{mo.totalAmount.toFixed(2)}</span>
                </td>
              </tr>
              {mo.userBreakdown.map(ub => {
                const allPicked = ub.picked;
                return (
                  <tr key={`${mo.productId}-${ub.userId}`} className={`merge-row ${idx % 2 === 1 ? 'even' : ''} ${allPicked ? 'picked' : ''}`}>
                    <td className="merge-user-col">
                      {allPicked && <span className="picked-check">✅</span>}
                      <span className={allPicked ? 'picked-text' : ''}>{ub.userName}</span>
                      <span className="merge-user-qty">× {ub.quantity}</span>
                    </td>
                    <td className="merge-time-col">
                      {ub.pickedAt ? new Date(ub.pickedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="merge-action-col">
                      <button
                        className={`pickup-btn ${allPicked ? 'picked-btn' : ''}`}
                        onClick={() => onMarkPicked(mo.productId, ub.userId, !allPicked)}
                      >
                        {allPicked ? '✓ 已取' : '标记取货'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MergeView;
