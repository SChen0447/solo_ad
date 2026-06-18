import jsPDF from 'jspdf';
import { TemplateType } from '../types/design';
import { getTemplateSize } from './layoutCalculator';

export interface TemplateCanvasRef {
  toDataURL: (type?: string, quality?: number) => string;
}

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

export const generatePDF = async (
  canvases: Record<TemplateType, TemplateCanvasRef>
): Promise<void> => {
  const templates: TemplateType[] = [
    'business-card-front',
    'business-card-back',
    'letterhead',
    'twitter-cover',
    'instagram-cover',
    'linkedin-cover'
  ];

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 0; i < templates.length; i++) {
    const templateType = templates[i];
    const canvas = canvases[templateType];
    
    if (!canvas) continue;

    if (i > 0) {
      doc.addPage();
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const { width, height } = getTemplateSize(templateType);
    
    const aspectRatio = width / height;
    let imgWidth = pageWidth - 40;
    let imgHeight = imgWidth / aspectRatio;
    
    if (imgHeight > pageHeight - 60) {
      imgHeight = pageHeight - 60;
      imgWidth = imgHeight * aspectRatio;
    }
    
    const x = (pageWidth - imgWidth) / 2;
    const y = 30;

    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text(getTemplateLabel(templateType), pageWidth / 2, 15, { align: 'center' });

    doc.addImage(dataUrl, 'JPEG', x, y, imgWidth, imgHeight);

    doc.setFontSize(10);
    doc.setTextColor(153, 153, 153);
    const sizeLabel = getTemplateSizeLabel(templateType);
    doc.text(sizeLabel, pageWidth / 2, y + imgHeight + 10, { align: 'center' });
  }

  const fileName = `品牌视觉手册_${formatDate(new Date())}.pdf`;
  doc.save(fileName);
};

const getTemplateLabel = (templateType: TemplateType): string => {
  const labels: Record<TemplateType, string> = {
    'business-card-front': '名片 - 正面',
    'business-card-back': '名片 - 背面',
    'letterhead': '信纸',
    'twitter-cover': 'Twitter 封面',
    'instagram-cover': 'Instagram 封面',
    'linkedin-cover': 'LinkedIn 封面'
  };
  return labels[templateType];
};

const getTemplateSizeLabel = (templateType: TemplateType): string => {
  const labels: Record<TemplateType, string> = {
    'business-card-front': '90mm × 54mm',
    'business-card-back': '90mm × 54mm',
    'letterhead': 'A4 (210mm × 297mm)',
    'twitter-cover': '1500px × 500px',
    'instagram-cover': '1080px × 1080px',
    'linkedin-cover': '1584px × 396px'
  };
  return labels[templateType];
};

export const getTemplateLabelFn = getTemplateLabel;
export const getTemplateSizeLabelFn = getTemplateSizeLabel;
