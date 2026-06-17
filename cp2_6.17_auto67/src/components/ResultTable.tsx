import { extractTableData } from '../utils/dataUtils';

interface ResultTableProps {
  data: Record<string, unknown>[];
  maxRows?: number;
}

export default function ResultTable({ data, maxRows = 20 }: ResultTableProps) {
  const { headers, rows } = extractTableData(data);
  const displayRows = rows.slice(0, maxRows);

  if (headers.length === 0) {
    return (
      <div style={{ padding: 20, color: '#999', textAlign: 'center', fontSize: 13 }}>
        暂无表格数据
      </div>
    );
  }

  return (
    <div
      style={{
        overflow: 'auto',
        maxHeight: 360,
        borderRadius: 8,
        border: '1px solid #e8e8e8',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 14,
          color: '#333',
        }}
      >
        <thead>
          <tr>
            {headers.map(h => (
              <th
                key={h}
                style={{
                  position: 'sticky',
                  top: 0,
                  background: '#f5f7fa',
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  fontSize: 13,
                  color: '#555',
                  borderBottom: '2px solid #e0e0e0',
                  whiteSpace: 'nowrap',
                  zIndex: 1,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <tr
              key={i}
              style={{
                background: i % 2 === 0 ? '#ffffff' : '#f0f0f0',
                transition: 'background 0.2s',
                height: 48,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = '#e0f7fa';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background =
                  i % 2 === 0 ? '#ffffff' : '#f0f0f0';
              }}
            >
              {headers.map(h => (
                <td
                  key={h}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #f0f0f0',
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={String(row[h] ?? '')}
                >
                  {String(row[h] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > maxRows && (
        <div
          style={{
            padding: '8px 12px',
            textAlign: 'center',
            color: '#999',
            fontSize: 12,
            background: '#f5f7fa',
            borderTop: '1px solid #e0e0e0',
          }}
        >
          显示前 {maxRows} 行，共 {rows.length} 行
        </div>
      )}
    </div>
  );
}
