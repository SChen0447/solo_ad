import { useState } from "react";
import type { Order, OrderStatus } from "@/common/types";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "待处理",
  in_production: "生产中",
  ready_to_ship: "待发货",
  completed: "已完成",
};

const COLUMNS: OrderStatus[] = ["pending", "in_production", "ready_to_ship", "completed"];

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending: "in_production",
  in_production: "ready_to_ship",
  ready_to_ship: "completed",
  completed: null,
};

interface OrderBoardProps {
  orders: Order[];
  onRefresh: () => void;
}

interface FormState {
  customer: string;
  product: string;
  quantity: string;
  amount: string;
  deadline: string;
}

const emptyForm: FormState = {
  customer: "",
  product: "",
  quantity: "",
  amount: "",
  deadline: "",
};

export default function OrderBoard({ orders, onRefresh }: OrderBoardProps) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const grouped = COLUMNS.reduce<Record<OrderStatus, Order[]>>((acc, status) => {
    acc[status] = orders.filter((o) => o.status === status);
    return acc;
  }, {} as Record<OrderStatus, Order[]>);

  function handleFormChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    if (!form.customer || !form.product || !form.quantity || !form.amount || !form.deadline) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: form.customer,
          product: form.product,
          quantity: Number(form.quantity),
          amount: Number(form.amount),
          deadline: form.deadline,
        }),
      });
      const data = await res.json();
      if (data.materialWarning && data.lowStockItems?.length) {
        alert("以下物料库存不足，请注意补充：\n" + data.lowStockItems.join("、"));
      }
      setForm(emptyForm);
      setShowModal(false);
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    onRefresh();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            width: 160,
            height: 48,
            borderRadius: 24,
            background: "linear-gradient(135deg, #6366F1, #A855F7)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          新建订单
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
        {COLUMNS.map((status) => (
          <div
            key={status}
            style={{
              minWidth: 280,
              width: 280,
              background: "#F1F5F9",
              borderRadius: 12,
              padding: 16,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: "#334155" }}>
                {STATUS_LABELS[status]}
              </span>
              <span
                style={{
                  background: "#6366F1",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 10,
                  padding: "2px 8px",
                  lineHeight: "18px",
                }}
              >
                {grouped[status].length}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {grouped[status].map((order) => (
                <div
                  key={order.id}
                  style={{
                    width: 250,
                    background: "#fff",
                    borderRadius: 8,
                    border: "1px solid #E2E8F0",
                    boxShadow: "#CBD5E1 0 2px 4px",
                    padding: 14,
                    transition: "transform 0.2s",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#1E293B", marginBottom: 6 }}>
                    {order.customer}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748B", marginBottom: 4 }}>{order.product}</div>
                  <div style={{ fontSize: 13, color: "#6366F1", fontWeight: 600, marginBottom: 4 }}>
                    ¥{order.amount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8 }}>
                    截止：{order.deadline}
                  </div>

                  {NEXT_STATUS[status] && (
                    <select
                      value={status}
                      onChange={(e) =>
                        handleStatusChange(order.id, e.target.value as OrderStatus)
                      }
                      style={{
                        width: "100%",
                        padding: "4px 8px",
                        fontSize: 12,
                        border: "1px solid #E2E8F0",
                        borderRadius: 6,
                        background: "#F8FAFC",
                        color: "#475569",
                        cursor: "pointer",
                        outline: "none",
                      }}
                    >
                      <option value={status}>{STATUS_LABELS[status]}</option>
                      <option value={NEXT_STATUS[status]!}>
                        {STATUS_LABELS[NEXT_STATUS[status]!]}
                      </option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#00000070",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              width: 480,
              background: "#fff",
              borderRadius: 16,
              padding: 32,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 700, color: "#1E293B" }}>
              新建订单
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#475569" }}>
                  客户名
                </label>
                <input
                  style={inputStyle}
                  value={form.customer}
                  onChange={(e) => handleFormChange("customer", e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#475569" }}>
                  产品名
                </label>
                <input
                  style={inputStyle}
                  value={form.product}
                  onChange={(e) => handleFormChange("product", e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#475569" }}>
                  数量
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={form.quantity}
                  onChange={(e) => handleFormChange("quantity", e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#475569" }}>
                  金额
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={form.amount}
                  onChange={(e) => handleFormChange("amount", e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#475569" }}>
                  截止日期
                </label>
                <input
                  type="date"
                  style={inputStyle}
                  value={form.deadline}
                  onChange={(e) => handleFormChange("deadline", e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 28 }}>
              <button
                onClick={() => {
                  setForm(emptyForm);
                  setShowModal(false);
                }}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                  background: "#fff",
                  color: "#475569",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg, #6366F1, #A855F7)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? "提交中..." : "提交"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
