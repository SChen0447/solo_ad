import { ParsedData, ColumnMeta } from './dataParser';

export type ChartType = 'bar' | 'line' | 'pie';
export type TemplateId = 'trend' | 'comparison' | 'timeseries';

export interface ChartConfig {
  type: ChartType;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface StoryChapter {
  id: string;
  title: string;
  text: string;
  chart?: ChartConfig;
}

export interface Story {
  title: string;
  chapters: StoryChapter[];
}

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  icon: string;
  description: string;
}

export const TEMPLATES: TemplateInfo[] = [
  { id: 'trend', name: '趋势发现', icon: '📈', description: '挖掘数据中的关键变化趋势和异常波动' },
  { id: 'comparison', name: '对比分析', icon: '⚖️', description: '多维度对比不同类别或分组间的差异' },
  { id: 'timeseries', name: '时序演变', icon: '⏳', description: '按时间维度展示数据的演进过程和周期性' }
];

const COLORS = ['#4a90d9', '#50e3c2', '#f5a623', '#d0021b', '#9b59b6', '#2ecc71', '#e74c3c', '#3498db'];

function getNumericColumns(columns: ColumnMeta[]): ColumnMeta[] {
  return columns.filter(c => c.type === 'number');
}

function getStringColumns(columns: ColumnMeta[]): ColumnMeta[] {
  return columns.filter(c => c.type === 'string');
}

function getDateColumns(columns: ColumnMeta[]): ColumnMeta[] {
  return columns.filter(c => c.type === 'date');
}

function pickTopN<T extends { uniqueCount: number }>(arr: T[], n: number, preferLowerUnique = false): T[] {
  const sorted = [...arr].sort((a, b) =>
    preferLowerUnique ? a.uniqueCount - b.uniqueCount : b.uniqueCount - a.uniqueCount
  );
  return sorted.slice(0, n);
}

