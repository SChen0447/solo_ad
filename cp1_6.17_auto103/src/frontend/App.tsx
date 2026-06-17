import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { workApi, orderApi } from './services/api';
import { useAppStore } from './store/useAppStore';
import LayerViewer from './components/LayerViewer';
import CertificateGenerator from './components/CertificateGenerator';
import type { WorkListItem, Work, Order, PurchaseRequest } from './types';
import './styles/global.css';

function Navigation() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <nav style={styles.nav}>
      <div style={styles.navBrand}>
        <span style={styles.navIcon}>🎨</span>
        <span style={{ ...styles.navTitle, display: collapsed ? 'none' : 'block' }}>ArtLayer</span>
      </div>
      <Link to="/" style={styles.navLink}>
        <span>🏠</span><span style={{ display: collapsed ? 'none' : 'inline', marginLeft: 8 }}>作品浏览</span>
      </Link>
      <Link to="/dashboard" style={styles.navLink}>
        <span>📊</span><span style={{ display: collapsed ? 'none' : 'inline', marginLeft: 8 }}>用户中心</span>
      </Link>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{ ...styles.navLink, marginTop: 'auto', justifyContent: 'center' }}
      >
        {collapsed ? '▶' : '◀'}
      </button>
    </nav>
  );
}

function WorksBrowsePage() {
  const [works, setWorks] = useState<WorkListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCommercial, setFilterCommercial] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await workApi.getWorks({ commercialOnly: filterCommercial, search });
        setWorks(data.works);
      } catch {
        setWorks(MOCK_WORKS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filterCommercial, search]);

  return (
    <div style={styles.page}>
      <header style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>创意工坊 · 数字艺术市集</h1>
        <div style={styles.filterBar}>
          <input
            type="text"
            placeholder="搜索作品..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              checked={filterCommercial}
              onChange={(e) => setFilterCommercial(e.target.checked)}
            />
            <span style={{ marginLeft: 6 }}>仅显示可商用</span>
          </label>
        </div>
      </header>

      {loading ? (
        <div style={styles.loading}>加载中...</div>
      ) : (
        <div style={styles.grid}>
          {works.map((w) => (
            <div
              key={w.id}
              onClick={() => navigate(`/works/${w.id}`)}
              style={styles.card}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(233,69,96,0.3)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }}
            >
              <div style={styles.cardImgWrap}>
                <img src={w.thumbnail} alt={w.title} style={styles.cardImg} />
                {w.commercialUse && <span style={styles.commercialBadge}>✓ 商用</span>}
              </div>
              <div style={styles.cardBody}>
                <h3 style={styles.cardTitle}>{w.title}</h3>
                <p style={styles.cardDesc}>{w.description}</p>
                <div style={styles.cardFooter}>
                  <span style={styles.cardCreator}>{w.creatorName}</span>
                  <span style={styles.cardPrice}>¥{w.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<{ type: 'full' | 'single_layer'; layerId?: string }>({ type: 'full' });
  const navigate = useNavigate();
  const { setCurrentWork, currentUser } = useAppStore();

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await workApi.getWorkDetail(id);
        setWork(data);
        setCurrentWork(data);
      } catch {
        const mock = MOCK_WORK_DETAIL;
        setWork(mock);
        setCurrentWork(mock);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, setCurrentWork]);

  const openPurchaseModal = (type: 'full' | 'single_layer', layerId?: string) => {
    setPurchaseTarget({ type, layerId });
    setShowPurchaseModal(true);
  };

  if (loading || !work) return <div style={styles.loading}>加载中...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.detailHeader}>
        <Link to="/" style={styles.backBtn}>← 返回作品列表</Link>
        <h1 style={styles.pageTitle}>{work.title}</h1>
      </div>

      <div style={styles.detailContainer}>
        <div style={styles.detailLeft}>
          <LayerViewer />
        </div>
        <div style={styles.divider} />
        <div style={styles.detailRight}>
          <WorkInfoPanel work={work} />
          <LayerListPanel onBuyLayer={(lid) => openPurchaseModal('single_layer', lid)} />
          <button
            onClick={() => openPurchaseModal('full')}
            style={styles.buyFullBtn}
          >
            购买完整版 · ¥{work.price}
          </button>
        </div>
      </div>

      {showPurchaseModal && (
        <PurchaseModal
          work={work}
          target={purchaseTarget}
          buyerId={currentUser.id}
          buyerName={currentUser.name}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={(order) => {
            setShowPurchaseModal(false);
            navigate(`/purchase-success/${order.id}`);
          }}
        />
      )}
    </div>
  );
}

