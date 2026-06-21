import type { RehearsalReport } from '../types';

export async function generateReport(rehearsalId: string): Promise<RehearsalReport | null> {
  try {
    const res = await fetch(`/api/rehearsals/${rehearsalId}/report`);
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch (error) {
    console.error('生成报告失败:', error);
    return null;
  }
}

export function exportReportToPDF(report: RehearsalReport): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('请允许弹出窗口以导出报告');
    return;
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}小时${mins}分钟` : `${mins}分钟`;
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>排练报告 - ${report.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background: #f5f0e8;
      color: #333;
      padding: 40px;
    }
    .report-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 50px;
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
    }
    .report-header {
      text-align: center;
      border-bottom: 3px solid #6b4c9a;
      padding-bottom: 30px;
      margin-bottom: 30px;
    }
    .report-title {
      font-size: 28px;
      color: #6b4c9a;
      margin-bottom: 10px;
    }
    .report-subtitle {
      font-size: 14px;
      color: #888;
    }
    .report-info {
      display: flex;
      justify-content: space-around;
      background: #f9f5ff;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .info-item {
      text-align: center;
    }
    .info-label {
      font-size: 12px;
      color: #888;
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 20px;
      font-weight: bold;
      color: #6b4c9a;
    }
    .songs-section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      color: #6b4c9a;
      margin-bottom: 15px;
      border-left: 4px solid #6b4c9a;
      padding-left: 12px;
    }
    .song-card {
      background: #fafafa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
      border-left: 4px solid #d4af37;
    }
    .song-name {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      margin-bottom: 12px;
    }
    .song-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 12px;
    }
    .stat-item {
      text-align: center;
    }
    .stat-label {
      font-size: 11px;
      color: #999;
      margin-bottom: 4px;
    }
    .stat-value {
      font-size: 14px;
      font-weight: bold;
      color: #555;
    }
    .progress-bar-container {
      height: 8px;
      background: #eee;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #6b4c9a, #d4af37);
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .feedback-text {
      font-size: 13px;
      color: #666;
      font-style: italic;
      padding: 10px;
      background: #fff9e6;
      border-radius: 4px;
    }
    .improvements-section {
      margin-top: 30px;
      padding: 20px;
      background: #fff8e6;
      border-radius: 8px;
    }
    .improvements-title {
      font-size: 16px;
      color: #b8860b;
      margin-bottom: 10px;
    }
    .improvement-item {
      font-size: 14px;
      color: #666;
      padding: 8px 0;
      border-bottom: 1px dashed #f0e0b0;
    }
    .improvement-item:last-child {
      border-bottom: none;
    }
    .report-footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #aaa;
    }
    @media print {
      body { background: white; padding: 0; }
      .report-container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1 class="report-title">🎵 排练报告</h1>
      <p class="report-subtitle">${report.title}</p>
    </div>

    <div class="report-info">
      <div class="info-item">
        <div class="info-label">排练日期</div>
        <div class="info-value">${formatDate(report.date)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">总时长</div>
        <div class="info-value">${formatDuration(report.totalDuration)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">整体进度</div>
        <div class="info-value">${report.overallProgress.toFixed(0)}%</div>
      </div>
      <div class="info-item">
        <div class="info-label">平均得分</div>
        <div class="info-value">${report.averageScore.toFixed(1)}</div>
      </div>
    </div>

    <div class="songs-section">
      <h2 class="section-title">曲目详情</h2>
      ${report.songs
        .map(
          (song) => `
        <div class="song-card">
          <div class="song-name">${song.title}</div>
          <div class="song-stats">
            <div class="stat-item">
              <div class="stat-label">练习用时</div>
              <div class="stat-value">${song.duration} 分钟</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">目标进度</div>
              <div class="stat-value">${song.targetProgress}%</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">实际进度</div>
              <div class="stat-value">${song.actualProgress}%</div>
            </div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${song.actualProgress}%"></div>
          </div>
          <div class="song-stats" style="margin-top: 12px;">
            <div class="stat-item">
              <div class="stat-label">评分</div>
              <div class="stat-value">${'⭐'.repeat(Math.ceil(song.score / 20))} (${song.score}分)</div>
            </div>
          </div>
          ${song.feedback ? `<div class="feedback-text">💭 ${song.feedback}</div>` : ''}
        </div>
      `
        )
        .join('')}
    </div>

    <div class="improvements-section">
      <h2 class="improvements-title">📋 待改进事项</h2>
      ${report.songs
        .filter((s) => s.actualProgress < s.targetProgress || s.score < 70)
        .map(
          (song) => `
        <div class="improvement-item">
          • ${song.title}：${song.actualProgress < song.targetProgress ? `进度未达目标（${song.actualProgress}% / ${song.targetProgress}%）` : ''}
          ${song.score < 70 ? `表现需提升（${song.score}分）` : ''}
          ${song.feedback ? `- ${song.feedback}` : ''}
        </div>
      `
        )
        .join('') || '<div class="improvement-item">所有曲目表现良好，继续保持！</div>'}
    </div>

    <div class="report-footer">
      BandSync 排练报告 | 生成于 ${new Date().toLocaleString('zh-CN')}
    </div>
  </div>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}
