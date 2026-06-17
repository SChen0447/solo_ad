import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart,
} from 'recharts';

interface HistoryItem {
  date: string;
  quantity: number;
}

interface ForecastItem {
  date: string;
  predicted: number;
}

interface ForecastData {
  sku_id: string;
  sku_name: string;
  history: HistoryItem[];
  forecast: ForecastItem[];
  total_inventory: number;
  daily_avg: number;
  alert: boolean;
  alert_message: string | null;
}

interface SkuOption {
  id: string;
  name: string;
}

const Forecast: React.FC = () => {
  const [skuList, setSkuList] = useState<SkuOption[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('/api/forecast/skus').then((res) => {
      const skus: SkuOption[] = res.data.skus || [];
      setSkuList(skus);
      if (skus.length > 0) {
        setSelectedSku(skus[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedSku) return;
    setLoading(true);
    const timer = setTimeout(() => {
      axios.get('/api/forecast/', { params: { sku_id: selectedSku } }).then((res) => {
        setForecastData(res.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedSku]);

  const chartData = forecastData
    ? [
        ...forecastData.history.map((h) => ({
          date: h.date.slice(5),
          actual: h.quantity,
          predicted: null as number | null,
        })),
        ...forecastData.forecast.map((f) => ({
          date: f.date.slice(5),
          actual: null as number | null,
          predicted: f.predicted,
        })),
      ]
    : [];

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ color: '#0f4c81', margin: 0 }}>需求预测</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#666' }}>选择SKU：</label>
          <select
            value={selectedSku}
            onChange={(e) => setSelectedSku(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #d0d5dd',
              fontSize: 13,
              minWidth: 160,
            }}
          >
            {skuList.map((sku) => (
              <option key={sku.id} value={sku.id}>{sku.name}</option>
            ))}
          </select>
        </div>
      </div>

      {forecastData && forecastData.alert && forecastData.alert_message && (
        <div style={{
          background: '#fdecea',
          color: '#e74c3c',
          padding: '12px 20px',
          borderRadius: 8,
          marginBottom: 20,
          fontSize: 13,
          fontWeight: 600,
          borderLeft: '4px solid #e74c3c',
        }}>
          ⚠️ {forecastData.alert_message}
        </div>
      )}

      {forecastData && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 10,
            padding: 20,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>当前总库存</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f4c81' }}>{forecastData.total_inventory}</div>
          </div>
          <div style={{
            background: '#fff',
            borderRadius: 10,
            padding: 20,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>日均销量（7日移动平均）</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#f07b3f' }}>{forecastData.daily_avg}</div>
          </div>
          <div style={{
            background: '#fff',
            borderRadius: 10,
            padding: 20,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>预测7天需求</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: forecastData.alert ? '#e74c3c' : '#27ae60' }}>
              {Math.round(forecastData.daily_avg * 7)}
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <h3 style={{ color: '#0f4c81', marginBottom: 16 }}>
          {forecastData ? `${forecastData.sku_name} - 销量与预测` : '销量与预测'}
        </h3>
        {loading ? (
          <div style={{ height: 350, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', color: '#999' }}>
              <div style={{
                width: 40,
                height: 40,
                border: '3px solid #e8ecf1',
                borderTopColor: '#0f4c81',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 12px',
              }} />
              计算预测中...
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" fontSize={11} tick={{ fill: '#888' }} />
              <YAxis fontSize={11} tick={{ fill: '#888' }} />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #e8ecf1',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="actual"
                name="实际销量"
                fill="#0f4c81"
                radius={[4, 4, 0, 0]}
                barSize={14}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                name="预测需求"
                stroke="#f07b3f"
                strokeWidth={2}
                dot={{ fill: '#f07b3f', r: 3 }}
                strokeDasharray="5 5"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 20,
        marginTop: 20,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        fontSize: 13,
        color: '#666',
      }}>
        <h4 style={{ color: '#0f4c81', marginBottom: 8 }}>预测说明</h4>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
          <li>预测方法：7日移动平均法，取近7天实际销量的平均值作为未来每天的需求预测</li>
          <li>柱状图（蓝色）：过去30天的实际日销量</li>
          <li>折线图（橙色虚线）：未来7天的日需求预测值</li>
          <li>当预测7天需求 &gt; 当前库存的1.5倍时，系统将触发预警横幅</li>
        </ul>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default Forecast;
