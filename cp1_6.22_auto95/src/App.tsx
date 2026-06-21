import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TemplateSelect from './components/TemplateSelect';
import EditPage from './components/EditPage';
import { ResumeData, TemplateId } from './types';
import { generateId } from './utils';

const defaultResumeData: ResumeData = {
  name: '张三',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
  bio: '5年前端开发经验，擅长 React、Vue、TypeScript，热爱开源，专注用户体验与性能优化。',
  experiences: [
    {
      id: generateId(),
      company: 'ABC 科技有限公司',
      position: '高级前端工程师',
      period: '2022.03 - 至今',
      description: '负责公司核心产品的前端架构设计与开发，带领团队完成多个大型项目。',
    },
  ],
  skills: ['React', 'TypeScript', 'Vue.js', 'Node.js', 'Webpack', 'Vite', 'CSS3', 'Figma'],
  works: [
    {
      id: generateId(),
      title: '企业管理平台',
      description: '基于 React 的企业级中后台管理系统，包含权限、报表、数据可视化等功能。',
      thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    },
    {
      id: generateId(),
      title: '电商小程序',
      description: '使用 Taro 开发的跨端电商小程序，支持商品浏览、下单、支付等完整流程。',
      thumbnailUrl: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=300&fit=crop',
    },
  ],
};

export default function App() {
  const [resumeData, setResumeData] = useState<ResumeData>(defaultResumeData);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TemplateSelect />} />
        <Route
          path="/edit/:templateId"
          element={
            <EditPage
              resumeData={resumeData}
              setResumeData={setResumeData}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
