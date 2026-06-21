import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const templates = [
  {
    id: 'minimal',
    name: '极简风',
    primaryColor: '#f7fafc',
    secondaryColor: '#2d3748',
    description: '简洁干净，适合传统行业和商务岗位',
  },
  {
    id: 'tech',
    name: '科技风',
    primaryColor: '#1a202c',
    secondaryColor: '#38b2ac',
    description: '专业现代，适合技术岗位和互联网公司',
  },
  {
    id: 'creative',
    name: '创意风',
    primaryColor: '#fed7d7',
    secondaryColor: '#dd6b20',
    description: '活泼个性，适合设计和创意类岗位',
  },
];

app.get('/api/templates', (req, res) => {
  res.json(templates);
});

app.post('/api/export', async (req, res) => {
  try {
    const { html, fileName } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'HTML 内容不能为空' });
    }

    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    try {
      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: ['networkidle0', 'load'],
        timeout: 15000,
      });

      await page.waitForTimeout(500);

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px',
        },
        preferCSSPageSize: true,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName || 'resume')}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('PDF 导出错误:', error);
    res.status(500).json({ error: 'PDF 生成失败' });
  }
});

app.listen(PORT, () => {
  console.log(`后端服务已启动: http://localhost:${PORT}`);
});
