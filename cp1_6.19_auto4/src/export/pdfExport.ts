import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Comment } from '../types';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : (pdfFonts as any).vfs;

function htmlToPdfContent(html: string): Content[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  const content: Content[] = [];

  body.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node as Text).textContent?.trim();
      if (text) {
        content.push({ text, fontSize: 12, lineHeight: 1.5 });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      switch (tagName) {
        case 'h1':
          content.push({
            text: element.textContent || '',
            fontSize: 24,
            bold: true,
            margin: [0, 20, 0, 10],
            color: '#1e3a5f',
          });
          break;
        case 'h2':
          content.push({
            text: element.textContent || '',
            fontSize: 18,
            bold: true,
            margin: [0, 16, 0, 8],
            color: '#334155',
          });
          break;
        case 'h3':
          content.push({
            text: element.textContent || '',
            fontSize: 14,
            bold: true,
            margin: [0, 12, 0, 6],
            color: '#475569',
          });
          break;
        case 'p':
          content.push({
            text: element.textContent || '',
            fontSize: 12,
            lineHeight: 1.6,
            margin: [0, 8, 0, 8],
          });
          break;
        case 'ul':
        case 'ol':
          const listItems: Content[] = [];
          element.querySelectorAll('li').forEach((li) => {
            listItems.push({
              text: li.textContent || '',
              fontSize: 12,
              lineHeight: 1.5,
            });
          });
          content.push({
            [tagName === 'ul' ? 'ul' : 'ol']: listItems,
            margin: [0, 8, 0, 8],
          });
          break;
        case 'span':
          content.push({
            text: element.textContent || '',
            fontSize: 12,
            lineHeight: 1.5,
          });
          break;
        default:
          if (element.textContent?.trim()) {
            content.push({
              text: element.textContent || '',
              fontSize: 12,
              lineHeight: 1.5,
            });
          }
      }
    }
  });

  return content;
}

export function exportToPDF(content: string, comments: Comment[], title: string = 'RFP 文档') {
  const docContent: Content[] = [];

  docContent.push({
    text: title,
    fontSize: 28,
    bold: true,
    alignment: 'center',
    margin: [0, 0, 0, 30],
    color: '#1e3a5f',
  });

  docContent.push({
    text: `生成时间: ${new Date().toLocaleString('zh-CN')}`,
    fontSize: 10,
    color: '#64748b',
    alignment: 'center',
    margin: [0, 0, 0, 20],
  });

  const htmlContent = htmlToPdfContent(content);
  docContent.push(...htmlContent);

  if (comments.length > 0) {
    docContent.push({
      text: '',
      pageBreak: 'before',
    });

    docContent.push({
      text: '评论与批注',
      fontSize: 20,
      bold: true,
      margin: [0, 0, 0, 16],
      color: '#1e3a5f',
    });

    const pendingComments = comments.filter((c) => c.status === 'pending');
    const resolvedComments = comments.filter((c) => c.status === 'resolved');

    if (pendingComments.length > 0) {
      docContent.push({
        text: `待处理评论 (${pendingComments.length})`,
        fontSize: 14,
        bold: true,
        margin: [0, 12, 0, 8],
        color: '#92400e',
      });

      pendingComments.forEach((comment, index) => {
        docContent.push({
          table: {
            body: [
              [
                {
                  text: `#${index + 1} ${comment.author} - ${new Date(comment.timestamp).toLocaleString('zh-CN')}`,
                  bold: true,
                  fontSize: 11,
                  fillColor: '#fef3c7',
                  margin: [6, 4],
                },
              ],
              [
                {
                  text: `引用内容: "${comment.selectedText}"`,
                  fontSize: 10,
                  italics: true,
                  color: '#64748b',
                  margin: [6, 4, 6, 0],
                },
              ],
              [
                {
                  text: comment.text,
                  fontSize: 11,
                  margin: [6, 4],
                },
              ],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 4, 0, 8],
        });
      });
    }

    if (resolvedComments.length > 0) {
      docContent.push({
        text: `已解决评论 (${resolvedComments.length})`,
        fontSize: 14,
        bold: true,
        margin: [0, 12, 0, 8],
        color: '#065f46',
      });

      resolvedComments.forEach((comment, index) => {
        docContent.push({
          table: {
            body: [
              [
                {
                  text: `#${index + 1} ${comment.author} - ${new Date(comment.timestamp).toLocaleString('zh-CN')}`,
                  bold: true,
                  fontSize: 11,
                  fillColor: '#d1fae5',
                  margin: [6, 4],
                },
              ],
              [
                {
                  text: `引用内容: "${comment.selectedText}"`,
                  fontSize: 10,
                  italics: true,
                  color: '#64748b',
                  margin: [6, 4, 6, 0],
                },
              ],
              [
                {
                  text: comment.text,
                  fontSize: 11,
                  margin: [6, 4],
                },
              ],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 4, 0, 8],
        });
      });
    }
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 50, 40, 50],
    header: (currentPage: number, pageCount: number) => ({
      text: `${title}`,
      alignment: 'left',
      margin: [40, 20, 40, 0],
      fontSize: 10,
      color: '#94a3b8',
    }),
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: `生成于 ${new Date().toLocaleString('zh-CN')}`,
          alignment: 'left',
          fontSize: 9,
          color: '#94a3b8',
        },
        {
          text: `第 ${currentPage} 页 / 共 ${pageCount} 页`,
          alignment: 'right',
          fontSize: 9,
          color: '#94a3b8',
        },
      ],
      margin: [40, 10, 40, 10],
    }),
    content: docContent,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 12,
    },
  };

  pdfMake.createPdf(docDefinition).download(`${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}
