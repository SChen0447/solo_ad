import { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from './api';
import { useApp } from './App';
import { Ingredient, Supplier, Order, OrderItem } from '../shared/types';

interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  distance: string;
  items: Array<{
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>;
  total: number;
}

export default function PurchaseOrder() {
  const { refreshFlag, triggerRefresh } = useApp();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'auto' | 'history'>('auto');
  const [generated, setGenerated] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invs, sups, ords] = await Promise.all([
        api.getInventory(),
        api.getSuppliers(),
        api.getOrders(),
      ]);
      setIngredients(invs);
      setSuppliers(sups);
      setOrders(ords);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [refreshFlag, loadData]);

  const warningIngredients = useMemo(() => {
    const now = Date.now();
    return ingredients
      .filter((ing) => {
        const daysLeft = Math.ceil(
          (new Date(ing.expiryDate).getTime() - now) / 86400000
        );
        return ing.currentStock < ing.threshold || daysLeft <= 7;
      })
      .map((ing) => {
        const daysLeft = Math.ceil(
          (new Date(ing.expiryDate).getTime() - now) / 86400000
        );
        const rate = ing.dailyConsumptionRate || 1;
        const neededDays = Math.max(7, 30 - Math.max(0, daysLeft));
        const recommended = Math.ceil(
          neededDays * rate + ing.threshold - ing.currentStock
        );
        return {
          ingredient: ing,
          daysLeft,
          recommendedQuantity: Math.max(ing.threshold, recommended),
        };
      });
  }, [ingredients]);

  const supplierGroups = useMemo((): SupplierGroup[] => {
    const groups = new Map<string, SupplierGroup>();

    warningIngredients.forEach(({ ingredient, recommendedQuantity }) => {
      const ingSuppliers = suppliers.filter(
        (s) => s.ingredientId === ingredient.id
      );
      if (ingSuppliers.length === 0) return;

      const preferred = ingSuppliers.find((s) => s.isPreferred);
      const cheapest = [...ingSuppliers].sort(
        (a, b) =>
          (a.priceHistory[0]?.price || 0) - (b.priceHistory[0]?.price || 0)
      )[0];
      const selected = preferred || cheapest;
      if (!selected) return;

      const price = selected.priceHistory[0]?.price || 0;
      if (!groups.has(selected.id)) {
        groups.set(selected.id, {
          supplierId: selected.id,
          supplierName: selected.name,
          distance: selected.distance || '5公里',
          items: [],
          total: 0,
        });
      }
      const group = groups.get(selected.id)!;
      group.items.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantity: recommendedQuantity,
        unit: ingredient.unit,
        unitPrice: price,
      });
      group.total += recommendedQuantity * price;
    });

    return Array.from(groups.values()).sort((a, b) => a.total - b.total);
  }, [warningIngredients, suppliers]);

  const bestSupplier = useMemo(() => {
    if (supplierGroups.length === 0) return null;
    return supplierGroups.reduce((best, g) => (g.total < best.total ? g : best));
  }, [supplierGroups]);

  const totalAll = useMemo(
    () => supplierGroups.reduce((sum, g) => sum + g.total, 0),
    [supplierGroups]
  );

  async function generateOrder() {
    const items: OrderItem[] = supplierGroups.flatMap((g) =>
      g.items.map((it) => ({
        ingredientId: it.ingredientId,
        ingredientName: it.ingredientName,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        supplierId: g.supplierId,
        supplierName: g.supplierName,
      }))
    );
    if (items.length === 0) return;
    await api.createOrder({ items });
    setGenerated(true);
    triggerRefresh();
    loadData();
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>
        ⏳ 加载中...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>
            📋 采购单管理
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14 }}>
            系统自动推荐采购清单，按供应商分组查看
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #E5E7EB',
          gap: 4,
        }}
      >
        {([
          { key: 'auto', label: '🛒 智能采购推荐' },
          { key: 'history', label: '📜 历史采购单' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 24px',
              background: 'transparent',
              fontWeight: 600,
              fontSize: 14,
              color: activeTab === tab.key ? '#F97316' : '#6B7280',
              borderBottom:
                activeTab === tab.key
                  ? '2px solid #F97316'
                  : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {tab.label}
            {tab.key === 'auto' && (
              <span
                style={{
                  marginLeft: 6,
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 11,
                }}
              >
                {warningIngredients.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'auto' ? (
        <AutoPurchaseView
          warningCount={warningIngredients.length}
          supplierGroups={supplierGroups}
          bestSupplier={bestSupplier}
          totalAll={totalAll}
          generated={generated}
          onGenerate={generateOrder}
        />
      ) : (
        <HistoryView orders={orders} />
      )}
    </div>
  );
}

function AutoPurchaseView({
  warningCount,
  supplierGroups,
  bestSupplier,
  totalAll,
  generated,
  onGenerate,
}: {
  warningCount: number;
  supplierGroups: SupplierGroup[];
  bestSupplier: SupplierGroup | null;
  totalAll: number;
  generated: boolean;
  onGenerate: () => void;
}) {
  if (warningCount === 0) {
    return (
      <div
        style={{
          padding: 60,
          textAlign: 'center',
          backgroundColor: 'white',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#065F46' }}>
          库存状态良好
        </div>
        <div style={{ color: '#6B7280', marginTop: 4, fontSize: 14 }}>
          所有原材料库存充足，暂无需要采购的项目
        </div>
      </div>
    );
  }

  if (supplierGroups.length === 0) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: 'center',
          backgroundColor: 'white',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          color: '#9CA3AF',
        }}
      >
        这些原材料还没有关联供应商，请先在供应商管理中添加
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {supplierGroups.map((group) => (
          <SupplierGroupCard key={group.supplierId} group={group} />
        ))}
      </div>

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: 20,
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#1F2937',
            marginBottom: 16,
          }}
        >
          📊 供应商总价对比
        </h3>
        <div
          style={{
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {supplierGroups.slice(0, 3).map((group) => (
            <SupplierCompareCard
              key={group.supplierId}
              group={group}
              isBest={bestSupplier?.supplierId === group.supplierId}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          backgroundColor: 'white',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <span style={{ color: '#6B7280', fontSize: 14 }}>预计总花费：</span>
          <span
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#F97316',
              marginLeft: 8,
            }}
          >
            ¥{totalAll.toFixed(2)}
          </span>
        </div>
        <button
          onClick={onGenerate}
          disabled={generated || supplierGroups.length === 0}
          style={{
            padding: '10px 28px',
            backgroundColor:
              generated || supplierGroups.length === 0 ? '#D1D5DB' : '#F97316',
            color: 'white',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 15,
            cursor:
              generated || supplierGroups.length === 0
                ? 'not-allowed'
                : 'pointer',
          }}
        >
          {generated ? '✓ 已生成采购单' : '📝 确认生成采购单'}
        </button>
      </div>
    </div>
  );
}

function SupplierGroupCard({ group }: { group: SupplierGroup }) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 20px',
          backgroundColor: '#F9FAFB',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🏪</span>
          <div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#1F2937',
              }}
            >
              {group.supplierName}
            </h3>
            <div
              style={{
                fontSize: 12,
                color: '#6B7280',
                marginTop: 2,
              }}
            >
              {group.items.length} 种商品 · {group.distance}
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#F97316',
          }}
        >
          ¥{group.total.toFixed(2)}
        </div>
      </div>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 14,
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: '#FAFAFA',
              fontSize: 12,
              color: '#6B7280',
              fontWeight: 500,
            }}
          >
            <th
              style={{
                textAlign: 'left',
                padding: '10px 20px',
                fontWeight: 500,
              }}
            >
              原材料名称
            </th>
            <th
              style={{
                textAlign: 'center',
                padding: '10px 16px',
                fontWeight: 500,
              }}
            >
              采购量
            </th>
            <th
              style={{
                textAlign: 'center',
                padding: '10px 16px',
                fontWeight: 500,
              }}
            >
              单价
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: '10px 20px',
                fontWeight: 500,
              }}
            >
              小计
            </th>
          </tr>
        </thead>
        <tbody>
          {group.items.map((item) => (
            <tr
              key={item.ingredientId}
              style={{
                borderTop: '1px solid #F3F4F6',
              }}
            >
              <td
                style={{
                  padding: '12px 20px',
                  color: '#374151',
                }}
              >
                {item.ingredientName}
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                <span
                  style={{
                    backgroundColor: '#D1FAE5',
                    color: '#065F46',
                    padding: '3px 10px',
                    borderRadius: 4,
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {item.quantity} {item.unit}
                </span>
              </td>
              <td
                style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  color: '#6B7280',
                }}
              >
                ¥{item.unitPrice.toFixed(2)}
              </td>
              <td
                style={{
                  padding: '12px 20px',
                  textAlign: 'right',
                  fontWeight: 600,
                  color: '#1F2937',
                }}
              >
                ¥{(item.quantity * item.unitPrice).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SupplierCompareCard({
  group,
  isBest,
}: {
  group: SupplierGroup;
  isBest: boolean;
}) {
  return (
    <div
      style={{
        width: 220,
        minWidth: 220,
        backgroundColor: 'white',
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        padding: 20,
        border: isBest ? '2px solid #10B981' : '1px solid #E5E7EB',
        position: 'relative',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      }}
    >
      {isBest && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            right: 16,
            backgroundColor: '#F59E0B',
            color: 'white',
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 4,
            fontWeight: 700,
          }}
        >
          最划算
        </div>
      )}
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#374151',
          marginBottom: 4,
        }}
      >
        {group.supplierName}
      </div>
      <div
        style={{
          fontSize: 12,
          color: '#6B7280',
          marginBottom: 12,
        }}
      >
        📍 {group.distance}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: isBest ? '#10B981' : '#1F2937',
          marginBottom: 8,
        }}
      >
        ¥{group.total.toFixed(2)}
      </div>
      {isBest && (
        <div
          style={{
            backgroundColor: '#D1FAE5',
            color: '#065F46',
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          ✓ 推荐选择
        </div>
      )}
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px dashed #E5E7EB',
          fontSize: 12,
          color: '#9CA3AF',
        }}
      >
        共 {group.items.length} 种商品
      </div>
    </div>
  );
}

function HistoryView({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div
        style={{
          padding: 60,
          textAlign: 'center',
          backgroundColor: 'white',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          color: '#9CA3AF',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
        暂无历史采购单
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {orders.map((order) => (
        <div
          key={order.id}
          style={{
            backgroundColor: 'white',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1F2937' }}>
                采购单 #{order.id.slice(0, 8).toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                {new Date(order.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor:
                    order.status === 'completed'
                      ? '#D1FAE5'
                      : order.status === 'cancelled'
                      ? '#FEE2E2'
                      : '#FEF3C7',
                  color:
                    order.status === 'completed'
                      ? '#065F46'
                      : order.status === 'cancelled'
                      ? '#991B1B'
                      : '#92400E',
                }}
              >
                {order.status === 'pending'
                  ? '待处理'
                  : order.status === 'completed'
                  ? '已完成'
                  : '已取消'}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#F97316' }}>
                ¥{order.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {order.items.slice(0, 4).map((item) => (
              <span
                key={item.ingredientId}
                style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: 4,
                  color: '#6B7280',
                }}
              >
                {item.ingredientName} × {item.quantity}
                {item.unit}
              </span>
            ))}
            {order.items.length > 4 && (
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                等 {order.items.length} 项
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
