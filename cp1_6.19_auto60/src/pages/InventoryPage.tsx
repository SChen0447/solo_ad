import { useState, useEffect } from 'react';
import { useStore, Ingredient } from '../store/useStore';

const foodIcons = ['🍎', '🍊', '🍋', '🍇', '🍉', '🍓', '🍒', '🍑', '🥭', '🍍', '🥝', '🍅', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🥒', '🥬', '🥦', '🧄', '🧅', '🥜', '🌰', '🍞', '🥐', '🥖', '🧀', '🥚', '🍳', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🌮', '🌯', '🥙', '🧆', '🥚', '🍣', '🍱', '🍛', '🍜', '🍝', '🍠', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥛', '🍼', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🧃', '🥤', '🧉'];

function getFoodIcon(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % foodIcons.length;
  return foodIcons[idx];
}

const unitOptions = ['克', '毫升', '个', '片', '根', '勺', '茶匙', '杯', '千克', '升'];

interface AnimatedNumberProps {
  value: number;
}

function AnimatedNumber({ value }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (display === value) return;
    setAnimating(true);
    const start = display;
    const end = value;
    const duration = 300;
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.round(start + (end - start) * progress);
      setDisplay(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setAnimating(false);
      }
    }

    requestAnimationFrame(step);
  }, [value, display]);

  return (
    <span
      style={{
        display: 'inline-block',
        transition: 'transform 0.1s ease',
        transform: animating ? 'scale(1.15)' : 'scale(1)',
        color: '#F59E0B',
        fontWeight: 700,
        fontSize: '1.5rem',
        minWidth: '2ch',
        textAlign: 'center',
      }}
    >
      {display}
    </span>
  );
}

interface IngredientCardProps {
  ingredient: Ingredient;
}

function IngredientCard({ ingredient }: IngredientCardProps) {
  const { updateIngredient, removeIngredient } = useStore();
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [formData, setFormData] = useState({
    name: ingredient.name,
    amount: ingredient.amount,
    unit: ingredient.unit,
  });

  useEffect(() => {
    setFormData({
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
    });
  }, [ingredient]);

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/inventory/${ingredient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        updateIngredient(ingredient.id, formData);
        setEditing(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/inventory/${ingredient.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        removeIngredient(ingredient.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (editing) {
    return (
      <div
        style={{
          width: '100%',
          padding: '16px',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)',
          border: '2px solid #F59E0B',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="食材名称"
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              placeholder="数量"
              style={{ ...inputStyle, flex: 1 }}
            />
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              style={selectStyle}
            >
              {unitOptions.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              style={{ ...btnStyle, background: '#F59E0B', color: '#fff', flex: 1 }}
            >
              保存
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{ ...btnStyle, background: '#E5E7EB', flex: 1 }}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        height: 80,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.12)',
        padding: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          background: '#FFF7ED',
          borderRadius: 10,
          flexShrink: 0,
        }}
      >
        {getFoodIcon(ingredient.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: '#1F2937',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {ingredient.name}
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
          {ingredient.amount} {ingredient.unit}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 6,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      >
        <button
          onClick={() => setEditing(true)}
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            border: 'none',
            background: '#F59E0B',
            color: '#fff',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="编辑"
        >
          ✎
        </button>
        <button
          onClick={handleDelete}
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            border: 'none',
            background: '#EF4444',
            color: '#fff',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="删除"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #E5E7EB',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #E5E7EB',
  fontSize: 14,
  background: '#fff',
  outline: 'none',
};

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

export function InventoryPage() {
  const { inventory, addIngredient, setInventory } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number>(100);
  const [unit, setUnit] = useState('克');

  useEffect(() => {
    fetch('/api/inventory')
      .then((r) => r.json())
      .then((data) => setInventory(data))
      .catch(() => {});
  }, [setInventory]);

  const handleSubmit = async () => {
    if (!name.trim() || amount <= 0) return;
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), amount, unit }),
      });
      if (res.ok) {
        const newItem: Ingredient = await res.json();
        addIngredient(newItem);
        setName('');
        setAmount(100);
        setUnit('克');
        setShowForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalItems = inventory.length;

  return (
    <div style={{ padding: '20px 24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1F2937' }}>食材库存</h2>
          <div
            style={{
              background: '#FFF7ED',
              padding: '8px 16px',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: '#6B7280', fontSize: 14 }}>共</span>
            <AnimatedNumber value={totalItems} />
            <span style={{ color: '#6B7280', fontSize: 14 }}>种食材</span>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px',
            background: '#F59E0B',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
          }}
        >
          {showForm ? '✕ 取消' : '+ 添加食材'}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            background: '#fff',
            padding: 20,
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr auto',
              gap: 12,
              alignItems: 'center',
            }}
            className="inventory-form-grid"
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="食材名称，如：番茄"
              style={inputStyle}
            />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="数量"
              min={0}
              style={inputStyle}
            />
            <select value={unit} onChange={(e) => setUnit(e.target.value)} style={selectStyle}>
              {unitOptions.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <button
              onClick={handleSubmit}
              style={{
                padding: '10px 20px',
                background: '#F59E0B',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              添加
            </button>
          </div>
        </div>
      )}

      {inventory.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#9CA3AF',
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🥘</div>
          <p style={{ fontSize: 16 }}>还没有添加任何食材，点击上方按钮添加吧</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
          }}
          className="inventory-grid"
        >
          {inventory.map((item) => (
            <IngredientCard key={item.id} ingredient={item} />
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .inventory-grid { grid-template-columns: 1fr !important; }
          .inventory-form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
