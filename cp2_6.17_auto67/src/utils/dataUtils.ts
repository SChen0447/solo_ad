export function extractTableData(
  data: Record<string, unknown>[]
): { headers: string[]; rows: Record<string, unknown>[] } {
  if (!data || data.length === 0) {
    return { headers: [], rows: [] };
  }

  const headerSet = new Set<string>();
  for (const item of data) {
    for (const key of Object.keys(item)) {
      headerSet.add(key);
    }
  }
  const headers = Array.from(headerSet);
  const rows = data.map(item => {
    const row: Record<string, unknown> = {};
    for (const h of headers) {
      row[h] = item[h] !== undefined ? item[h] : '';
    }
    return row;
  });

  return { headers, rows };
}

export function extractChartData(
  data: Record<string, unknown>[]
): { labels: string[]; values: number[] } {
  if (!data || data.length === 0) {
    return { labels: [], values: [] };
  }

  const firstItem = data[0];
  const keys = Object.keys(firstItem);

  let labelKey = keys.find(k =>
    typeof firstItem[k] === 'string' || firstItem[k] === undefined
  ) || keys[0];

  let valueKey = keys.find(k =>
    typeof firstItem[k] === 'number'
  );

  if (!valueKey) {
    valueKey = keys.find(k => k !== labelKey) || keys[0];
  }

  const labels = data.map((item, i) => {
    const val = item[labelKey];
    return typeof val === 'string' ? val : `Item ${i + 1}`;
  });

  const values = data.map(item => {
    const val = item[valueKey!];
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  });

  return { labels, values };
}