function WorkInfoPanel({ work }: { work: Work }) {
  return (
    <div style={styles.panel}>
      <h3 style={styles.panelTitle}>作品信息</h3>
      <div style={styles.infoRow}>
        <span style={styles.infoLabel}>创作者</span>
        <span style={styles.infoValue}>{work.creatorName}</span>
      </div>
      <div style={styles.infoRow}>
        <span style={styles.infoLabel}>分辨率</span>
        <span style={styles.infoValue}>{work.resolution}</span>
      </div>
      <div style={styles.infoRow}>
        <span style={styles.infoLabel}>尺寸</span>
        <span style={styles.infoValue}>{work.dimensions}</span>
      </div>
      <div style={styles.infoRow}>
        <span style={styles.infoLabel}>可商用</span>
        <span style={{ color: work.commercialUse ? 'var(--success)' : 'var(--error)', fontSize: 18 }}>
          {work.commercialUse ? '✅' : '❌'}
        </span>
      </div>
      <p style={styles.description}>{work.description}</p>
    </div>
  );
}

function LayerListPanel({ onBuyLayer }: { onBuyLayer: (layerId: string) => void }) {
  const { layers, selectedLayerId, setSelectedLayerId, toggleLayerVisibility, updateLayerOpacity, reorderLayers } = useAppStore();
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  return (
    <div style={styles.panel}>
      <h3 style={styles.panelTitle}>图层列表</h3>
      <div style={styles.layerList}>
        {layers.map((layer, idx) => (
          <div
            key={layer.id}
            draggable
            onDragStart={() => setDraggedIdx(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggedIdx !== null) reorderLayers(draggedIdx, idx);
              setDraggedIdx(null);
            }}
            onClick={() => setSelectedLayerId(layer.id)}
            style={{
              ...styles.layerItem,
              ...(selectedLayerId === layer.id ? styles.layerItemActive : {}),
              opacity: layer.visible ? 1 : 0.4,
              transition: 'opacity 0.2s ease-out'
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
              style={styles.eyeBtn}
            >
              {layer.visible ? '👁' : '👁‍🗨'}
            </button>
            <span style={styles.layerName}>{layer.name}</span>
            <span style={styles.layerOpacity}>{Math.round(layer.opacity * 100)}%</span>
          </div>
        ))}
      </div>

      {selectedLayer && (
        <div style={styles.propertyPanel}>
          <h4 style={styles.propertyTitle}>图层属性</h4>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>名称</span>
            <span style={styles.infoValue}>{selectedLayer.name}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>尺寸</span>
            <span style={styles.infoValue}>{selectedLayer.width} × {selectedLayer.height}px</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>可商用</span>
            <span style={{ color: selectedLayer.commercialUse ? 'var(--success)' : 'var(--error)', fontSize: 18 }}>
              {selectedLayer.commercialUse ? '✅' : '❌'}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>转售</span>
            <span style={{ color: selectedLayer.resellAllowed ? 'var(--success)' : 'var(--error)' }}>
              {selectedLayer.resellAllowed ? '允许' : '禁止'}
            </span>
          </div>
          <div style={styles.sliderRow}>
            <span style={styles.infoLabel}>透明度</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={selectedLayer.opacity}
              onChange={(e) => updateLayerOpacity(selectedLayer.id, parseFloat(e.target.value))}
              style={styles.slider}
            />
          </div>
          {selectedLayer.price > 0 && (
            <button
              onClick={() => onBuyLayer(selectedLayer.id)}
              style={styles.buyLayerBtn}
            >
              购买此图层 · ¥{selectedLayer.price}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PurchaseModal({
  work,
  target,
  buyerId,
  buyerName,
  onClose,
  onSuccess
}: {
  work: Work;
  target: { type: 'full' | 'single_layer'; layerId?: string };
  buyerId: string;
  buyerName: string;
  onClose: () => void;
  onSuccess: (order: Order) => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<'alipay' | 'wechat'>('alipay');
  const [loading, setLoading] = useState(false);
  const { addOrder } = useAppStore();

  const targetLayer = target.layerId ? work.layers.find((l) => l.id === target.layerId) : null;
  const price = target.type === 'full' ? work.price : (targetLayer?.price ?? 0);

  const handlePurchase = async () => {
    setLoading(true);
    const req: PurchaseRequest = {
      workId: work.id,
      purchaseType: target.type,
      layerId: target.layerId,
      paymentMethod,
      buyerId,
      buyerName
    };
    try {
      const resp = await orderApi.purchase(req);
      addOrder(resp.order);
      setTimeout(() => onSuccess(resp.order), 1500);
    } catch {
      const mockOrder: Order = {
        id: `ORD-${Date.now()}`,
        workId: work.id,
        workTitle: work.title,
        workThumbnail: work.thumbnail,
        buyerId,
        buyerName,
        purchaseType: target.type,
        layerId: target.layerId,
        layerName: targetLayer?.name,
        price,
        transactionTime: new Date().toISOString(),
        certificateHash: generateHash(),
        licenseType: work.commercialUse ? 'commercial' : 'personal'
      };
      addOrder(mockOrder);
      setTimeout(() => onSuccess(mockOrder), 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div
        style={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
      >
        <button style={styles.modalClose} onClick={onClose}>✕</button>
        <h2 style={styles.modalTitle}>确认购买</h2>
        <img src={work.thumbnail} alt={work.title} style={styles.modalThumb} />
        <h3 style={styles.modalWorkTitle}>
          {target.type === 'full' ? work.title : `${work.title} - ${targetLayer?.name}`}
        </h3>
        <p style={styles.modalPrice}>合计: <strong style={{ color: 'var(--accent)' }}>¥{price}</strong></p>

        <div style={styles.paymentOptions}>
          <button
            onClick={() => setPaymentMethod('alipay')}
            style={{
              ...styles.paymentBtn,
              ...(paymentMethod === 'alipay' ? styles.paymentBtnActive : {})
            }}
          >
            💙 支付宝
          </button>
          <button
            onClick={() => setPaymentMethod('wechat')}
            style={{
              ...styles.paymentBtn,
              ...(paymentMethod === 'wechat' ? styles.paymentBtnActive : {})
            }}
          >
            💚 微信支付
          </button>
        </div>

        <button
          onClick={handlePurchase}
          disabled={loading}
          style={styles.confirmPayBtn}
        >
          {loading ? (
            <span style={{
              display: 'inline-block',
              animation: 'spin 1.5s linear infinite'
            }}>⟳</span>
          ) : `立即支付 ¥${price}`}
        </button>
      </div>
    </div>
  );
}

function PurchaseSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const { orders } = useAppStore();
  const order = orders.find((o) => o.id === id);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowSuccess(true), 100);
  }, []);

  if (!order) {
    return <div style={styles.loading}>订单不存在...</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.successContainer}>
        <div
          style={{
            ...styles.successIcon,
            animation: showSuccess ? 'successPop 0.8s ease-out forwards' : 'none',
            opacity: showSuccess ? 1 : 0
          }}
        >
          ✓
        </div>
        <h1 style={styles.successTitle}>支付成功！</h1>
        <p style={styles.successSubtitle}>感谢您的购买，您的授权证书已生成</p>

        <div style={styles.orderCard}>
          <div style={styles.orderInfoRow}>
            <span style={styles.infoLabel}>订单号</span>
            <span style={styles.infoValue}>{order.id}</span>
          </div>
          <div style={styles.orderInfoRow}>
            <span style={styles.infoLabel}>作品</span>
            <span style={styles.infoValue}>{order.workTitle}</span>
          </div>
          <div style={styles.orderInfoRow}>
            <span style={styles.infoLabel}>购买内容</span>
            <span style={styles.infoValue}>
              {order.purchaseType === 'full' ? '完整版' : `单图层: ${order.layerName}`}
            </span>
          </div>
          <div style={styles.orderInfoRow}>
            <span style={styles.infoLabel}>金额</span>
            <span style={{ ...styles.infoValue, color: 'var(--accent)' }}>¥{order.price}</span>
          </div>
        </div>

        <CertificateGenerator order={order} />

        <Link to="/dashboard" style={styles.dashboardLink}>查看全部订单 →</Link>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { orders, currentUser } = useAppStore();
  const [loadedOrders, setLoadedOrders] = useState<Order[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await orderApi.getOrders(currentUser.id);
        setLoadedOrders(data);
      } catch {
        setLoadedOrders(orders.length > 0 ? orders : MOCK_ORDERS);
      }
    };
    load();
  }, [currentUser.id, orders]);

  const allOrders = loadedOrders.length > 0 ? loadedOrders : orders;

  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>用户中心 · 我的订单</h1>
      {allOrders.length === 0 ? (
        <div style={styles.emptyState}>
          <p>您还没有任何订单</p>
          <Link to="/" style={styles.buyFullBtn}>去逛逛作品</Link>
        </div>
      ) : (
        <div style={styles.orderList}>
          {allOrders.map((o) => (
            <div key={o.id} style={styles.orderListItem}>
              <img src={o.workThumbnail} alt={o.workTitle} style={styles.orderThumb} />
              <div style={{ flex: 1 }}>
                <h3 style={styles.orderWorkTitle}>{o.workTitle}</h3>
                <p style={styles.orderMeta}>
                  {o.purchaseType === 'full' ? '完整版' : `图层: ${o.layerName}`} · {new Date(o.transactionTime).toLocaleString('zh-CN')}
                </p>
                <p style={styles.orderHash}>证书哈希: {o.certificateHash}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...styles.cardPrice, fontSize: 20 }}>¥{o.price}</div>
                <CertificateGenerator order={o} compact />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function generateHash(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

const MOCK_WORKS: WorkListItem[] = [
  {
    id: 'work-001',
    creatorId: 'creator-001',
    creatorName: '星河画师',
    title: '赛博少女角色立绘',
    description: '含多层细节的未来风格角色立绘，包含表情、服装、配饰等分层',
    price: 299,
    thumbnail: 'https://images.unsplash.com/photo-1633177317976-3f9bc45e1d1d?w=400',
    commercialUse: true,
    createdAt: '2025-12-01'
  },
  {
    id: 'work-002',
    creatorId: 'creator-002',
    creatorName: '像素工坊',
    title: '像素风奇幻场景',
    description: '16-bit风格RPG场景，含地形、建筑、角色分层',
    price: 199,
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400',
    commercialUse: true,
    createdAt: '2025-11-28'
  },
  {
    id: 'work-003',
    creatorId: 'creator-003',
    creatorName: '幻境工作室',
    title: '森林场景插画',
    description: '水彩风格森林插画，含背景、树木、光影、角色分层',
    price: 159,
    thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
    commercialUse: false,
    createdAt: '2025-11-25'
  },
  {
    id: 'work-004',
    creatorId: 'creator-001',
    creatorName: '星河画师',
    title: '机甲战士概念设计',
    description: '科幻机甲角色设计，含装甲、武器、光效分层',
    price: 399,
    thumbnail: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=400',
    commercialUse: true,
    createdAt: '2025-11-20'
  }
];

const MOCK_WORK_DETAIL: Work = {
  id: 'work-001',
  creatorId: 'creator-001',
  creatorName: '星河画师',
  title: '赛博少女角色立绘',
  description: '未来赛博朋克风格的少女角色立绘，包含完整的分层结构：基础线稿、皮肤着色、头发分层、服装细节、光效与背景等，适合游戏和动画项目使用。',
  price: 299,
  thumbnail: 'https://images.unsplash.com/photo-1633177317976-3f9bc45e1d1d?w=800',
  resolution: '300 DPI',
  dimensions: '2000 × 3000 px',
  commercialUse: true,
  createdAt: '2025-12-01',
  layers: [
    {
      id: 'layer-bg',
      name: '背景',
      order: 0,
      visible: true,
      opacity: 1,
      commercialUse: true,
      resellAllowed: false,
      price: 49,
      width: 2000,
      height: 3000,
      imageBase64: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800'
    },
    {
      id: 'layer-body',
      name: '身体基础',
      order: 1,
      visible: true,
      opacity: 1,
      commercialUse: true,
      resellAllowed: false,
      price: 79,
      width: 2000,
      height: 3000,
      imageBase64: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'
    },
    {
      id: 'layer-hair',
      name: '头发',
      order: 2,
      visible: true,
      opacity: 1,
      commercialUse: true,
      resellAllowed: false,
      price: 59,
      width: 2000,
      height: 3000,
      imageBase64: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=800'
    },
    {
      id: 'layer-clothes',
      name: '服装',
      order: 3,
      visible: true,
      opacity: 1,
      commercialUse: true,
      resellAllowed: true,
      price: 69,
      width: 2000,
      height: 3000,
      imageBase64: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800'
    },
    {
      id: 'layer-effects',
      name: '光效',
      order: 4,
      visible: true,
      opacity: 0.8,
      commercialUse: true,
      resellAllowed: true,
      price: 39,
      width: 2000,
      height: 3000,
      imageBase64: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800'
    }
  ]
};

const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-12345678',
    workId: 'work-002',
    workTitle: '像素风奇幻场景',
    workThumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400',
    buyerId: 'user-001',
    buyerName: 'Demo User',
    purchaseType: 'full',
    price: 199,
    transactionTime: '2025-11-29T10:30:00Z',
    certificateHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
    licenseType: 'commercial'
  }
];

export default function App() {
  return (
    <div style={styles.app}>
      <Navigation />
      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<WorksBrowsePage />} />
          <Route path="/works/:id" element={<WorkDetailPage />} />
          <Route path="/purchase-success/:id" element={<PurchaseSuccessPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    width: '100%',
    height: '100vh',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    overflow: 'hidden'
  },
  nav: {
    width: 220,
    minWidth: 60,
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 0',
    transition: 'width 0.3s ease'
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px 24px',
    gap: 10
  },
  navIcon: {
    fontSize: 28
  },
  navTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--accent)'
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    color: 'var(--text-secondary)',
    fontSize: 14,
    transition: 'all 0.2s',
    textAlign: 'left',
    width: '100%'
  },
  main: {
    flex: 1,
    overflow: 'auto',
    padding: 24
  },
  page: {
    maxWidth: 1400,
    margin: '0 auto'
  },
  pageHeader: {
    marginBottom: 24
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 16
  },
  filterBar: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  searchInput: {
    backgroundColor: 'var(--secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 16px',
    color: 'var(--text-primary)',
    fontSize: 14,
    width: 280,
    outline: 'none'
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-secondary)',
    fontSize: 14,
    cursor: 'pointer'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
    fontSize: 18,
    color: 'var(--text-muted)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 20
  },
  card: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 12,
    overflow: 'hidden',
    transition: 'all 0.3s ease-out',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    cursor: 'pointer'
  },
  cardImgWrap: {
    position: 'relative',
    height: 180,
    overflow: 'hidden'
  },
  cardImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  commercialBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'var(--success)',
    color: '#fff',
    fontSize: 11,
    padding: '4px 8px',
    borderRadius: 4,
    fontWeight: 600
  },
  cardBody: {
    padding: 16
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 6,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  cardDesc: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginBottom: 12,
    height: 36,
    overflow: 'hidden'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardCreator: {
    fontSize: 12,
    color: 'var(--text-secondary)'
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--accent)'
  },
  detailHeader: {
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 16
  },
  backBtn: {
    color: 'var(--text-secondary)',
    fontSize: 14
  },
  detailContainer: {
    display: 'flex',
    gap: 0,
    minHeight: 'calc(100vh - 140px)',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 12,
    overflow: 'hidden'
  },
  detailLeft: {
    width: '60%',
    minWidth: 0
  },
  detailRight: {
    width: '40%',
    minWidth: 300,
    padding: 20,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  divider: {
    width: 1,
    backgroundColor: '#444'
  },
  panel: {
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: 8,
    padding: 16
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
    color: 'var(--accent)'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  infoLabel: {
    fontSize: 13,
    color: 'var(--text-muted)'
  },
  infoValue: {
    fontSize: 13,
    color: 'var(--text-primary)',
    fontWeight: 500
  },
  description: {
    marginTop: 12,
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.6
  },
  layerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    maxHeight: 240,
    overflow: 'auto'
  },
  layerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    borderLeft: '2px solid transparent'
  },
  layerItemActive: {
    backgroundColor: '#2a2a4e',
    borderLeft: '2px solid var(--accent)'
  },
  eyeBtn: {
    fontSize: 16,
    padding: '2px 4px',
    flexShrink: 0
  },
  layerName: {
    flex: 1,
    fontSize: 13
  },
  layerOpacity: {
    fontSize: 11,
    color: 'var(--text-muted)',
    width: 36,
    textAlign: 'right'
  },
  propertyPanel: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: '1px solid rgba(255,255,255,0.1)'
  },
  propertyTitle: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 10
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 0'
  },
  slider: {
    flex: 1,
    accentColor: 'var(--accent)'
  },
  buyFullBtn: {
    width: '100%',
    backgroundColor: 'var(--accent)',
    color: '#fff',
    padding: '14px',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    transition: 'filter 0.2s',
    display: 'block',
    textAlign: 'center'
  },
  buyLayerBtn: {
    width: '100%',
    backgroundColor: 'var(--secondary)',
    color: '#fff',
    padding: '10px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    marginTop: 12,
    transition: 'filter 0.2s'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease'
  },
  modalContent: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 16,
    padding: 32,
    width: '90%',
    maxWidth: 440,
    position: 'relative',
    animation: 'scaleIn 0.3s ease',
    textAlign: 'center'
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    fontSize: 20,
    color: 'var(--text-muted)'
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 16
  },
  modalThumb: {
    width: '100%',
    height: 160,
    objectFit: 'cover',
    borderRadius: 8,
    marginBottom: 12
  },
  modalWorkTitle: {
    fontSize: 16,
    marginBottom: 8
  },
  modalPrice: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    marginBottom: 20
  },
  paymentOptions: {
    display: 'flex',
    gap: 12,
    marginBottom: 20
  },
  paymentBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: 8,
    backgroundColor: 'var(--bg-tertiary)',
    border: '2px solid transparent',
    fontSize: 14,
    transition: 'all 0.2s'
  },
  paymentBtnActive: {
    borderColor: 'var(--accent)',
    backgroundColor: 'rgba(233,69,96,0.1)'
  },
  confirmPayBtn: {
    width: '100%',
    backgroundColor: 'var(--accent)',
    color: '#fff',
    padding: '14px',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    fontSize: 18
  },
  successContainer: {
    maxWidth: 600,
    margin: '40px auto',
    textAlign: 'center'
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    backgroundColor: 'var(--success)',
    color: '#fff',
    fontSize: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    fontWeight: 700
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
    color: 'var(--success)'
  },
  successSubtitle: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    marginBottom: 32
  },
  orderCard: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    textAlign: 'left'
  },
  orderInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  dashboardLink: {
    display: 'inline-block',
    marginTop: 16,
    color: 'var(--accent)',
    fontWeight: 600
  },
  emptyState: {
    textAlign: 'center',
    padding: 80,
    color: 'var(--text-muted)'
  },
  orderList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  orderListItem: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 16
  },
  orderThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    objectFit: 'cover'
  },
  orderWorkTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 4
  },
  orderMeta: {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginBottom: 4
  },
  orderHash: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontFamily: 'monospace'
  },
  '@media (max-width: 768px)': {}
};
