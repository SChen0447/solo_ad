import React from 'react';
import { TableRow } from '../types';
import { formatValue } from '../utils/dataUtils';

interface ResultTableProps {
  data: TableRow[];
  maxColumns?: number;
}

const ResultTable: React.FC<ResultTableProps> = ({ data, maxColumns = 8 }) => {
  if (data.length === 0) {
    return (
      <div className="result-table-container">
        <table className="result-table">
          <thead>
            <tr>
              <th>无数据</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                API返回数据为空
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  const allColumns = Object.keys(data[0]);
  const columns = allColumns.slice(0, maxColumns);

  return (
    <div className="result-table-container">
      <table className="result-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} title={column}>
                {column.length > 20 ? column.slice(0, 20) + '...' : column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={column} title={String(row[column])}>
                  {formatValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultTable;
