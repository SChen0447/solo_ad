import { RankingItem } from '../types';

export const generateCSV = (rankings: RankingItem[]): string => {
  const headers = [
    '排名',
    '作品标题',
    '作者',
    '平均分',
    '最高分',
    '最低分',
    '构图平均分',
    '色彩平均分',
    '创意平均分',
    '情感表达平均分',
    '评分人数',
  ];

  const rows = rankings.map((item) => [
    item.rank,
    `"${item.title}"`,
    item.author,
    item.avg_total.toFixed(2),
    item.max_score,
    item.min_score,
    item.avg_composition.toFixed(2),
    item.avg_color.toFixed(2),
    item.avg_creativity.toFixed(2),
    item.avg_emotion.toFixed(2),
    item.score_count,
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
};

export const downloadCSV = (csv: string, filename: string): void => {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
