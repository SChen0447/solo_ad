export type ChartType = 'bar' | 'line' | 'pie';

export interface ChartDataItem {
  name: string;
  value?: number;
  [key: string]: string | number | undefined;
}

export interface ChartData {
  title: string;
  type: ChartType;
  data: ChartDataItem[];
  keys: string[];
}

export function parseMarkdown(markdown: string): ChartData {
  const lines = markdown.trim().split('\n');
  let title = '';
  let data: ChartDataItem[] = [];
  let keys: string[] = [];
  let inTable = false;
  let tableHeaders: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('# ')) {
      title = trimmedLine.slice(2).trim();
      continue;
    }

    if (trimmedLine.startsWith('## ')) {
      if (!title) {
        title = trimmedLine.slice(3).trim();
      }
      continue;
    }

    if (trimmedLine.includes('|') && trimmedLine.startsWith('|')) {
      const cells = trimmedLine
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      if (!inTable) {
        tableHeaders = cells;
        inTable = true;
        keys = cells.slice(1);
        continue;
      }

      if (trimmedLine.match(/^[\|\s\-:]+$/)) {
        continue;
      }

      if (cells.length > 0) {
        const item: ChartDataItem = { name: cells[0] };
        for (let i = 1; i < cells.length; i++) {
          const val = parseFloat(cells[i]);
          item[tableHeaders[i]] = isNaN(val) ? cells[i] : val;
        }
        data.push(item);
      }
    }
  }

  const type = determineChartType(data, keys);

  return {
    title: title || '数据图表',
    type,
    data,
    keys,
  };
}

function determineChartType(data: ChartDataItem[], keys: string[]): ChartType {
  if (data.length === 0) return 'bar';

  if (keys.length === 1 && data.length <= 6) {
    return 'pie';
  }

  if (keys.length >= 2) {
    const allNumeric = data.every((item) => {
      return keys.every((key) => typeof item[key] === 'number');
    });
    if (allNumeric && data.length >= 5) {
      return 'line';
    }
  }

  return 'bar';
}
