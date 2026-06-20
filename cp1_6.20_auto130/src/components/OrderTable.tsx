import { useState } from 'react';
import type { Order } from '../types';

interface OrderTableProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
}

export default function OrderTable({ orders, onUpdateStatus }: OrderTableProps) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const handleStatusUpdate = (orderId: string, status: Order['status']) => {
    onUpdateStatus(orderId, status);
    setHighlightedId(orderId);
    setTimeout(() => setHighlightedId(null), 500);
  };

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[#d1ccc0] bg-white py-20">
        <p className="text-sm text-[#8a8578]">暂无订单</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#d1ccc0]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#2d6a4f] text-white">
            <th className="px-4 py-3 text-left font-semibold">订单编号</th>
            <th className="px-4 py-3 text-left font-semibold">图书</th>
            <th className="px-4 py-3 text-right font-semibold">总价</th>
            <th className="px-4 py-3 text-center font-semibold">状态</th>
            <th className="px-4 py-3 text-left font-semibold">下单时间</th>
            <th className="px-4 py-3 text-center font-semibold">操作</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => (
            <tr
              key={order.id}
              className="transition-all duration-500"
              style={{
                height: '60px',
                background: highlightedId === order.id
                  ? '#ffe066'
                  : index % 2 === 0
                    ? '#f0ebe3'
                    : '#f8f5f0',
              }}
            >
              <td className="px-4 py-2 font-mono text-xs text-[#3a3a3a]">
                #{order.id.slice(-6)}
              </td>
              <td className="px-4 py-2">
                <div className="flex flex-wrap gap-1">
                  {order.items.map((item, i) => (
                    <span
                      key={i}
                      className="inline-block rounded-md bg-[#ece7dd] px-2 py-0.5 text-xs text-[#3a3a3a]"
                    >
                      {item.title} ×{item.quantity}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-2 text-right font-semibold text-[#2d6a4f]">
                ¥{order.totalPrice.toFixed(2)}
              </td>
              <td className="px-4 py-2 text-center">
                <span
                  className="inline-block rounded-full px-3 py-0.5 text-xs font-semibold"
                  style={{
                    background:
                      order.status === '待处理'
                        ? '#fef3c7'
                        : order.status === '已确认'
                          ? '#dbeafe'
                          : '#d1fae5',
                    color:
                      order.status === '待处理'
                        ? '#92400e'
                        : order.status === '已确认'
                          ? '#1e40af'
                          : '#065f46',
                  }}
                >
                  {order.status}
                </span>
              </td>
              <td className="px-4 py-2 text-xs text-[#8a8578]">
                {order.createdAt}
              </td>
              <td className="px-4 py-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  {order.status === '待处理' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, '已确认')}
                      className="rounded-lg px-3 py-1 text-xs font-medium text-white transition-all duration-200 hover:scale-95"
                      style={{ background: '#2d6a4f' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#245a42';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#2d6a4f';
                      }}
                    >
                      确认
                    </button>
                  )}
                  {order.status === '已确认' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, '已完成')}
                      className="rounded-lg px-3 py-1 text-xs font-medium text-white transition-all duration-200 hover:scale-95"
                      style={{ background: '#2563eb' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#1d4ed8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#2563eb';
                      }}
                    >
                      完成
                    </button>
                  )}
                  {order.status === '已完成' && (
                    <span className="text-xs text-[#8a8578]">—</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
