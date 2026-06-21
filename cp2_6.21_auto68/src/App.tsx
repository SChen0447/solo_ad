import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import OrderBoard from "@/pages/OrderBoard";
import MaterialPanel from "@/pages/MaterialPanel";
import ShipmentTimeline from "@/pages/ShipmentTimeline";
import type { Order, Material, WorkOrder, Shipment, Stats } from "@/common/types";

const NAV_ITEMS = [
  {
    path: "/",
    label: "仪表盘",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="7" height="7" rx="1.5" fill="white" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" fill="white" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" fill="white" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" fill="white" />
      </svg>
    ),
  },
  {
    path: "/orders",
    label: "订单看板",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="2" width="14" height="16" rx="2" stroke="white" strokeWidth="1.5" fill="none" />
        <line x1="7" y1="6" x2="13" y2="6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="9.5" x2="13" y2="9.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="13" x2="10" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    path: "/materials",
    label: "物料库存",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2L18 6.5V13.5L10 18L2 13.5V6.5L10 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <path d="M10 2V18" stroke="white" strokeWidth="1.5" />
        <path d="M2 6.5L10 10.5L18 6.5" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    path: "/shipments",
    label: "发货计划",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="7" width="12" height="8" rx="1.5" stroke="white" strokeWidth="1.5" fill="none" />
        <path d="M13 10H16L18 12.5V15H13V10Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <circle cx="5.5" cy="16" r="1.5" fill="white" />
        <circle cx="15.5" cy="16" r="1.5" fill="white" />
      </svg>
    ),
  },
];

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [workorders, setWorkorders] = useState<WorkOrder[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then(setOrders)
      .catch(() => {});

    fetch("/api/materials")
      .then((r) => r.json())
      .then(setMaterials)
      .catch(() => {});

    fetch("/api/workorders")
      .then((r) => r.json())
      .then(setWorkorders)
      .catch(() => {});

    fetch("/api/shipments")
      .then((r) => r.json())
      .then(setShipments)
      .catch(() => {});

    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const hasLowStock = materials.some((m) => m.stock <= (m.threshold ?? 0));

  return (
    <BrowserRouter>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <aside
          style={{
            width: 240,
            minWidth: 240,
            background: "#1E293B",
            display: "flex",
            flexDirection: "column",
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: "24px 20px 20px",
              color: "white",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            手工坊管理
          </div>

          <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "8px 0" }}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  color: "white",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 500,
                  position: "relative",
                  background: isActive ? "#334155" : "transparent",
                  transition: "background 0.2s ease-out",
                })}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          top: "10%",
                          height: "80%",
                          width: 4,
                          background: "#6366F1",
                          borderRadius: "0 2px 2px 0",
                        }}
                      />
                    )}
                    <span style={{ display: "flex", alignItems: "center" }}>{item.icon}</span>
                    <span>{item.label}</span>
                    {item.path === "/materials" && hasLowStock && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ marginLeft: "auto" }}
                      >
                        <circle cx="6" cy="6" r="6" fill="#EF4444" />
                        <path d="M6 3V7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="6" cy="8.8" r="0.7" fill="white" />
                      </svg>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main
          style={{
            marginLeft: 240,
            flex: 1,
            background: "#F8F9FA",
            overflow: "auto",
            height: "100vh",
          }}
        >
          <Routes>
            <Route
              path="/"
              element={<Dashboard stats={stats} orders={orders} materials={materials} shipments={shipments} />}
            />
            <Route path="/orders" element={<OrderBoard orders={orders} workorders={workorders} />} />
            <Route path="/materials" element={<MaterialPanel materials={materials} />} />
            <Route path="/shipments" element={<ShipmentTimeline shipments={shipments} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
