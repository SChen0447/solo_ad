import { useState, useEffect } from 'react';
import type { Ingredient, ReorderData } from '../App';

interface Props {
  ingredients: Ingredient[];
}

function ReorderSuggestions(_props: Props) {
  const [data, setData] = useState<ReorderData>({ suggestions: [], totalEstimated: 0 });
  const [loading, setLoading] = useState(true);

  const fetchReorder = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reorder');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch reorder:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReorder();
    const interval = setInterval(fetchReorder, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateOrder = () => {
    if (data.suggestions.length === 0) {
      alert('暂无需要采购的食材');
      return;
    }
    const lines: string[] = [];
    lines.push('========== 采购清单 ==========');
    lines.push(`生成时间：${new Date().toLocaleString('zh-CN')}`);
    lines.push('');
    lines.push('采购明细：');
    lines.push('----------------------------------------');
    data.suggestions.forEach((s, idx) => {
      lines.push(
        `${idx + 1}. ${s.emoji} ${s.name}  ` +
        `采购量：${s.reorderAmount}${s.unit}  ` +
        `单价：¥${s.unitPrice.toFixed(2)}/${s.unit}  ` +
        `小计：¥${s.estimatedCost.toFixed(2)}`
      );
    });
    lines.push('----------------------------------------');
    lines.push(`预估总金额：¥${data.totalEstimated.toFixed(2)}`);
    lines.push('');
    lines.push('当前库存状况：');
    data.suggestions.forEach(s => {
      lines.push(`  ${s.emoji} ${s.name}：当前 ${s.currentStock}${s.unit}，预警 ${s.minStock}${s.unit}`);
    });
    lines.push('========================================');

    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `采购清单_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⏳</div>
        <div className="empty-text">加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {data.suggestions.length === 0 ? (
        <div style={{ flex: 1 }}>
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <div className="empty-text">所有食材库存充足，无需采购</div>
          </div>
        </div>
      ) : (
        <>
          <div className="reorder-list" style={{ flex: 1 }}>
            {data.suggestions.map(s => {
              const shortagePct = Math.round((s.shortage / s.minStock) * 100);
              return (
                <div key={s.id} className="reorder-card">
                  <div className="reorder-emoji">{s.emoji}</div>
                  <div className="reorder-info">
                    <div className="reorder-name">{s.name}</div>
                    <div className="reorder-detail">
                      当前：{s.currentStock}{s.unit} / 预警：{s.minStock}{s.unit}
                      <br />
                      <span style={{ color: '#d48806' }}>
                        缺口 {s.shortage}{s.unit}（{shortagePct}%）
                      </span>
                      <br />
                      建议采购：
                      <span className="reorder-amount">
                        {s.reorderAmount}{s.unit}
                      </span>
                    </div>
                    <div className="reorder-cost">
                      预估 ¥{s.estimatedCost.toFixed(2)}
                      <span style={{ color: '#999', fontWeight: 400, fontSize: 11, marginLeft: 4 }}>
                        (¥{s.unitPrice.toFixed(2)}/{s.unit})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="reorder-summary">
        <div className="summary-row">
          <span className="summary-label">缺货食材</span>
          <span className="summary-value">{data.suggestions.length} 种</span>
        </div>
        <div className="summary-row">
          <span className="summary-total-label">预估总金额</span>
          <span className="summary-total-value">¥{data.totalEstimated.toFixed(2)}</span>
        </div>
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 8, padding: '12px', fontSize: 15 }}
          onClick={handleGenerateOrder}
          disabled={data.suggestions.length === 0}
        >
          📋 生成采购单
        </button>
      </div>
    </div>
  );
}

export default ReorderSuggestions;
