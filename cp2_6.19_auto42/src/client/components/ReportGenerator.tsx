import React, { useState } from 'react';
import { ExperimentInfo } from '../App';

interface Props {
  experimentId: string;
  experiment: ExperimentInfo;
}

interface StepWithRecords {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  expectedResult: string;
  actualResult: string;
  completed: boolean;
  attachments: { id: string; filename: string; originalName: string; mimetype: string; path: string }[];
  records: {
    id: string;
    type: string;
    label: string;
    value: string;
    enumOptions?: string[];
    recordedAt: string;
  }[];
}

function DnaHelixAnimation() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 16, padding: 40,
    }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ animation: 'dnaSpin 1.5s linear infinite' }}>
        <defs>
          <style>{`@keyframes dnaSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </defs>
        <path d="M20,10 Q40,25 60,10 Q40,25 20,40 Q40,55 60,40 Q40,55 20,70 Q40,85 60,70"
          fill="none" stroke="#FFB300" strokeWidth="2.5" opacity="0.8" />
        <path d="M60,10 Q40,25 20,10 Q40,25 60,40 Q40,55 20,40 Q40,55 60,70 Q40,85 20,70"
          fill="none" stroke="#42A5F5" strokeWidth="2.5" opacity="0.8" />
        {[10, 25, 40, 55, 70].map((y, i) => (
          <line key={i} x1={i % 2 === 0 ? 20 : 60} y1={y} x2={i % 2 === 0 ? 60 : 20} y2={y}
            stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3 2" />
        ))}
      </svg>
      <div style={{ fontSize: 13, color: '#B0AAC8' }}>正在生成报告...</div>
    </div>
  );
}

function generateSvgChart(data: { time: string; value: number }[]): string {
  const W = 500;
  const H = 200;
  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const rangeV = maxV - minV || 1;

  const points = data.map((d, i) => ({
    x: pad.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2),
    y: pad.top + plotH - ((d.value - minV) / rangeV) * plotH,
  }));

  let pathD = `M ${points[0].x} ${points[0].y}`;
  if (points.length >= 2) {
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
  }

  const yTicks = 5;
  let yTickLines = '';
  for (let i = 0; i < yTicks; i++) {
    const v = minV + (rangeV / (yTicks - 1)) * i;
    const y = pad.top + plotH - ((v - minV) / rangeV) * plotH;
    yTickLines += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="rgba(0,0,0,0.08)" />`;
    yTickLines += `<text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" fill="#666" font-size="10">${v.toFixed(1)}</text>`;
  }

  let xTickLines = '';
  data.forEach((d, i) => {
    const x = pad.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
    const t = new Date(d.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    xTickLines += `<text x="${x}" y="${H - 6}" text-anchor="middle" fill="#999" font-size="9">${t}</text>`;
  });

  let circles = '';
  points.forEach((p) => {
    circles += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#FFB300" stroke="#fff" stroke-width="1.5" />`;
  });

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="font-family:sans-serif">
    ${yTickLines}
    ${xTickLines}
    <path d="${pathD}" fill="none" stroke="#FFB300" stroke-width="2" />
    ${circles}
  </svg>`;
}

function buildHtmlReport(
  experiment: ExperimentInfo,
  steps: StepWithRecords[],
  conclusion: string,
): string {
  const numericAnalysis: Record<string, { label: string; values: number[]; avg: number; max: number; min: number }> = {};

  steps.forEach((step) => {
    step.records.forEach((r) => {
      if (r.type === 'numeric' && r.value) {
        const v = parseFloat(r.value);
        if (!isNaN(v)) {
          if (!numericAnalysis[step.id]) {
            numericAnalysis[step.id] = { label: step.name, values: [], avg: 0, max: 0, min: 0 };
          }
          numericAnalysis[step.id].values.push(v);
        }
      }
    });
  });

  Object.values(numericAnalysis).forEach((a) => {
    if (a.values.length > 0) {
      a.avg = a.values.reduce((s, v) => s + v, 0) / a.values.length;
      a.max = Math.max(...a.values);
      a.min = Math.min(...a.values);
    }
  });

  let tocItems = steps.map((s, i) => `<li style="margin:6px 0"><a href="#step-${i}" style="color:#2A2355;text-decoration:none;border-bottom:1px solid transparent;transition:border 0.2s" onmouseover="this.style.borderBottomColor='#2A2355'" onmouseout="this.style.borderBottomColor='transparent'">${s.name}</a></li>`).join('\n');

  if (Object.keys(numericAnalysis).length > 0) {
    tocItems += `<li style="margin:6px 0"><a href="#analysis" style="color:#2A2355;text-decoration:none;border-bottom:1px solid transparent;transition:border 0.2s" onmouseover="this.style.borderBottomColor='#2A2355'" onmouseout="this.style.borderBottomColor='transparent'">数据分析小结</a></li>`;
  }
  tocItems += `<li style="margin:6px 0"><a href="#conclusion" style="color:#2A2355;text-decoration:none;border-bottom:1px solid transparent;transition:border 0.2s" onmouseover="this.style.borderBottomColor='#2A2355'" onmouseout="this.style.borderBottomColor='transparent'">结论</a></li>`;

  let stepsHtml = steps.map((step, i) => {
    let recordsTable = '';
    if (step.records.length > 0) {
      const rows = step.records.map((r) => {
        let valCell = r.value;
        if (r.type === 'boolean') {
          valCell = `<span style="color:${r.value === 'true' ? '#4CAF50' : '#E53935'};font-weight:600">${r.value.toUpperCase()}</span>`;
        }
        if (r.type === 'enum' && r.enumOptions) {
          valCell = r.value + ` <span style="color:#999;font-size:11px">(${r.enumOptions.join('/')})</span>`;
        }
        return `<tr>
          <td style="padding:6px 10px;border:1px solid #e0e0e0;font-size:12px">${r.label}</td>
          <td style="padding:6px 10px;border:1px solid #e0e0e0;font-size:12px">${r.type}</td>
          <td style="padding:6px 10px;border:1px solid #e0e0e0;font-size:12px">${valCell}</td>
          <td style="padding:6px 10px;border:1px solid #e0e0e0;font-size:12px">${new Date(r.recordedAt).toLocaleString('zh-CN')}</td>
        </tr>`;
      }).join('\n');

      recordsTable = `
        <table style="width:100%;border-collapse:collapse;margin-top:12px">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px 10px;border:1px solid #e0e0e0;text-align:left;font-size:12px">标签</th>
              <th style="padding:8px 10px;border:1px solid #e0e0e0;text-align:left;font-size:12px">类型</th>
              <th style="padding:8px 10px;border:1px solid #e0e0e0;text-align:left;font-size:12px">值</th>
              <th style="padding:8px 10px;border:1px solid #e0e0e0;text-align:left;font-size:12px">记录时间</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    }

    let chartSvg = '';
    const numericRecords = step.records
      .filter((r) => r.type === 'numeric' && r.value)
      .map((r) => ({ time: r.recordedAt, value: parseFloat(r.value) || 0 }));
    if (numericRecords.length >= 2) {
      chartSvg = `<div style="margin-top:16px">${generateSvgChart(numericRecords)}</div>`;
    }

    let attachmentHtml = '';
    if (step.attachments.length > 0) {
      const imgs = step.attachments
        .filter((a) => a.mimetype.startsWith('image/'))
        .map((a) => `<img src="${a.path}" style="max-width:300px;border-radius:6px;margin:4px" />`)
        .join('\n');
      const docs = step.attachments
        .filter((a) => !a.mimetype.startsWith('image/'))
        .map((a) => `<span style="font-size:12px;color:#666">📎 ${a.originalName}</span>`)
        .join(' &nbsp; ');
      attachmentHtml = `<div style="margin-top:8px">${imgs}${docs}</div>`;
    }

    const status = step.completed
      ? '<span style="color:#4CAF50;font-weight:600">✓ 已完成</span>'
      : '<span style="color:#FF9800;font-weight:600">○ 进行中</span>';

    return `
      <div id="step-${i}" style="margin-bottom:32px;page-break-inside:avoid">
        <h3 style="color:#2A2355;border-bottom:2px solid #FFB300;padding-bottom:6px;margin-bottom:12px">
          ${i + 1}. ${step.name} ${status}
        </h3>
        <div style="font-size:13px;color:#555;margin-bottom:8px">
          ${step.startTime ? `开始: ${new Date(step.startTime).toLocaleString('zh-CN')}` : ''}
          ${step.endTime ? ` | 结束: ${new Date(step.endTime).toLocaleString('zh-CN')}` : ''}
        </div>
        ${step.expectedResult ? `<div style="font-size:13px;color:#555"><strong>预期结果:</strong> ${step.expectedResult}</div>` : ''}
        ${step.actualResult ? `<div style="font-size:13px;color:#555"><strong>实际结果:</strong> ${step.actualResult}</div>` : ''}
        ${recordsTable}
        ${chartSvg}
        ${attachmentHtml}
      </div>`;
  }).join('\n');

  let analysisHtml = '';
  if (Object.keys(numericAnalysis).length > 0) {
    const rows = Object.values(numericAnalysis).map((a) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #e0e0e0;font-size:13px">${a.label}</td>
        <td style="padding:8px 10px;border:1px solid #e0e0e0;font-size:13px">${a.values.length}</td>
        <td style="padding:8px 10px;border:1px solid #e0e0e0;font-size:13px">${a.avg.toFixed(2)}</td>
        <td style="padding:8px 10px;border:1px solid #e0e0e0;font-size:13px">${a.max.toFixed(2)}</td>
        <td style="padding:8px 10px;border:1px solid #e0e0e0;font-size:13px">${a.min.toFixed(2)}</td>
      </tr>
    `).join('\n');

    analysisHtml = `
      <div id="analysis" style="margin-bottom:32px">
        <h3 style="color:#2A2355;border-bottom:2px solid #FFB300;padding-bottom:6px;margin-bottom:12px">数据分析小结</h3>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px 10px;border:1px solid #e0e0e0;text-align:left;font-size:13px">步骤</th>
              <th style="padding:8px 10px;border:1px solid #e0e0e0;text-align:left;font-size:13px">数据点数</th>
              <th style="padding:8px 10px;border:1px solid #e0e0e0;text-align:left;font-size:13px">平均值</th>
              <th style="padding:8px 10px;border:1px solid #e0e0e0;text-align:left;font-size:13px">最大值</th>
              <th style="padding:8px 10px;border:1px solid #e0e0e0;text-align:left;font-size:13px">最小值</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>实验报告 - ${experiment.name}</title>
  <style>
    @media print { .no-print { display: none !important; } }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; margin: 0; padding: 0; background: #fff; }
  </style>
</head>
<body>
  <div style="min-height:100vh;background:linear-gradient(135deg,#2A2355,#1A1535);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 40px;color:#fff">
    <h1 style="font-size:36px;margin:0;text-align:center">${experiment.name}</h1>
    <div style="margin-top:24px;font-size:16px;text-align:center;opacity:0.8">
      <div>📅 实验日期: ${experiment.date}</div>
      <div style="margin-top:8px">👤 负责人: ${experiment.leader}</div>
      ${experiment.description ? `<div style="margin-top:8px;max-width:500px;line-height:1.6">${experiment.description}</div>` : ''}
    </div>
    <div style="margin-top:40px;font-size:12px;opacity:0.4">LabFlow 实验流程管理系统 自动生成</div>
  </div>

  <div style="max-width:800px;margin:0 auto;padding:40px 24px">
    <h2 style="color:#2A2355;border-bottom:3px solid #FFB300;padding-bottom:8px;margin-bottom:16px">目录</h2>
    <ul style="list-style:none;padding:0;font-size:14px">${tocItems}</ul>

    <hr style="border:none;border-top:1px solid #e0e0e0;margin:32px 0" />

    ${stepsHtml}

    ${analysisHtml}

    <div id="conclusion" style="margin-bottom:32px">
      <h3 style="color:#2A2355;border-bottom:2px solid #FFB300;padding-bottom:6px;margin-bottom:12px">结论</h3>
      <div style="font-size:14px;line-height:1.8;color:#333;white-space:pre-wrap">${conclusion || '（暂无结论）'}</div>
    </div>

    <div class="no-print" style="position:fixed;bottom:20px;right:20px">
      <button onclick="window.print()" style="padding:10px 24px;background:#FFB300;color:#1A1535;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2)">
        📄 导出PDF
      </button>
    </div>
  </div>
</body>
</html>`;
}

export default function ReportGenerator({ experimentId, experiment }: Props) {
  const [loading, setLoading] = useState(false);
  const [conclusion, setConclusion] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/experiments/${experimentId}/report-data`);
      const data = await res.json();
      const steps: StepWithRecords[] = data.steps || [];

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const html = buildHtmlReport(experiment, steps, conclusion);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <label style={{ fontSize: 11, color: '#8884A8', display: 'block', marginBottom: 4 }}>结论描述</label>
        <textarea
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          placeholder="输入实验结论..."
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 6,
            background: '#1A1535', border: '1px solid #4A3F80', color: '#E0E0E0',
            fontSize: 12, outline: 'none', resize: 'vertical', minHeight: 48,
          }}
          rows={2}
        />
        <div style={{ fontSize: 10, color: '#6B6590', marginTop: 2, textAlign: 'right' }}>
          {conclusion.length} 字
        </div>
      </div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          padding: '8px 20px', borderRadius: 8,
          background: loading ? '#4A3F80' : '#FFB300',
          color: loading ? '#B0AAC8' : '#1A1535',
          border: 'none', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s',
          alignSelf: 'flex-end',
        }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {loading ? '生成中...' : '📋 生成报告'}
      </button>

      {loading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(26,21,53,0.85)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <DnaHelixAnimation />
        </div>
      )}
    </div>
  );
}
