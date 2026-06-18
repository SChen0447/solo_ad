import { usePortfolioStore, CardData, SocialLink } from '../store';

const iconOptions: { type: SocialLink['type']; icon: string }[] = [
  { type: 'github', icon: 'fa-github' },
  { type: 'twitter', icon: 'fa-twitter' },
  { type: 'linkedin', icon: 'fa-linkedin' },
  { type: 'email', icon: 'fa-envelope' }
];

function parseContentForExport(content: string): string {
  let result = content;
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
  result = result.replace(/\n-\s(.*?)(?=\n|$)/g, '<li>$1</li>');
  result = result.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  result = result.replace(/\n/g, '<br />');
  if (result.includes('<li>')) {
    result = `<ul style="padding-left: 20px; margin: 8px 0;">${result.replace(/(<li>.*?<\/li>)/g, '$1').replace(/^(<br>)*|(<br>)*$/g, '')}</ul>`;
  }
  return result;
}

function getCardGridStyle(card: CardData): string {
  return `grid-column: ${card.x + 1} / span ${card.w}; grid-row: ${card.y + 1} / span ${card.h};`;
}

function generateCardHTML(card: CardData): string {
  const baseStyle = 'background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.15); transition: transform 0.3s ease, box-shadow 0.3s ease; display: flex; flex-direction: column;';
  
  let contentHTML = '';
  
  switch (card.type) {
    case 'project':
      contentHTML = `
        <div class="card project-card" style="${baseStyle}">
          ${card.image ? `<div style="width: 100%; height: 60%; background-image: url('${card.image}'); background-size: cover; background-position: center;"></div>` : ''}
          <div style="padding: 14px 16px; flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <h3 style="font-size: 15px; font-weight: 600; color: #333; margin: 0; line-height: 1.3;">${card.title || '项目标题'}</h3>
            <p style="font-size: 13px; color: #666; margin: 0; line-height: 1.5;">${card.description || '项目描述...'}</p>
          </div>
        </div>
      `;
      break;
      
    case 'text':
      contentHTML = `
        <div class="card text-card" style="${baseStyle} padding: 16px;">
          <div style="font-size: 14px; color: #333; line-height: 1.6; word-break: break-word;">
            ${parseContentForExport(card.content || '在这里输入文本内容...')}
          </div>
        </div>
      `;
      break;
      
    case 'contact':
      const linksHTML = card.links?.map(link => {
        const icon = iconOptions.find(i => i.type === link.type)?.icon || 'fa-link';
        const href = link.type === 'email' ? `mailto:${link.url}` : link.url;
        const target = link.type === 'email' ? '_self' : '_blank';
        return `
          <a href="${href}" target="${target}" rel="noopener noreferrer" style="
            width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
            background: #f5f5f5; border-radius: 50%; color: #666; text-decoration: none;
            transition: all 0.2s ease;
          " onmouseover="this.style.background='#667eea'; this.style.color='#fff'; this.style.transform='translateY(-3px) scale(1.1)'"
             onmouseout="this.style.background='#f5f5f5'; this.style.color='#666'; this.style.transform='translateY(0) scale(1)'">
            <i class="fab ${icon}" style="font-size: 18px;"></i>
          </a>
        `;
      }).join('') || '';
      
      contentHTML = `
        <div class="card contact-card" style="${baseStyle} padding: 20px 16px; align-items: center; gap: 12px;">
          <h3 style="font-size: 15px; font-weight: 600; color: #333; margin: 0;">${card.title || '联系方式'}</h3>
          <div style="display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;">
            ${linksHTML}
          </div>
        </div>
      `;
      break;
      
    default:
      contentHTML = '';
  }
  
  return `<div style="${getCardGridStyle(card)}">${contentHTML}</div>`;
}

function Exporter() {
  const cards = usePortfolioStore(state => state.cards);

  const generateHTML = () => {
    const sortedCards = [...cards].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    const cardsHTML = sortedCards.map(card => generateCardHTML(card)).join('\n');

    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>我的作品集</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .portfolio-container {
      max-width: 400px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      padding: 24px 16px;
      color: #fff;
    }
    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      border: 2px solid rgba(255,255,255,0.4);
    }
    .avatar i { font-size: 36px; color: #fff; }
    .name { font-size: 24px; font-weight: 600; margin-bottom: 6px; }
    .bio { font-size: 14px; opacity: 0.9; }
    .grid-container {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      grid-auto-rows: 80px;
      gap: 12px;
      padding: 16px 0;
    }
    @media (max-width: 480px) {
      .grid-container {
        grid-template-columns: repeat(12, 1fr);
        grid-auto-rows: 60px;
        gap: 8px;
      }
    }
    .card strong { font-weight: 600; }
    .card em { font-style: italic; }
    .card a { color: #4da6ff; text-decoration: none; border-bottom: 1px solid rgba(77,166,255,0.3); }
    .card a:hover { color: #3a8feb; border-bottom-color: #3a8feb; }
  </style>
</head>
<body>
  <div class="portfolio-container">
    <div class="header">
      <div class="avatar">
        <i class="fas fa-user"></i>
      </div>
      <h1 class="name">我的作品集</h1>
      <p class="bio">独立开发者 · 设计师</p>
    </div>
    <div class="grid-container">
      ${cardsHTML}
    </div>
  </div>
</body>
</html>`;

    return htmlContent;
  };

  const handleExport = () => {
    if (cards.length === 0) {
      alert('请先添加一些卡片再导出');
      return;
    }

    const html = generateHTML();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'portfolio_export.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button className="btn btn-primary" onClick={handleExport}>
      <i className="fas fa-download"></i>
      导出HTML
    </button>
  );
}

export default Exporter;
