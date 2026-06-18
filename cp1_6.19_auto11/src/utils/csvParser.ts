export interface CSVData {
  columns: string[];
  rows: string[][];
}

export function parseCSV(csvString: string): CSVData {
  const lines = csvString.trim().split(/\r?\n/);
  if (lines.length === 0) {
    return { columns: [], rows: [] };
  }

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  };

  const columns = parseLine(lines[0]);
  const rows = lines.slice(1).filter(line => line.trim() !== '').map(parseLine);

  return { columns, rows };
}

export function detectColumnType(values: string[]): 'number' | 'string' | 'date' {
  if (values.length === 0) return 'string';

  const numericCount = values.filter(v => !isNaN(Number(v)) && v.trim() !== '').length;
  if (numericCount / values.length > 0.8) return 'number';

  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/,
    /^\d{2}\/\d{2}\/\d{4}/,
    /^\d{4}\/\d{2}\/\d{2}/
  ];
  const dateCount = values.filter(v => datePatterns.some(p => p.test(v))).length;
  if (dateCount / values.length > 0.8) return 'date';

  return 'string';
}
