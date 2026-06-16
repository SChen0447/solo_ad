export interface ParsedData {
  headers: string[];
  numericColumns: string[];
  stringColumns: string[];
  rows: Record<string, string | number>[];
}

export function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        reject(new Error('Failed to read file'));
        return;
      }

      import('papaparse').then((Papa) => {
        const result = Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });

        if (result.errors.length > 0) {
          reject(new Error(`CSV parse error: ${result.errors[0].message}`));
          return;
        }

        const rows = result.data as Record<string, string | number>[];
        if (rows.length === 0) {
          reject(new Error('CSV file is empty'));
          return;
        }

        const headers = result.meta.fields || [];
        const numericColumns: string[] = [];
        const stringColumns: string[] = [];

        for (const header of headers) {
          let numCount = 0;
          let strCount = 0;
          for (const row of rows) {
            const val = row[header];
            if (val === null || val === undefined || val === '') continue;
            if (typeof val === 'number') {
              numCount++;
            } else {
              strCount++;
            }
          }
          if (numCount >= strCount && numCount > 0) {
            numericColumns.push(header);
          } else if (strCount > 0) {
            stringColumns.push(header);
          }
        }

        resolve({ headers, numericColumns, stringColumns, rows });
      });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
