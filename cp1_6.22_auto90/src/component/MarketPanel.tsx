import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { PlayerState, Weapon, WeaponType, WeaponQuality, MaterialType, MaterialStock, PriceRecord } from '../types';
import { MarketService } from '../service/MarketService';
import { getWeaponName, getQualityName, MATERIAL_NAMES, MATERIAL_ICONS } from '../utils/storage';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Props {
  playerState: PlayerState;
  onSellWeapon: (weaponId: string, price: number) => void;
  onBuyMaterial: (material: MaterialType, quantity: number, totalPrice: number) => void;
  getQualityColor: (q: WeaponQuality) => string;
}

const WEAPON_TYPES: WeaponType[] = ['sword', 'shield', 'helmet'];
const WEAPON_ICONS: Record<WeaponType, string> = {
  sword: '⚔️',
  shield: '🛡️',
  helmet: '⛑️',
  dragonbone_sword: '🗡️'
};

export default function MarketPanel({ playerState, onSellWeapon, onBuyMaterial, getQualityColor }: Props) {
  const [selectedType, setSelectedType] = useState<WeaponType>('sword');
  const [priceHistory, setPriceHistory] = useState<PriceRecord[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [materialStock, setMaterialStock] = useState<Record<MaterialType, MaterialStock> | null>(null);
  const [loading, setLoading] = useState(true);
  const [sellError, setSellError] = useState('');
  const [buyError, setBuyError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [history, materials] = await Promise.all([
          MarketService.fetchPriceHistory(selectedType),
          MarketService.fetchMaterials()
        ]);
        setPriceHistory(history.history);
        setCurrentPrice(history.currentPrice);
        setMaterialStock(materials);
      } catch {
        // use fallback data
        setPriceHistory([]);
        setCurrentPrice(100);
        setMaterialStock({
          iron_ingot: { stock: 50, price: 20, basePrice: 20 },
          charcoal: { stock: 80, price: 10, basePrice: 10 },
          leather: { stock: 40, price: 15, basePrice: 15 }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [selectedType]);

  const handleSell = async (weapon: Weapon) => {
    setSellError('');
    try {
      const result = await MarketService.sellWeapon(weapon.type, weapon.quality);
      if (result.success) {
        onSellWeapon(weapon.id, result.price);
        const history = await MarketService.fetchPriceHistory(selectedType);
        setPriceHistory(history.history);
        setCurrentPrice(history.currentPrice);
      }
    } catch (e) {
      setSellError(e instanceof Error ? e.message : '出售失败');
      setTimeout(() => setSellError(''), 2000);
    }
  };

  const handleBuy = async (material: MaterialType) => {
    setBuyError('');
    try {
      if (!materialStock) return;
      const price = materialStock[material].price;
      if (playerState.gold < price) {
        setBuyError('金币不足');
        setTimeout(() => setBuyError(''), 2000);
        return;
      }
      const result = await MarketService.buyMaterial(material, 1);
      if (result.success) {
        onBuyMaterial(material, result.quantity, result.totalPrice);
        const mats = await MarketService.fetchMaterials();
        setMaterialStock(mats);
      }
    } catch (e) {
      setBuyError(e instanceof Error ? e.message : '购买失败');
      setTimeout(() => setBuyError(''), 2000);
    }
  };

  const getEstimatedPrice = (weapon: Weapon): number => {
    const qualityMult = weapon.quality === 'high' ? 2.5 : weapon.quality === 'medium' ? 1.5 : 1;
    const base = selectedType === weapon.type ? currentPrice : (currentPrice * 0.9);
    return Math.round(base * qualityMult);
  };

  const chartData = {
    labels: priceHistory.slice(-20).map((_, i) => `${i + 1}`),
    datasets: [
      {
        label: '市场价格',
        data: priceHistory.slice(-20).map(h => h.price),
        borderColor: '#b8860b',
        backgroundColor: 'rgba(184, 134, 11, 0.1)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#d69e2e',
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        borderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#5c4033',
        titleColor: '#fefcda',
        bodyColor: '#fefcda',
        borderColor: '#b8860b',
        borderWidth: 1,
        padding: 8,
        titleFont: { family: 'Cinzel, serif', size: 12 },
        bodyFont: { family: 'Cinzel, serif', size: 12 },
        callbacks: {
          label: (ctx: { raw: unknown }) => `价格: ${ctx.raw} 金币`
        }
      }
    },
    scales: {
      x: {
        display: false
      },
      y: {
        grid: { color: 'rgba(92, 64, 51, 0.1)' },
        ticks: {
          color: '#5c4033',
          font: { family: 'Cinzel, serif', size: 10 },
          maxTicksLimit: 5
        }
      }
    },
    animation: {
      duration: 500,
      easing: 'easeOutQuart' as const
    }
  };

  const weaponsByType = playerState.inventory;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div className="section-title">📈 市场行情</div>
        <div className="type-tabs">
          {WEAPON_TYPES.map(type => (
            <div
              key={type}
              className={`type-tab ${selectedType === type ? 'active' : ''}`}
              onClick={() => setSelectedType(type)}
            >
              {WEAPON_ICONS[type]} {getWeaponName(type)}
            </div>
          ))}
        </div>
        {!loading && priceHistory.length > 0 && (
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
        <div className="price-row">
          <span>当前参考价:</span>
          <span className="price-value">💰 {currentPrice}</span>
        </div>
      </div>

      <div>
        <div className="section-title">⚔️ 我的武器库存</div>
        {weaponsByType.length === 0 ? (
          <div style={{ fontSize: 12, color: '#7a5a4a', fontStyle: 'italic', padding: '8px 4px' }}>
            暂无武器，快去锻造吧！
          </div>
        ) : (
          weaponsByType.map(weapon => (
            <div key={weapon.id} className="weapon-item">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="weapon-icon">{WEAPON_ICONS[weapon.type]}</span>
                <div className="weapon-info">
                  <div className="weapon-name">{weapon.name}</div>
                  <div className="weapon-quality" style={{ color: getQualityColor(weapon.quality) }}>
                    {getQualityName(weapon.quality)} · 预估 {getEstimatedPrice(weapon)}💰
                  </div>
                </div>
              </div>
              <button
                className="btn btn-gold"
                onClick={() => handleSell(weapon)}
                style={{ padding: '5px 10px', fontSize: 11 }}
              >
                出售
              </button>
            </div>
          ))
        )}
        {sellError && <div style={{ color: '#c53030', fontSize: 12, marginTop: 4 }}>{sellError}</div>}
      </div>

      <div>
        <div className="section-title">🛒 购买原材料</div>
        {materialStock && (Object.keys(materialStock) as MaterialType[]).map(mat => (
          <div key={mat} className="material-row">
            <div className="material-info">
              <span className="material-icon">{MATERIAL_ICONS[mat]}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{MATERIAL_NAMES[mat]}</div>
                <div className="material-stock">库存: {materialStock[mat].stock}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="price-value" style={{ fontSize: 13 }}>{materialStock[mat].price}💰</span>
              <button
                className="btn"
                onClick={() => handleBuy(mat)}
                disabled={playerState.gold < materialStock[mat].price || materialStock[mat].stock <= 0}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                购买
              </button>
            </div>
          </div>
        ))}
        {buyError && <div style={{ color: '#c53030', fontSize: 12, marginTop: 4 }}>{buyError}</div>}
      </div>
    </div>
  );
}
