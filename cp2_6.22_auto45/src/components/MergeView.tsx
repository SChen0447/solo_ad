/**
 * MergeView 合并订单视图组件
 *
 * 功能概览：
 *   将所有用户提交的订单 按商品ID 聚合并展示
 *   支持按取货状态过滤（全部 / 未取 / 已取）
 *   按用户粒度 标记取货 / 取消取货，并记录时间戳
 *
 * 数据流向：
 *   父组件 App → GET /api/merged-orders → props.mergedOrders
 *     → 本组件按 filter 过滤渲染 → 点击取货按钮
 *     → onMarkPicked(productId, userId, picked)
 *     → App → POST /api/pickup → 刷新数据
 *
 * 视觉要求：
 *   已取货条目 → opacity 0.5 + 左侧绿色对勾 ✅ + 删除线
 *   未取货条目 → 正常显示 + "标记取货"按钮（#D97706 橘棕色）
 *   已取货按钮 → 绿色背景 #10B981 + 对勾
 */

import { Fragment } from 'react';
import type { MergedOrderItem, PickupFilter } from '../types';

interface Props {
  mergedOrders: MergedOrderItem[];
  onMarkPicked: (productId: string, userId: string, picked: boolean) => void;
  filter: PickupFilter;
}

const MergeView = ({ mergedOrders, onMarkPicked, filter }: Props) => {
  // Step 1：先按状态过滤 userBreakdown，再过滤掉空商品组
  const filtered = mergedOrders
    .map((mo) => {
      const breakdown = mo.userBreakdown.filter((ub) => {
        if (filter === 'all') return true;
        if (filter === 'picked') return ub.picked;
        return !ub.picked; // unpicked
      });
      return { ...mo, userBreakdown: breakdown };
    })
    .filter((mo) => mo.userBreakdown.length > 0);

  if (filtered.length === 0) {
    return (
      <div className="empty-tip">
        {filter === 'picked'
          ? '暂无已取货订单'
          : filter === 'unpicked'
          ? '暂无未取货订单'
          : '暂无合并订单，去左侧提交订单试试～'}
      </div>
    );
  }

  return (
    <div className="merge-table-wrap">
      <table className="merge-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: '#6B7280', fontWeight: 500, borderBottom: '2px solid #F59E0B' }}>
              取货人 / 商品
            </th>
            <th style={{ textAlign: 'center', padding: '8px', fontSize: 12, color: '#6B7280', fontWeight: 500, borderBottom: '2px solid #F59E0B' }}>
              时间
            </th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 12, color: '#6B7280', fontWeight: 500, borderBottom: '2px solid #F59E0B' }}>
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((mo, idx) => {
            // 该商品全部用户是否都已取货 → 组头也置灰
            const allPicked = mo.userBreakdown.every((ub) => ub.picked);
            return (
              <Fragment key={mo.productId}>
                {/* 商品聚合行：商品名 / 总数量 / 总金额 */}
                <tr
                  className={`merge-row merge-row-header ${idx % 2 === 1 ? 'even' : ''} ${
                    allPicked ? 'picked' : ''
                  }`}
                  style={allPicked ? { opacity: 0.5 } : {}}
                >
                  <td colSpan={3}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {allPicked && <span className="picked-check">✅</span>}
                      <b>{mo.productName}</b>
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span className="merge-qty">总 {mo.totalQuantity} 件</span>
                      <span className="merge-amount">¥{mo.totalAmount.toFixed(2)}</span>
                    </span>
                  </td>
                </tr>

                {/* 每个用户的取货行 */}
                {mo.userBreakdown.map((ub) => {
                  const isPicked = ub.picked;
                  return (
                    <tr
                      key={`${mo.productId}-${ub.userId}`}
                      className={`merge-row ${idx % 2 === 1 ? 'even' : ''} ${isPicked ? 'picked' : ''}`}
                      style={{ opacity: isPicked ? 0.5 : 1, transition: 'opacity 0.3s ease' }}
                    >
                      {/* 用户名 + 数量 + 绿色对勾 */}
                      <td className="merge-user-col">
                        <span
                          className={`picked-check-indicator ${isPicked ? 'visible' : 'hidden'}`}
                        >
                          ✅
                        </span>
                        <span className={`user-name ${isPicked ? 'picked-text' : ''}`}>
                          {ub.userName}
                        </span>
                        <span className="merge-user-qty">
                          × {ub.quantity}
                          <span className="merge-user-sub">
                            小计 ¥{(mo.totalAmount / mo.totalQuantity * ub.quantity).toFixed(2)}
                          </span>
                        </span>
                      </td>

                      {/* 取货时间戳 — ISO 8601 格式（精确到毫秒） */}
                      <td className="merge-time-col" title={ub.pickedAt ? new Date(ub.pickedAt).toISOString() : '未取货'}>
                        {ub.pickedAt
                          ? <span style={{ fontFamily: 'Menlo, Consolas, monospace', fontSize: 10, color: '#6B7280' }}>
                              {new Date(ub.pickedAt).toISOString()}
                            </span>
                          : <span style={{ color: '#D1D5DB' }}>— 未取 —</span>}
                      </td>

                      {/* 取货操作按钮 */}
                      <td className="merge-action-col">
                        <button
                          type="button"
                          className={`pickup-btn ${isPicked ? 'picked-btn' : ''}`}
                          onClick={() => onMarkPicked(mo.productId, ub.userId, !isPicked)}
                          title={isPicked ? '点击撤销为未取货' : '点击标记为已取货'}
                        >
                          {isPicked ? '✓ 已取' : '标记取货'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MergeView;
