import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import StatsPanel from './components/StatsPanel';
import ProductList from './components/ProductList';
import OrderBoard from './components/OrderBoard';

export interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  location: string;
  threshold: number;
  category: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  trackingNumber: string;
  status: 'pending' | 'shipped' | 'delivered';
  createdAt: string;
}

export interface Stats {
  totalProducts: number;
  pendingOrders: number;
  todayShipped: number;
}

const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; color: #1f2937; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
`;

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, pendingOrders: 0, todayShipped: 0 });

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  }, []);

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/orders');
    const data = await res.json();
    setOrders(data);
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/stats');
    const data = await res.json();
    setStats(data);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchProducts(), fetchOrders(), fetchStats()]);
  }, [fetchProducts, fetchOrders, fetchStats]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const addProduct = async (product: Omit<Product, 'id'>) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (res.ok) {
      await refreshAll();
      return null;
    }
    const err = await res.json();
    return err;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      await refreshAll();
      return null;
    }
    const err = await res.json();
    return err;
  };

  const deleteProduct = async (id: string) => {
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    await refreshAll();
  };

  const createOrder = async (items: OrderItem[], trackingNumber: string) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, trackingNumber }),
    });
    if (res.ok) {
      await refreshAll();
      return null;
    }
    const err = await res.json();
    return err;
  };

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      await refreshAll();
      return null;
    }
    const err = await res.json();
    return err;
  };

  return (
    <>
      <style>{globalStyles}</style>
      <Header />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 0' }}>
        <StatsPanel stats={stats} />
        <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
          <div style={{ flex: 1 }}>
            <ProductList
              products={products}
              onAdd={addProduct}
              onDelete={deleteProduct}
              onUpdate={updateProduct}
              onCreateOrder={createOrder}
            />
          </div>
        </div>
        <div style={{ marginTop: 24 }}>
          <OrderBoard orders={orders} onUpdateOrder={updateOrder} />
        </div>
      </div>
    </>
  );
}
