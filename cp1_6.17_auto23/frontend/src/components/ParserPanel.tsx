import { useState } from 'react';
import { parseResume } from '../utils/parserService';
import type { ResumeData } from '../types';

const sampleResume = `张三
电话：13812345678
邮箱：zhangsan@example.com
地址：北京
年龄：28

工作经验
2021.03 - 至今  字节跳动  高级前端工程师
- 负责抖音创作者平台前端架构设计与开发
- 主导微前端改造，页面加载性能提升60%
- 搭建组件库，提升团队开发效率40%
- 优化用户体验，关键页面转化率提升15%
- 完成年度OKR，获得优秀员工称号

2019.06 - 2021.02  阿里巴巴  前端开发工程师
- 参与淘宝商家后台系统开发
- 实现复杂的数据可视化功能
- 负责移动端H5页面性能优化

教育背景
2015.09 - 2019.06  清华大学  计算机科学与技术  本科
- 获得国家奖学金
- GPA：3.8/4.0

项目经验
2022.01 - 2023.03  智能数据分析平台  项目负责人
- 设计并实现了基于React的可视化分析系统
- 支持千万级数据的实时渲染和交互
- 技术栈：React, TypeScript, D3.js, ECharts, Node.js

2020.08 - 2021.01  电商移动端项目  前端开发
- 完成微信小程序和H5双端开发
- 实现了复杂的购物车和支付流程
- 技术栈：Vue, 小程序, Less, Webpack

专业技能
React, Vue, TypeScript, JavaScript, Node.js, Webpack, Vite
HTML5, CSS3, SCSS, Less, ECharts, D3.js
MySQL, MongoDB, Redis, Docker, Git
性能优化, 微前端, 组件库开发, 敏捷开发
`;

interface ParserPanelProps {
  onParseComplete: (data: ResumeData) => void;
}

type ParseStatus = 'idle' | 'loading' | 'success' | 'error';

function ParserPanel({ onParseComplete }: ParserPanelProps) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<ParseStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [parsedInfo, setParsedInfo] = useState<{
    workCount: number;
    eduCount: number;
    projectCount: number;
    skillCount: number;
  } | null>(null);

  const handleParse = async () => {
    if (!text.trim()) {
      setStatus('error');
      setErrorMsg('请输入简历内容');
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    setParsedInfo(null);

    try {
      const startTime = Date.now();
      const data = await parseResume(text);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      onParseComplete(data);
      setStatus('success');
      setParsedInfo({
        workCount: data.workExperience.length,
        eduCount: data.education.length,
        projectCount: data.projects.length,
        skillCount: data.skills.length,
      });
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
      console.log(`解析完成，耗时 ${duration} 秒`);
    } catch (error) {
      setStatus('error');
      setErrorMsg(error instanceof Error ? error.message : '解析失败');
    }
  };

  const handleLoadSample = () => {
    setText(sampleResume);
    setStatus('idle');
    setErrorMsg('');
  };

  const handleClear = () => {
    setText('');
    setStatus('idle');
    setErrorMsg('');
    setParsedInfo(null);
  };

  return (
    <div className="panel-section">
      <div className="panel-section-title">简历解析</div>
      <textarea
        className="parser-textarea"
        placeholder="请粘贴您的简历文本内容...

支持格式示例：
- 姓名/电话/邮箱
- 工作经验（含时间范围、公司、职位、职责描述）
- 教育背景
- 项目经验
- 专业技能

点击「载入示例」查看完整示例"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {status !== 'idle' && (
        <div className={`parse-status ${status}`}>
          {status === 'loading' && <span>⏳ 正在解析...</span>}
          {status === 'success' && parsedInfo && (
            <span>
              ✅ 解析成功！工作经历:{parsedInfo.workCount} 教育:{parsedInfo.eduCount} 项目:
              {parsedInfo.projectCount} 技能:{parsedInfo.skillCount}
            </span>
          )}
          {status === 'error' && <span>❌ {errorMsg}</span>}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="btn btn-primary btn-block"
          onClick={handleParse}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? '解析中...' : '🔍 解析简历'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn btn-secondary" onClick={handleLoadSample} style={{ flex: 1 }}>
          📋 载入示例
        </button>
        <button className="btn btn-secondary" onClick={handleClear} style={{ flex: 1 }}>
          🗑️ 清空
        </button>
      </div>
    </div>
  );
}

export default ParserPanel;
