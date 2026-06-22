import React, { useState } from 'react';
import type { Account, Transaction } from '../hooks/usePortfolio';

interface AccountPanelProps {
  accounts: Account[];
  transactions: Transaction[];
  onAddAccount: (account: { name: string; type: 'savings' | 'stock' | 'fund'; initialAmount: number }) => void;
  onAddTransaction: (tx: { accountId: string; symbol: string; type: 'buy' | 'sell'; quantity: number; price: number; date: string }) => void;
}

const TYPE_COLORS: Record<string, string> = {
  savings: '#10B981',
  stock: '#3B82F6',
  fund: '#8B5CF6',
};

const TYPE_LABELS: Record<string, string> = {
  savings: '储蓄账户',
  stock: '股票账户',
  fund: '基金账户',
};

export default function AccountPanel({ accounts, transactions, onAddAccount, onAddTransaction }: AccountPanelProps) {
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'stock' as 'savings' | 'stock' | 'fund', initialAmount: 0 });
  const [newTx, setNewTx] = useState({ accountId: '', symbol: '', type: 'buy' as 'buy' | 'sell', quantity: 0, price: 0, date: '' });

  const handleAddAccount = () => {
    if (!newAccount.name || newAccount.initialAmount <= 0) return;
    onAddAccount(newAccount);
    setNewAccount({ name: '', type: 'stock', initialAmount: 0 });
    setShowAccountModal(false);
  };

  const handleAddTransaction = () => {
    if (!newTx.accountId || !newTx.symbol || newTx.quantity <= 0 || newTx.price <= 0 || !newTx.date) return;
    onAddTransaction(newTx);
    setNewTx({ accountId: '', symbol: '', type: 'buy', quantity: 0, price: 0, date: '' });
    setShowTxModal(false);
  };

  const stockAccounts = accounts.filter((a) => a.type === 'stock');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#F1F5F9' }}>资产账户</h2>
        <button
          onClick={() => setShowAccountModal(true)}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: '#10B981',
            color: '#FFF',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease-in-out',
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = 'scale(1.02)'; (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = 'scale(1)'; (e.target as HTMLElement).style.boxShadow = 'none'; }}
        >
          +
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', animation: 'fadeIn 0.5s ease-in-out' }}>
        <thead>
          <tr style={{ height: '40px', color: '#94A3B8', fontSize: '13px', textAlign: 'left', borderBottom: '1px solid #334155' }}>
            <th style={{ paddingLeft: '16px' }}>账户名称</th>
            <th>类型</th>
            <th>初始金额</th>
            <th>当前余额</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account, index) => (
            <tr
              key={account.id}
              style={{
                height: '48px',
                background: index % 2 === 0 ? '#F9FAFB' : '#FFFFFF',
                transition: 'background 0.2s ease-in-out',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = index % 2 === 0 ? '#F9FAFB' : '#FFFFFF'; }}
            >
              <td style={{ paddingLeft: '0', position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '12px',
                  width: '8px',
                  height: '24px',
                  background: TYPE_COLORS[account.type],
                  borderRadius: '0 2px 2px 0',
                }} />
                <span style={{ paddingLeft: '16px', color: '#1E293B', fontWeight: 500 }}>{account.name}</span>
              </td>
              <td style={{ color: '#64748B' }}>{TYPE_LABELS[account.type]}</td>
              <td style={{ color: '#475569' }}>¥{account.initialAmount.toLocaleString()}</td>
              <td>
                <span className="value-pulse" style={{ color: '#1E293B', fontWeight: 600 }}>
                  ¥{account.balance.toLocaleString()}
                </span>
              </td>
            </tr>
          ))}
          {accounts.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                暂无账户，点击右上角添加
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#F1F5F9' }}>交易记录</h2>
          {stockAccounts.length > 0 && (
            <button
              onClick={() => {
                setNewTx((prev) => ({ ...prev, accountId: stockAccounts[0].id }));
                setShowTxModal(true);
              }}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                background: '#3B82F6',
                color: '#FFF',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = 'scale(1.02)'; (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = 'scale(1)'; (e.target as HTMLElement).style.boxShadow = 'none'; }}
            >
              + 添加交易
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', animation: 'fadeIn 0.5s ease-in-out' }}>
          {transactions.map((tx) => {
            const isPositive = tx.profitLoss >= 0;
            return (
              <div
                key={tx.id}
                style={{
                  width: '360px',
                  height: '100px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '6px',
                  height: '100%',
                  background: isPositive ? '#10B981' : '#EF4444',
                }} />
                <div style={{ padding: '12px 12px 12px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#1E293B', fontSize: '15px' }}>{tx.symbol}</span>
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>{tx.type === 'buy' ? '买入' : '卖出'} × {tx.quantity}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      成交价 <span style={{ color: '#475569' }}>¥{tx.price}</span>
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      市价 <span className="value-pulse" style={{ color: '#475569' }}>¥{tx.currentPrice}</span>
                    </span>
                    <span
                      className={isPositive ? 'float-up' : 'float-down'}
                      style={{
                        fontWeight: 600,
                        fontSize: '14px',
                        color: isPositive ? '#10B981' : '#EF4444',
                        animation: isPositive ? 'floatUp 0.3s ease-in-out' : 'floatDown 0.3s ease-in-out',
                      }}
                    >
                      {isPositive ? '+' : ''}{tx.profitLoss.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <div style={{ color: '#94A3B8', padding: '32px', textAlign: 'center', width: '100%' }}>
              暂无交易记录
            </div>
          )}
        </div>
      </div>

      {showAccountModal && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowAccountModal(false)}
        >
          <div
            style={{ width: '420px', borderRadius: '12px', background: '#1E293B', padding: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: '#F1F5F9', marginBottom: '20px', fontSize: '18px' }}>添加账户</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '6px' }}>账户名称</label>
              <input
                value={newAccount.name}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, name: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#F1F5F9', fontSize: '14px', outline: 'none' }}
                placeholder="请输入账户名称"
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '6px' }}>账户类型</label>
              <select
                value={newAccount.type}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, type: e.target.value as 'savings' | 'stock' | 'fund' }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#F1F5F9', fontSize: '14px', outline: 'none' }}
              >
                <option value="savings">储蓄账户</option>
                <option value="stock">股票账户</option>
                <option value="fund">基金账户</option>
              </select>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '6px' }}>初始金额</label>
              <input
                type="number"
                value={newAccount.initialAmount || ''}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, initialAmount: Number(e.target.value) }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#F1F5F9', fontSize: '14px', outline: 'none' }}
                placeholder="请输入初始金额"
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAccountModal(false)}
                style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94A3B8', cursor: 'pointer', fontSize: '14px' }}
              >
                取消
              </button>
              <button
                onClick={handleAddAccount}
                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#10B981', color: '#FFF', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s ease-in-out' }}
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {showTxModal && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowTxModal(false)}
        >
          <div
            style={{ width: '420px', borderRadius: '12px', background: '#1E293B', padding: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: '#F1F5F9', marginBottom: '20px', fontSize: '18px' }}>添加交易</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '6px' }}>关联股票账户</label>
              <select
                value={newTx.accountId}
                onChange={(e) => setNewTx((prev) => ({ ...prev, accountId: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#F1F5F9', fontSize: '14px', outline: 'none' }}
              >
                <option value="">请选择账户</option>
                {stockAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '6px' }}>交易类型</label>
              <select
                value={newTx.type}
                onChange={(e) => setNewTx((prev) => ({ ...prev, type: e.target.value as 'buy' | 'sell' }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#F1F5F9', fontSize: '14px', outline: 'none' }}
              >
                <option value="buy">买入</option>
                <option value="sell">卖出</option>
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '6px' }}>股票代码</label>
              <input
                value={newTx.symbol}
                onChange={(e) => setNewTx((prev) => ({ ...prev, symbol: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#F1F5F9', fontSize: '14px', outline: 'none' }}
                placeholder="如 AAPL"
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '6px' }}>数量</label>
                <input
                  type="number"
                  value={newTx.quantity || ''}
                  onChange={(e) => setNewTx((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#F1F5F9', fontSize: '14px', outline: 'none' }}
                  placeholder="股数"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '6px' }}>成交价</label>
                <input
                  type="number"
                  value={newTx.price || ''}
                  onChange={(e) => setNewTx((prev) => ({ ...prev, price: Number(e.target.value) }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#F1F5F9', fontSize: '14px', outline: 'none' }}
                  placeholder="单价"
                />
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '6px' }}>交易日期</label>
              <input
                type="date"
                value={newTx.date}
                onChange={(e) => setNewTx((prev) => ({ ...prev, date: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#F1F5F9', fontSize: '14px', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowTxModal(false)}
                style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94A3B8', cursor: 'pointer', fontSize: '14px' }}
              >
                取消
              </button>
              <button
                onClick={handleAddTransaction}
                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#3B82F6', color: '#FFF', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s ease-in-out' }}
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
