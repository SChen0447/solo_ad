import React, { useState, useEffect } from 'react';
import { usePortfolio } from './hooks/usePortfolio';
import AccountPanel from './components/AccountPanel';
import RiskRadar from './components/RiskRadar';
import type { StockQuote } from './hooks/usePortfolio';

const NAV_ITEMS = [
  { id: 'overview', label: '总览', icon: '◉' },
  { id: 'accounts', label: '资产账户', icon: '▤' },
  { id: 'transactions', label: '交易记录', icon: '↔' },
  { id: 'risk', label: '风险评估', icon: '◎' },
  { id: 'market', label: '实时行情', icon: '〰' },
];

export default function App() {
  const [activeNav, setActiveNav] = useState('overview');
  const [isMobile, setIsMobile] = useState(false);
  const { accounts, transactions, marketQuotes, riskData, loading, addAccount, addTransaction } = usePortfolio();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalAssets = accounts.reduce((s, a) => s + a.balance, 0);
  const totalProfit = transactions.reduce((s, t) => s + t.profitLoss, 0);

  const renderContent = () => {
    switch (activeNav) {
      case 'overview':
        return (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#0F172A', borderRadius: '12px', padding: '20px' }}>
                <div style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>总资产</div>
                <div className="value-pulse" style={{ fontSize: '28px', fontWeight: 700, color: '#10B981' }}>
                  ¥{totalAssets.toLocaleString()}
                </div>
              </div>
              <div style={{ background: '#0F172A', borderRadius: '12px', padding: '20px' }}>
                <div style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>账户数量</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#3B82F6' }}>{accounts.length}</div>
              </div>
              <div style={{ background: '#0F172A', borderRadius: '12px', padding: '20px' }}>
                <div style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>持仓盈亏</div>
                <div className="value-pulse" style={{ fontSize: '28px', fontWeight: 700, color: totalProfit >= 0 ? '#10B981' : '#EF4444' }}>
                  {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
                </div>
              </div>
              <div style={{ background: '#0F172A', borderRadius: '12px', padding: '20px' }}>
                <div style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>交易笔数</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#8B5CF6' }}>{transactions.length}</div>
              </div>
            </div>
            <AccountPanel
              accounts={accounts}
              transactions={transactions}
              onAddAccount={addAccount}
              onAddTransaction={addTransaction}
            />
          </div>
        );
      case 'accounts':
        return (
          <AccountPanel
            accounts={accounts}
            transactions={[]}
            onAddAccount={addAccount}
            onAddTransaction={addTransaction}
          />
        );
      case 'transactions':
        return (
          <AccountPanel
            accounts={accounts}
            transactions={transactions}
            onAddAccount={addAccount}
            onAddTransaction={addTransaction}
          />
        );
      case 'risk':
        return riskData ? (
          <RiskRadar
            data={riskData.radar}
            sharpeRatio={riskData.sharpeRatio}
            maxDrawdown={riskData.maxDrawdown}
            volatility={riskData.volatility}
            concentration={riskData.concentration}
          />
        ) : (
          <div style={{ color: '#94A3B8', textAlign: 'center', padding: '48px' }}>加载风险评估数据...</div>
        );
      case 'market':
        return <MarketPanel quotes={marketQuotes} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0F172A' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { color: #FBBF24; }
          100% { color: inherit; }
        }
        @keyframes floatUp {
          0% { transform: translateY(2px); }
          50% { transform: translateY(-2px); }
          100% { transform: translateY(0); }
        }
        @keyframes floatDown {
          0% { transform: translateY(-2px); }
          50% { transform: translateY(2px); }
          100% { transform: translateY(0); }
        }
        .value-pulse {
          animation: pulse 0.6s ease-in-out;
        }
        .float-up {
          animation: floatUp 0.3s ease-in-out;
        }
        .float-down {
          animation: floatDown 0.3s ease-in-out;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1E293B; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>

      {!isMobile && (
        <nav style={{
          width: '240px',
          minWidth: '240px',
          background: '#0F172A',
          borderRight: '1px solid #1E293B',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '16px 12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#FFF' }}>
              P
            </div>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#F1F5F9' }}>投资组合</span>
          </div>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              style={{
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                background: activeNav === item.id ? '#1E293B' : 'transparent',
                position: 'relative',
                color: activeNav === item.id ? '#F1F5F9' : '#94A3B8',
                marginBottom: '4px',
              }}
            >
              {activeNav === item.id && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '12px',
                  width: '4px',
                  height: '24px',
                  background: '#3B82F6',
                  borderRadius: '0 2px 2px 0',
                }} />
              )}
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <span style={{ fontSize: '14px', fontWeight: activeNav === item.id ? 500 : 400 }}>{item.label}</span>
            </div>
          ))}
        </nav>
      )}

      <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '24px' }}>
        {isMobile && (
          <div style={{
            display: 'flex',
            overflowX: 'auto',
            gap: '4px',
            marginBottom: '16px',
            padding: '4px',
            background: '#1E293B',
            borderRadius: '8px',
          }}>
            {NAV_ITEMS.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  fontWeight: activeNav === item.id ? 600 : 400,
                  background: activeNav === item.id ? '#3B82F6' : 'transparent',
                  color: activeNav === item.id ? '#FFF' : '#94A3B8',
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        )}

        <div style={{
          background: '#1E293B',
          borderRadius: '16px',
          padding: '24px',
          minHeight: 'calc(100vh - 80px)',
          animation: 'fadeIn 0.5s ease-in-out',
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '64px', color: '#94A3B8' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>◉</div>
              <div>加载中...</div>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </main>
    </div>
  );
}

function MarketPanel({ quotes }: { quotes: StockQuote[] }) {
  return (
    <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#F1F5F9', marginBottom: '20px' }}>实时行情</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
        {quotes.map((q) => {
          const isUp = q.changePercent >= 0;
          return (
            <div
              key={q.symbol}
              style={{
                background: '#0F172A',
                borderRadius: '10px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                borderLeft: `3px solid ${isUp ? '#10B981' : '#EF4444'}`,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '15px' }}>{q.symbol}</span>
                <span style={{ fontSize: '11px', color: '#64748B' }}>{q.name}</span>
              </div>
              <div className="value-pulse" style={{ fontSize: '20px', fontWeight: 700, color: isUp ? '#10B981' : '#EF4444', marginBottom: '4px' }}>
                ${q.price.toFixed(2)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: isUp ? '#10B981' : '#EF4444' }}>
                  {isUp ? '+' : ''}{q.changePercent.toFixed(2)}%
                </span>
                <span style={{ fontSize: '11px', color: '#475569' }}>
                  Vol: {(q.volume / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
