import type { DataType } from './MockDataProvider';

export function exportToCSV(data: DataType[]): void {
  if (data.length === 0) {
    alert('没有可导出的数据');
    return;
  }

  const headers = ['ID', '姓名', '邮箱', '状态', '创建日期'];
  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      row.id,
      `"${row.name.replace(/"/g, '""')}"`,
      `"${row.email.replace(/"/g, '""')}"`,
      row.status === 'active' ? '活跃' : '非活跃',
      row.createdAt
    ].join(','))
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `数据表_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPdf(data: DataType[]): void {
  if (data.length === 0) {
    alert('没有可导出的数据');
    return;
  }

  const dateStr = new Date().toISOString().slice(0, 10);

  const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>数据表_${dateStr}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #1e293b; font-size: 20px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background-color: #f1f5f9; font-weight: bold; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .status-active { color: #10b981; }
    .status-inactive { color: #ef4444; }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <h1>数据表格管理面板 - 数据导出</h1>
  <p>导出时间：${new Date().toLocaleString()}</p>
  <p>总记录数：${data.length}条</p>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>姓名</th>
        <th>邮箱</th>
        <th>状态</th>
        <th>创建日期</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(row => `
      <tr>
        <td>${row.id}</td>
        <td>${row.name}</td>
        <td>${row.email}</td>
        <td class="status-${row.status}">${row.status === 'active' ? '活跃' : '非活跃'}</td>
        <td>${row.createdAt}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  } else {
    const textContent = [
      '数据表格管理面板 - 数据导出',
      `导出时间：${new Date().toLocaleString()}`,
      `总记录数：${data.length}条`,
      '',
      'ID\t姓名\t邮箱\t状态\t创建日期',
      ...data.map(row => `${row.id}\t${row.name}\t${row.email}\t${row.status === 'active' ? '活跃' : '非活跃'}\t${row.createdAt}`)
    ].join('\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `数据表_${dateStr}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('已导出为文本文件，请在打印对话框中选择"另存为PDF"');
  }
}
