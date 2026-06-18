import { useState } from 'react';
import { usePetStore } from '../store/petStore';

interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  effect: 'hunger' | 'hygiene' | 'happiness';
  value: number;
  price: number;
  description: string;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'premium-food',
    name: '高级饲料',
    emoji: '🍖',
    effect: 'hunger',
    value: 30,
    price: 10,
    description: '恢复饥饿度30',
  },
  {
    id: 'cleaning-kit',
    name: '清洁套装',
    emoji: '🧹',
    effect: 'hygiene',
    value: 25,
    price: 8,
    description: '恢复清洁度25',
  },
  {
    id: 'fun-toy',
    name: '趣味玩具',
    emoji: '🎾',
    effect: 'happiness',
    value: 20,
    price: 5,
    description: '恢复快乐度20',
  },
];

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ textAlign: 'center', width: '340px' }}
      >
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🛒</div>
        <p style={{
          fontSize: '16px',
          color: '#4a3728',
          marginBottom: '24px',
          fontWeight: 600,
        }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              height: '40px',
              background: '#ecf0f1',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: '#7f8c8d',
            }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              height: '40px',
              background: '#2ecc71',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: '#fff',
            }}
          >
            确认购买
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div
      className="toast-pop-up"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: '#27ae60',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 600,
        zIndex: 3000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      ✅ {message}
    </div>
  );
}

export default function Store() {
  const { coins, inventory, buyItem } = usePetStore();
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleBuy = (item: ShopItem) => {
    if (coins < item.price) return;
    setConfirmItem(item);
  };

  const confirmBuy = async () => {
    if (!confirmItem) return;
    await buyItem(confirmItem.id);
    setConfirmItem(null);
    setToast(`成功购买${confirmItem.name}！`);
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div>
      <h1 style={{
        fontSize: '28px',
        fontWeight: 700,
        color: '#4a3728',
        marginBottom: '24px',
        marginTop: '40px',
      }}>
        🏪 宠物商店
      </h1>

      <div style={{
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap',
      }}>
        {SHOP_ITEMS.map((item) => {
          const inv = inventory.find((i) => i.id === item.id);
          const canAfford = coins >= item.price;
          return (
            <div key={item.id} className="shop-card">
              <div style={{ padding: '20px', position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#f1c40f',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  💰 {item.price}
                </div>
                <div style={{
                  fontSize: '48px',
                  textAlign: 'center',
                  margin: '16px 0 12px',
                }}>
                  {item.emoji}
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#4a3728',
                  textAlign: 'center',
                  marginBottom: '8px',
                }}>
                  {item.name}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#999',
                  textAlign: 'center',
                  marginBottom: '8px',
                }}>
                  {item.description}
                </div>
                {inv && inv.quantity > 0 && (
                  <div style={{
                    fontSize: '12px',
                    color: '#27ae60',
                    textAlign: 'center',
                    fontWeight: 600,
                  }}>
                    已拥有 ×{inv.quantity}
                  </div>
                )}
              </div>
              <button
                className="buy-btn"
                disabled={!canAfford}
                onClick={() => handleBuy(item)}
              >
                {canAfford ? '购买' : '金币不足'}
              </button>
            </div>
          );
        })}
      </div>

      {confirmItem && (
        <ConfirmDialog
          message={`确认购买${confirmItem.name}吗？`}
          onConfirm={confirmBuy}
          onCancel={() => setConfirmItem(null)}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}
