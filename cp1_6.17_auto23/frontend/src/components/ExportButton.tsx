import { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import type { ResumeData, Theme, ModuleItem } from '../types';
import { exportResumeConfig } from '../utils/parserService';

interface ExportButtonProps {
  resumeData: ResumeData;
  theme: Theme;
  moduleOrder: ModuleItem[];
  disabled?: boolean;
}

function ExportButton({ resumeData, theme, moduleOrder, disabled }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (disabled || isExporting) return;
    setIsExporting(true);

    try {
      await exportResumeConfig({
        resumeData,
        theme,
        moduleOrder,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;
      const lineHeight = 6;

      pdf.setFont('helvetica', 'normal');

      const addText = (text: string, size: number, weight: string, color: string) => {
        pdf.setFontSize(size);
        pdf.setFont('helvetica', weight);
        pdf.setTextColor(
          parseInt(color.slice(1, 3), 16),
          parseInt(color.slice(3, 5), 16),
          parseInt(color.slice(5, 7), 16)
        );
      };

      const wrapText = (text: string, maxWidth: number): string[] => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? currentLine + ' ' + word : word;
          const testWidth = (pdf.getStringUnitWidth(testLine) * pdf.getFontSize()) / 2.83;
          if (testWidth > maxWidth) {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
      };

      const checkNewPage = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
          return true;
        }
        return false;
      };

      const { personalInfo, workExperience, education, projects, skills } = resumeData;
      const enabledModules = moduleOrder.filter((m) => m.enabled);

      addText(personalInfo.name || '求职者', 22, 'bold', theme.primary);
      pdf.text(personalInfo.name || '求职者', margin, y);
      y += 10;

      if (personalInfo.title) {
        addText(personalInfo.title, 12, 'normal', theme.textSecondary);
        pdf.text(personalInfo.title, margin, y);
        y += 8;
      }

      const contactItems: string[] = [];
      if (personalInfo.phone) contactItems.push(`📞 ${personalInfo.phone}`);
      if (personalInfo.email) contactItems.push(`✉️ ${personalInfo.email}`);
      if (personalInfo.address) contactItems.push(`📍 ${personalInfo.address}`);
      if (personalInfo.age) contactItems.push(`🎂 ${personalInfo.age}岁`);

      const contactText = contactItems.join('  |  ');
      if (contactText) {
        addText(contactText, 9, 'normal', theme.textSecondary);
        const contactLines = wrapText(contactText, contentWidth);
        for (const line of contactLines) {
          pdf.text(line, margin, y);
          y += 5;
        }
        y += 4;
      }

      pdf.setDrawColor(
        parseInt(theme.primary.slice(1, 3), 16),
        parseInt(theme.primary.slice(3, 5), 16),
        parseInt(theme.primary.slice(5, 7), 16)
      );
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 8;

      for (const module of enabledModules) {
        if (module.key === 'workExperience' && workExperience.length > 0) {
          checkNewPage(15);
          addText('工作经历', 14, 'bold', theme.primary);
          pdf.text('工作经历', margin, y);
          y += 8;

          for (const work of workExperience) {
            checkNewPage(30);

            if (work.company) {
              addText(work.company, 11, 'bold', theme.text);
              pdf.text(work.company, margin, y);
            }
            const dateRange = `${work.startDate || ''}${work.startDate || work.endDate ? ' - ' : ''}${work.endDate || ''}`;
            if (dateRange.trim()) {
              addText(dateRange, 9, 'normal', theme.textSecondary);
              const dateWidth = (pdf.getStringUnitWidth(dateRange) * 9) / 2.83;
              pdf.text(dateRange, pageWidth - margin - dateWidth, y);
            }
            y += 6;

            if (work.position) {
              addText(work.position, 10, 'normal', theme.secondary);
              pdf.text(work.position, margin, y);
              y += 6;
            }

            if (work.description && work.description.length > 0) {
              for (const desc of work.description) {
                checkNewPage(6);
                addText(`• ${desc}`, 9, 'normal', theme.text);
                const descLines = wrapText(`• ${desc}`, contentWidth - 4);
                for (let i = 0; i < descLines.length; i++) {
                  pdf.text(i === 0 ? descLines[i] : '  ' + descLines[i], margin + 2, y);
                  y += lineHeight;
                }
              }
            }

            if (work.highlights && work.highlights.length > 0) {
              y += 2;
              for (const highlight of work.highlights) {
                checkNewPage(6);
                addText(`★ ${highlight}`, 9, 'bold', theme.accent);
                const hlLines = wrapText(`★ ${highlight}`, contentWidth - 4);
                for (let i = 0; i < hlLines.length; i++) {
                  pdf.text(i === 0 ? hlLines[i] : '  ' + hlLines[i], margin + 2, y);
                  y += lineHeight;
                }
              }
            }
            y += 4;
          }
        }

        if (module.key === 'education' && education.length > 0) {
          checkNewPage(15);
          addText('教育背景', 14, 'bold', theme.primary);
          pdf.text('教育背景', margin, y);
          y += 8;

          for (const edu of education) {
            checkNewPage(20);

            if (edu.school) {
              addText(edu.school, 11, 'bold', theme.text);
              pdf.text(edu.school, margin, y);
            }
            const eduDate = `${edu.startDate || ''}${edu.startDate || edu.endDate ? ' - ' : ''}${edu.endDate || ''}`;
            if (eduDate.trim()) {
              addText(eduDate, 9, 'normal', theme.textSecondary);
              const dateWidth = (pdf.getStringUnitWidth(eduDate) * 9) / 2.83;
              pdf.text(eduDate, pageWidth - margin - dateWidth, y);
            }
            y += 6;

            const degreeParts = [edu.degree, edu.major].filter(Boolean).join(' · ');
            if (degreeParts) {
              addText(degreeParts, 10, 'normal', theme.secondary);
              pdf.text(degreeParts, margin, y);
              y += 6;
            }

            if (edu.description) {
              addText(edu.description, 9, 'normal', theme.text);
              const descLines = wrapText(edu.description, contentWidth);
              for (const line of descLines) {
                pdf.text(line, margin, y);
                y += lineHeight;
              }
            }
            y += 4;
          }
        }

        if (module.key === 'projects' && projects.length > 0) {
          checkNewPage(15);
          addText('项目经历', 14, 'bold', theme.primary);
          pdf.text('项目经历', margin, y);
          y += 8;

          for (const project of projects) {
            checkNewPage(25);

            if (project.name) {
              addText(project.name, 11, 'bold', theme.text);
              pdf.text(project.name, margin, y);
            }
            const projDate = `${project.startDate || ''}${project.startDate || project.endDate ? ' - ' : ''}${project.endDate || ''}`;
            if (projDate.trim()) {
              addText(projDate, 9, 'normal', theme.textSecondary);
              const dateWidth = (pdf.getStringUnitWidth(projDate) * 9) / 2.83;
              pdf.text(projDate, pageWidth - margin - dateWidth, y);
            }
            y += 6;

            if (project.role) {
              addText(project.role, 10, 'normal', theme.secondary);
              pdf.text(project.role, margin, y);
              y += 6;
            }

            if (project.techStack && project.techStack.length > 0) {
              addText(`技术栈: ${project.techStack.join(', ')}`, 9, 'italic', theme.accent);
              const techLines = wrapText(`技术栈: ${project.techStack.join(', ')}`, contentWidth);
              for (const line of techLines) {
                pdf.text(line, margin, y);
                y += lineHeight;
              }
            }

            if (project.description && project.description.length > 0) {
              for (const desc of project.description) {
                checkNewPage(6);
                addText(`• ${desc}`, 9, 'normal', theme.text);
                const descLines = wrapText(`• ${desc}`, contentWidth - 4);
                for (let i = 0; i < descLines.length; i++) {
                  pdf.text(i === 0 ? descLines[i] : '  ' + descLines[i], margin + 2, y);
                  y += lineHeight;
                }
              }
            }
            y += 4;
          }
        }

        if (module.key === 'skills' && skills.length > 0) {
          checkNewPage(15);
          addText('专业技能', 14, 'bold', theme.primary);
          pdf.text('专业技能', margin, y);
          y += 8;

          addText(skills.join('  ·  '), 10, 'normal', theme.text);
          const skillLines = wrapText(skills.join('  ·  '), contentWidth);
          for (const line of skillLines) {
            pdf.text(line, margin, y);
            y += lineHeight;
          }
          y += 4;
        }
      }

      const fileName = `${personalInfo.name || 'resume'}_简历.pdf`;
      pdf.save(fileName);

      setTimeout(() => {
        setIsExporting(false);
      }, 500);
    } catch (error) {
      console.error('导出PDF失败:', error);
      setIsExporting(false);
    }
  };

  return (
    <button
      className="export-btn btn-block"
      onClick={handleExportPDF}
      disabled={disabled || isExporting}
      ref={resumeRef}
    >
      {isExporting ? '📄 正在导出...' : '📄 导出 PDF'}
    </button>
  );
}

export default ExportButton;
