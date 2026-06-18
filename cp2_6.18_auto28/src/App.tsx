import { useState } from 'react'
import AssetForm from './components/AssetForm'
import ChartPanel from './components/ChartPanel'

export interface Asset {
  id: string
  date: string
  category: string
  name: string
  value: number
}

const defaultAssets: Asset[] = [
  { id: '1', date: '2026-06-01', category: '现金', name: '银行存款', value: 150000 },
  { id: '2', date: '2026-06-01', category: '股票', name: '贵州茅台', value: 180000 },
  { id: '3', date: '2026-06-01', category: '股票', name: '腾讯控股', value: 120000 },
  { id: '4', date: '2026-06-01', category: '基金', name: '沪深300ETF', value: 80000 },
  { id: '5', date: '2026-06-01', category: '基金', name: '纳指ETF', value: 60000 },
  { id: '6', date: '2026-06-01', category: '加密货币', name: 'BTC', value: 250000 },
  { id: '7', date: '2026-06-15', category: '现金', name: '银行存款', value: 160000 },
  { id: '8', date: '2026-06-15', category: '股票', name: '贵州茅台', value: 195000 },
  { id: '9', date: '2026-06-15', category: '股票', name: '腾讯控股', value: 130000 },
  { id: '10', date: '2026-06-15', category: '基金', name: '沪深300ETF', value: 85000 },
  { id: '11', date: '2026-06-15', category: '基金', name: '纳指ETF', value: 65000 },
  { id: '12', date: '2026-06-15', category: '加密货币', name: 'BTC', value: 280000 },
  { id: '13', date: '2026-06-18', category: '现金', name: '银行存款', value: 165000 },
  { id: '14', date: '2026-06-18', category: '股票', name: '贵州茅台', value: 210000 },
  { id: '15', date: '2026-06-18', category: '股票', name: '腾讯控股', value: 145000 },
  { id: '16', date: '2026-06-18', category: '基金', name: '沪深300ETF', value: 92000 },
  { id: '17', date: '2026-06-18', category: '基金', name: '纳指ETF', value: 72000 },
  { id: '18', date: '2026-06-18', category: '加密货币', name: 'BTC', value: 320000 },
]

export default function App() {
  const [assets, setAssets] = useState<Asset[]>(defaultAssets)

  const handleAddAsset = (newAsset: Omit<Asset, 'id'>) => {
    const asset: Asset = {
      ...newAsset,
      id: Date.now().toString(),
    }
    setAssets((prev) => [...prev, asset])
  }

  const handleDeleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id))
  }

  const getLatestDateNetWorth = () => {
    if (assets.length === 0) return { netWorth: 0, change: 0, prevNetWorth: 0 }
    const dates = Array.from(new Set(assets.map((a) => a.date))).sort()
    if (dates.length === 0) return { netWorth: 0, change: 0, prevNetWorth: 0 }
    const latestDate = dates[dates.length - 1]
    const latestNetWorth = assets
      .filter((a) => a.date === latestDate)
      .reduce((sum, a) => sum + a.value, 0)
    let prevNetWorth = 0
    if (dates.length >= 2) {
      const prevDate = dates[dates.length - 2]
      prevNetWorth = assets
        .filter((a) => a.date === prevDate)
        .reduce((sum, a) => sum + a.value, 0)
    }
    const change = prevNetWorth > 0 ? ((latestNetWorth - prevNetWorth) / prevNetWorth) * 100 : 0
    return { netWorth: latestNetWorth, change, prevNetWorth }
  }

  const { netWorth, change } = getLatestDateNetWorth()

  const formatCurrency = (value: number) => {
    return value.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const getCategoryClass = (category: string) => {
    switch (category) {
      case '现金':
        return 'category-cash'
      case '股票':
        return 'category-stock'
      case '基金':
        return 'category-fund'
      case '加密货币':
        return 'category-crypto'
      default:
        return 'category-custom'
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>个人资产快照记录仪</h1>
      </header>

      <div className="dashboard">
        <div className="summary-card">
          <div className="summary-info">
            <span className="summary-label">总资产净值 (CNY)</span>
            <span className="summary-value">¥ {formatCurrency(netWorth)}</span>
          </div>
          <div className={`summary-change ${change >= 0 ? 'positive' : 'negative'}`}>
            {change >= 0 ? (
              <span className="arrow-up">▲</span>
            ) : (
              <span className="arrow-down">▼</span>
            )}
            {change >= 0 ? '+' : ''}
            {change.toFixed(2)}% 较上次
          </div>
        </div>

        <div className="charts-row">
          <ChartPanel assets={assets} />
        </div>

        <AssetForm onAdd={handleAddAsset} />

        <div className="records-list">
          <h3>资产记录列表</h3>
          {assets.length === 0 ? (
            <div className="empty-state">暂无资产记录，请添加您的第一条记录</div>
          ) : (
            <table className="records-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>类别</th>
                  <th>资产名称</th>
                  <th>市值 (CNY)</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {[...assets]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((asset) => (
                    <tr key={asset.id}>
                      <td>{asset.date}</td>
                      <td>
                        <span className={`category-badge ${getCategoryClass(asset.category)}`}>
                          {asset.category}
                        </span>
                      </td>
                      <td>{asset.name}</td>
                      <td>¥ {formatCurrency(asset.value)}</td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteAsset(asset.id)}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