function getTopCategories(rows: Record<string, unknown>[], catCol: string, valCol: string, limit = 8): { label: string; value: number }[] {
  const map = new Map<string, number>();
  rows.forEach(r => {
    const key = r[catCol];
    const val = r[valCol];
    if (key === null || key === undefined) return;
    const k = String(key);
    const v = typeof val === 'number' ? val : 1;
    map.set(k, (map.get(k) || 0) + v);
  });
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function formatNumber(n: number, digits = 2): string {
  if (Math.abs(n) >= 10000) return (n / 10000).toFixed(digits) + '万';
  return n.toFixed(digits);
}

function getPercentChange(oldVal: number, newVal: number): string {
  if (oldVal === 0) return newVal === 0 ? '持平' : '新增';
  const pct = ((newVal - oldVal) / Math.abs(oldVal)) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function genChapterId(): string {
  return 'ch_' + Math.random().toString(36).slice(2, 10);
}

function computeStats(values: number[]): { min: number; max: number; avg: number; sum: number; count: number } {
  let min = Infinity, max = -Infinity, sum = 0, count = 0;
  values.forEach(v => {
    if (typeof v === 'number' && !isNaN(v)) {
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
      count++;
    }
  });
  return {
    min: isFinite(min) ? min : 0,
    max: isFinite(max) ? max : 0,
    avg: count === 0 ? 0 : sum / count,
    sum,
    count
  };
}

export function generateStory(data: ParsedData, templateId: TemplateId): Story {
  switch (templateId) {
    case 'trend':
      return generateTrendStory(data);
    case 'comparison':
      return generateComparisonStory(data);
    case 'timeseries':
      return generateTimeseriesStory(data);
  }
}

function generateTrendStory(data: ParsedData): Story {
  const { rows, summary, headers } = data;
  const numericCols = getNumericColumns(summary.columns);
  const stringCols = getStringColumns(summary.columns);
  const chapters: StoryChapter[] = [];

  const title = numericCols.length > 0
    ? `《${numericCols[0].name}》数据趋势深度洞察`
    : `数据集关键趋势分析报告`;

  if (numericCols.length === 0) {
    chapters.push({
      id: genChapterId(),
      title: '数据概览',
      text: `本数据集共包含 ${summary.totalRows} 条记录，${summary.totalColumns} 个字段。主要字段包括：${headers.slice(0, 5).join('、')}${headers.length > 5 ? ' 等' : ''}。缺失值比例约为 ${(summary.nullRatio * 100).toFixed(2)}%，数据质量${summary.nullRatio < 0.05 ? '良好' : summary.nullRatio < 0.15 ? '中等' : '需要关注'}。`,
      chart: undefined
    });
    return { title, chapters };
  }

  const primaryMetric = numericCols[0];
  const values = rows.map(r => r[primaryMetric.name] as number).filter(v => typeof v === 'number');
  const stats = computeStats(values);

  chapters.push({
    id: genChapterId(),
    title: '整体数据概览',
    text: `本次分析的核心指标为「${primaryMetric.name}」，共涉及 ${summary.totalRows} 条有效数据记录。该指标的最小值为 ${formatNumber(stats.min)}，最大值达到 ${formatNumber(stats.max)}，均值约为 ${formatNumber(stats.avg)}，累计总和为 ${formatNumber(stats.sum)}。从数据分布来看，${stats.max > stats.avg * 3 ? '存在较为显著的极值点，建议重点关注极端值的业务背景' : '整体分布相对均匀，数据离散度处于合理区间'}。`,
    chart: undefined
  });

  const secondaryMetrics = numericCols.slice(1, 4);
  if (secondaryMetrics.length >= 1) {
    const labels = rows.slice(0, 20).map((r, i) => {
      if (stringCols.length > 0) return String(r[stringCols[0].name] ?? `项${i + 1}`);
      return `项${i + 1}`;
    });
    const datasets = secondaryMetrics.slice(0, 2).map((col, idx) => ({
      label: col.name,
      data: rows.slice(0, 20).map(r => typeof r[col.name] === 'number' ? (r[col.name] as number) : 0),
      color: COLORS[idx % COLORS.length]
    }));
    datasets.unshift({
      label: primaryMetric.name,
      data: rows.slice(0, 20).map(r => typeof r[primaryMetric.name] === 'number' ? (r[primaryMetric.name] as number) : 0),
      color: COLORS[0]
    });

    chapters.push({
      id: genChapterId(),
      title: '核心指标波动趋势',
      text: `下图展示了前 20 条数据中「${primaryMetric.name}」与 ${secondaryMetrics.slice(0, 2).map(m => '「' + m.name + '」').join('、')} 的同步变化情况。可以直观地观察到各指标间的关联关系与波动特征：${datasets.length > 1 ? '多指标的走势显示出一定的协同性，值得进一步进行相关性分析' : '指标整体呈现出阶段性的变化规律'}。`,
      chart: { type: 'line', labels, datasets }
    });
  }

  if (stringCols.length > 0 && numericCols.length >= 1) {
    const catCol = pickTopN(stringCols, 1, true)[0] || stringCols[0];
    const topCats = getTopCategories(rows, catCol.name, primaryMetric.name, 10);
    const labels = topCats.map(t => t.label);
    const data = topCats.map(t => t.value);

    chapters.push({
      id: genChapterId(),
      title: `按「${catCol.name}」分组的 ${primaryMetric.name} 排名`,
      text: `将数据按照「${catCol.name}」维度进行聚合统计后，${primaryMetric.name} 的 Top ${topCats.length} 排名如下。排名第一的「${labels[0]}」贡献了 ${formatNumber(data[0])}，占比约 ${(data[0] / (data.reduce((a, b) => a + b, 0) || 1) * 100).toFixed(1)}%，与第二名「${labels[1] || '-'}」的差距为 ${labels[1] ? formatNumber(data[0] - data[1]) : '-'}，${data[0] > data[1] * 2 ? '领先优势十分明显' : '竞争格局较为激烈'}。`,
      chart: {
        type: 'bar',
        labels,
        datasets: [{ label: primaryMetric.name, data, color: COLORS[0] }]
      }
    });
  }

  if (numericCols.length >= 2) {
    const colA = numericCols[0];
    const colB = numericCols[1];
    const half = Math.floor(rows.length / 2);
    const sumA1 = rows.slice(0, half).reduce((s, r) => s + (typeof r[colA.name] === 'number' ? (r[colA.name] as number) : 0), 0);
    const sumA2 = rows.slice(half).reduce((s, r) => s + (typeof r[colA.name] === 'number' ? (r[colA.name] as number) : 0), 0);
    const sumB1 = rows.slice(0, half).reduce((s, r) => s + (typeof r[colB.name] === 'number' ? (r[colB.name] as number) : 0), 0);
    const sumB2 = rows.slice(half).reduce((s, r) => s + (typeof r[colB.name] === 'number' ? (r[colB.name] as number) : 0), 0);

    chapters.push({
      id: genChapterId(),
      title: '前后半段数据对比',
      text: `将数据集按记录顺序等分为前后两段，可以观察到关键指标的阶段性变化：「${colA.name}」从 ${formatNumber(sumA1)} 变为 ${formatNumber(sumA2)}，${getPercentChange(sumA1, sumA2)}；「${colB.name}」从 ${formatNumber(sumB1)} 变为 ${formatNumber(sumB2)}，${getPercentChange(sumB1, sumB2)}。${sumA2 > sumA1 ? '后半段整体呈现上升趋势，业务表现向好' : '后半段出现回落，建议关注相关影响因素'}。`,
      chart: {
        type: 'bar',
        labels: ['前半段', '后半段'],
        datasets: [
          { label: colA.name, data: [sumA1, sumA2], color: COLORS[0] },
          { label: colB.name, data: [sumB1, sumB2], color: COLORS[1] }
        ]
      }
    });
  }

  if (numericCols.length >= 1) {
    const labels = ['最小值', '25%分位', '中位数', '75%分位', '最大值'];
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const quantile = (q: number) => n === 0 ? 0 : sorted[Math.min(n - 1, Math.floor(q * (n - 1)))];
    const boxData = [stats.min, quantile(0.25), quantile(0.5), quantile(0.75), stats.max];
    chapters.push({
      id: genChapterId(),
      title: `${primaryMetric.name} 的分布特征`,
      text: `通过五数概括（最小值、25%分位数、中位数、75%分位数、最大值）可以更全面地了解「${primaryMetric.name}」的分布形态。数据中位数为 ${formatNumber(boxData[2])}，四分位距（IQR）为 ${formatNumber(boxData[3] - boxData[1])}，${boxData[4] - boxData[3] > (boxData[3] - boxData[1]) * 1.5 ? '上侧存在明显的长尾分布，高值区域可能包含异常值' : '整体分布较为对称，数据稳定性良好'}。`,
      chart: {
        type: 'bar',
        labels,
        datasets: [{ label: primaryMetric.name, data: boxData, color: COLORS[2] }]
      }
    });
  }

  return { title, chapters: chapters.slice(0, 5) };
}

function generateComparisonStory(data: ParsedData): Story {
  const { rows, summary, headers } = data;
  const numericCols = getNumericColumns(summary.columns);
  const stringCols = getStringColumns(summary.columns);
  const chapters: StoryChapter[] = [];

  const title = stringCols.length > 0 && numericCols.length > 0
    ? `《${stringCols[0].name}》维度下的 ${numericCols[0].name} 对比分析`
    : `多维对比分析报告`;

  chapters.push({
    id: genChapterId(),
    title: '数据集基本信息',
    text: `本次对比分析基于 ${summary.totalRows} 条数据记录，覆盖 ${summary.totalColumns} 个字段。其中数值型字段 ${numericCols.length} 个（${numericCols.map(c => '「' + c.name + '」').join('、') || '无'}），类别型字段 ${stringCols.length} 个（${stringCols.map(c => '「' + c.name + '」').join('、') || '无'}）。数据缺失率为 ${(summary.nullRatio * 100).toFixed(2)}%。`,
    chart: undefined
  });

  if (numericCols.length >= 2) {
    const labels = numericCols.slice(0, 6).map(c => c.name);
    const avgs = numericCols.slice(0, 6).map(col => {
      const vals = rows.map(r => r[col.name] as number).filter(v => typeof v === 'number');
      const s = computeStats(vals);
      return s.avg;
    });

    chapters.push({
      id: genChapterId(),
      title: '多指标均值对比',
      text: `选取 ${labels.length} 个核心数值指标进行横向对比，各指标的平均值差异显著。其中「${labels[avgs.indexOf(Math.max(...avgs))]}」的均值最高，达到 ${formatNumber(Math.max(...avgs))}；而「${labels[avgs.indexOf(Math.min(...avgs))]}」的均值相对较低，为 ${formatNumber(Math.min(...avgs))}，两者相差约 ${(Math.max(...avgs) / (Math.min(...avgs) || 1)).toFixed(1)} 倍。这种差异反映了不同指标在量级和业务含义上的区别，分析时需注意标准化处理。`,
      chart: {
        type: 'bar',
        labels,
        datasets: [{ label: '平均值', data: avgs, color: COLORS[0] }]
      }
    });
  }

  if (stringCols.length > 0 && numericCols.length > 0) {
    const catCol = pickTopN(stringCols.filter(c => c.uniqueCount >= 2 && c.uniqueCount <= 15), 1)[0] || stringCols[0];
    const metrics = numericCols.slice(0, 3);
    const topCats = getTopCategories(rows, catCol.name, metrics[0].name, 6);
    const labels = topCats.map(t => t.label);
    const datasets = metrics.map((m, idx) => {
      const data = labels.map(lbl => {
        const matched = rows.filter(r => String(r[catCol.name] ?? '') === lbl);
        const vals = matched.map(r => r[m.name] as number).filter(v => typeof v === 'number');
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      });
      return { label: m.name, data, color: COLORS[idx % COLORS.length] };
    });

    chapters.push({
      id: genChapterId(),
      title: `按「${catCol.name}」分组的多指标均值对比`,
      text: `以「${catCol.name}」为分组维度，对比 ${metrics.map(m => '「' + m.name + '」').join('、')} 在不同类别下的平均表现。${labels.length} 个主要类别在各指标上的表现呈现出不同的优势格局：${datasets.map(d => {
        const maxIdx = d.data.indexOf(Math.max(...d.data));
        return `「${d.label}」在「${labels[maxIdx]}」上表现最佳（${formatNumber(d.data[maxIdx])}）`;
      }).join('；')}。`,
      chart: { type: 'bar', labels, datasets }
    });
  }

  if (stringCols.length > 0 && numericCols.length > 0) {
    const catCol = stringCols[0];
    const valCol = numericCols[0];
    const topCats = getTopCategories(rows, catCol.name, valCol.name, 6);
    const total = topCats.reduce((s, t) => s + t.value, 0);

    chapters.push({
      id: genChapterId(),
      title: `「${valCol.name}」在「${catCol.name}」中的构成占比`,
      text: `从构成比例来看，Top ${topCats.length} 个「${catCol.name}」类别共贡献了 ${formatNumber(total)} 的「${valCol.name}」总量。${topCats.slice(0, 3).map((t, i) => `第${i + 1}位「${t.label}」占比 ${(t.value / total * 100).toFixed(1)}%`).join('，')}。${topCats.length >= 3 ? (topCats[0].value > total * 0.5 ? '头部集中效应明显，呈现典型的二八分布特征' : '分布相对均衡，头部类别的领先优势并不悬殊') : '类别数量较少，建议结合更多维度分析'}。`,
      chart: {
        type: 'pie',
        labels: topCats.map(t => t.label),
        datasets: topCats.map((t, i) => ({
          label: t.label,
          data: [t.value],
          color: COLORS[i % COLORS.length]
        }))
      }
    });
  }

  if (numericCols.length >= 2 && rows.length >= 5) {
    const sampleRows = rows.slice(0, 8);
    const baseLabels = stringCols.length > 0
      ? sampleRows.map(r => String(r[stringCols[0].name] ?? '-'))
      : sampleRows.map((_, i) => `样本${i + 1}`);
    const datasets = numericCols.slice(0, 4).map((col, idx) => ({
      label: col.name,
      data: sampleRows.map(r => typeof r[col.name] === 'number' ? (r[col.name] as number) : 0),
      color: COLORS[idx % COLORS.length]
    }));

    chapters.push({
      id: genChapterId(),
      title: '典型样本的多维度雷达对比',
      text: `选取 ${sampleRows.length} 条代表性样本，从 ${datasets.length} 个数值维度进行综合对比。可以直观发现不同样本在各维度上的优劣势：${datasets.map(d => {
        const maxIdx = d.data.indexOf(Math.max(...d.data));
        return `${baseLabels[maxIdx]} 的「${d.label}」最突出`;
      }).slice(0, 3).join('；')}。这种多维度对比有助于识别样本的差异化特征。`,
      chart: { type: 'bar', labels: baseLabels, datasets }
    });
  }

  return { title, chapters: chapters.slice(0, 5) };
}

function generateTimeseriesStory(data: ParsedData): Story {
  const { rows, summary, headers } = data;
  const numericCols = getNumericColumns(summary.columns);
  const dateCols = getDateColumns(summary.columns);
  const stringCols = getStringColumns(summary.columns);
  const chapters: StoryChapter[] = [];

  const hasDate = dateCols.length > 0;
  const dateColName = hasDate ? dateCols[0].name : null;

  const title = hasDate && numericCols.length > 0
    ? `基于「${dateCols[0].name}」的 ${numericCols[0].name} 时序演变分析`
    : `数据顺序演变与周期性分析报告`;

  const orderedRows = hasDate
    ? [...rows].sort((a, b) => {
        const da = a[dateColName!];
        const db = b[dateColName!];
        if (da instanceof Date && db instanceof Date) return da.getTime() - db.getTime();
        return 0;
      })
    : rows;

  chapters.push({
    id: genChapterId(),
    title: '时序数据基本概况',
    text: hasDate
      ? `本数据集包含明确的时间维度「${dateCols[0].name}」，共覆盖 ${summary.totalRows} 个时间节点的数据记录。数值型指标共 ${numericCols.length} 个：${numericCols.map(c => '「' + c.name + '」').join('、') || '无'}。数据时间跨度从 ${orderedRows.length > 0 && orderedRows[0][dateColName!] instanceof Date ? (orderedRows[0][dateColName!] as Date).toLocaleDateString() : '未知'} 到 ${orderedRows.length > 0 && orderedRows[orderedRows.length - 1][dateColName!] instanceof Date ? (orderedRows[orderedRows.length - 1][dateColName!] as Date).toLocaleDateString() : '未知'}。`
      : `由于数据集中未识别到显式的日期字段，以下分析将基于数据记录的天然顺序进行时序演变分析。共 ${summary.totalRows} 条记录，数值指标 ${numericCols.length} 个：${numericCols.map(c => '「' + c.name + '」').join('、') || '无'}。`,
    chart: undefined
  });

  if (numericCols.length > 0 && orderedRows.length >= 3) {
    const primaryMetric = numericCols[0];
    const maxPoints = 30;
    const step = Math.max(1, Math.floor(orderedRows.length / maxPoints));
    const sampled = orderedRows.filter((_, i) => i % step === 0 || i === orderedRows.length - 1);
    const labels = hasDate
      ? sampled.map(r => {
          const d = r[dateColName!];
          if (d instanceof Date) return d.toLocaleDateString();
          return String(d ?? '-');
        })
      : sampled.map((_, i) => `第${(i * step) + 1}点`);

    const datasets = numericCols.slice(0, 3).map((col, idx) => ({
      label: col.name,
      data: sampled.map(r => typeof r[col.name] === 'number' ? (r[col.name] as number) : 0),
      color: COLORS[idx % COLORS.length]
    }));

    const vals = datasets[0].data;
    const trendPct = vals.length >= 2 ? getPercentChange(vals[0], vals[vals.length - 1]) : '持平';
    const peakIdx = vals.indexOf(Math.max(...vals));
    const valleyIdx = vals.indexOf(Math.min(...vals));

    chapters.push({
      id: genChapterId(),
      title: `核心指标的整体演变趋势`,
      text: `从整体时序走势来看，「${primaryMetric.name}」在分析区间内的变化幅度为 ${trendPct}。最高点出现在 ${labels[peakIdx]} 前后（${formatNumber(vals[peakIdx])}），最低点位于 ${labels[valleyIdx]} 附近（${formatNumber(vals[valleyIdx])}）。${vals[vals.length - 1] > vals[0] ? '整体呈现上升态势，后期表现优于初期' : '整体有所回落，需要关注下行的驱动因素'}。${datasets.length > 1 ? `「${datasets.slice(1).map(d => d.label).join('」和「')}」的走势也一并展示，便于观察多指标的同步性。` : ''}`,
      chart: { type: 'line', labels, datasets }
    });
  }

  if (numericCols.length > 0 && orderedRows.length >= 4) {
    const primaryMetric = numericCols[0];
    const n = orderedRows.length;
    const q1 = Math.floor(n * 0.25);
    const q2 = Math.floor(n * 0.5);
    const q3 = Math.floor(n * 0.75);
    const periods = [
      { label: '初期 25%', data: orderedRows.slice(0, Math.max(1, q1)) },
      { label: '过渡 25%', data: orderedRows.slice(Math.max(1, q1), Math.max(2, q2)) },
      { label: '中期 25%', data: orderedRows.slice(Math.max(2, q2), Math.max(3, q3)) },
      { label: '近期 25%', data: orderedRows.slice(Math.max(3, q3), n) }
    ].filter(p => p.data.length > 0);

    const labels = periods.map(p => p.label);
    const datasets = numericCols.slice(0, 3).map((col, idx) => ({
      label: col.name + ' 均值',
      data: periods.map(p => {
        const vals = p.data.map(r => r[col.name] as number).filter(v => typeof v === 'number');
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      }),
      color: COLORS[idx % COLORS.length]
    }));

    chapters.push({
      id: genChapterId(),
      title: '阶段性均值演变',
      text: `将时间序列等分为 ${periods.length} 个阶段，观察各阶段指标均值的演变规律。以「${datasets[0].label}」为例：${labels.map((lbl, i) => `${lbl}为${formatNumber(datasets[0].data[i])}`).join('，')}。从阶段变化来看，${datasets[0].data[datasets[0].data.length - 1] > datasets[0].data[0] ? '阶段均值逐步走高，增长动能持续释放' : '阶段均值有所波动，近期需要重点关注'}。`,
      chart: { type: 'bar', labels, datasets }
    });
  }

  if (numericCols.length >= 1 && stringCols.length >= 1 && orderedRows.length >= 6) {
    const primaryMetric = numericCols[0];
    const catCol = pickTopN(stringCols.filter(c => c.uniqueCount >= 2 && c.uniqueCount <= 6), 1)[0] || stringCols[0];
    const categories = [...new Set(orderedRows.map(r => String(r[catCol.name] ?? '')).filter(s => s && s !== 'null' && s !== 'undefined'))].slice(0, 4);

    const periodCount = 6;
    const periodSize = Math.max(1, Math.floor(orderedRows.length / periodCount));
    const periodLabels: string[] = [];
    for (let i = 0; i < periodCount; i++) {
      if (hasDate) {
        const row = orderedRows[Math.min(orderedRows.length - 1, i * periodSize + Math.floor(periodSize / 2))];
        const d = row[dateColName!];
        periodLabels.push(d instanceof Date ? d.toLocaleDateString() : `期${i + 1}`);
      } else {
        periodLabels.push(`第${i * periodSize + 1}-${Math.min((i + 1) * periodSize, orderedRows.length)}条`);
      }
    }

    const datasets = categories.map((cat, ci) => {
      const data = periodLabels.map((_, pi) => {
        const start = pi * periodSize;
        const end = Math.min(orderedRows.length, (pi + 1) * periodSize);
        const slice = orderedRows.slice(start, end).filter(r => String(r[catCol.name] ?? '') === cat);
        const vals = slice.map(r => r[primaryMetric.name] as number).filter(v => typeof v === 'number');
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      });
      return { label: cat, data, color: COLORS[ci % COLORS.length] };
    });

    chapters.push({
      id: genChapterId(),
      title: `按「${catCol.name}」分组的时序趋势对比`,
      text: `从「${catCol.name}」维度将数据拆分为 ${categories.length} 条并行时序，对比各分组在不同时期的「${primaryMetric.name}」表现。可以发现${datasets.length > 0 ? `「${datasets[0].label}」整体处于较高水平` : ''}，${datasets.length > 1 ? `而「${datasets[datasets.length - 1].label}」的波动相对${datasets[datasets.length - 1].data.reduce((a, b) => a + b, 0) > 0 ? '较小' : '较大'}。` : ''}不同分组的走势差异为业务策略制定提供了细分依据。`,
      chart: { type: 'line', labels: periodLabels, datasets }
    });
  }

  if (numericCols.length > 0 && orderedRows.length >= 10) {
    const primaryMetric = numericCols[0];
    const periodCount = Math.min(12, Math.max(6, Math.floor(orderedRows.length / 10)));
    const periodSize = Math.max(1, Math.floor(orderedRows.length / periodCount));
    const labels: string[] = [];
    const cumData: number[] = [];
    let cum = 0;

    for (let i = 0; i < periodCount; i++) {
      const start = i * periodSize;
      const end = Math.min(orderedRows.length, (i + 1) * periodSize);
      const slice = orderedRows.slice(start, end);
      const periodSum = slice.reduce((s, r) => s + (typeof r[primaryMetric.name] === 'number' ? (r[primaryMetric.name] as number) : 0), 0);
      cum += periodSum;
      cumData.push(cum);
      if (hasDate) {
        const row = orderedRows[Math.min(orderedRows.length - 1, end - 1)];
        const d = row[dateColName!];
        labels.push(d instanceof Date ? d.toLocaleDateString() : `期${i + 1}`);
      } else {
        labels.push(`至第${end}条`);
      }
    }

    const growthRate = cumData.length >= 2
      ? ((cumData[cumData.length - 1] - (cumData[0] * (cumData.length))) / Math.abs(cumData[0] * cumData.length || 1) * 100)
      : 0;

    chapters.push({
      id: genChapterId(),
      title: `「${primaryMetric.name}」累计增长曲线`,
      text: `累计值曲线展示了「${primaryMetric.name}」随时间的累积效应。至最后一个统计周期，累计总量达到 ${formatNumber(cumData[cumData.length - 1])}。${growthRate > 10 ? '累计曲线呈现加速上扬态势，增长动力强劲' : growthRate > 0 ? '累计值保持稳定增长，节奏较为平稳' : '累计增长有所放缓，建议关注边际变化'}。累计分析有助于评估长期目标的达成进度。`,
      chart: {
        type: 'line',
        labels,
        datasets: [{ label: primaryMetric.name + ' 累计值', data: cumData, color: COLORS[3] }]
      }
    });
  }

  return { title, chapters: chapters.slice(0, 5) };
}
