import React from 'react';
import ReleaseTimeline from '../components/ReleaseTimeline';

const ReleasesPage: React.FC = () => {
  return (
    <>
      <div className="page-header">
        <h1>作品发布计划</h1>
        <p className="page-subtitle">管理所有艺术家的作品发行日期，拖拽调整发布时间</p>
      </div>
      <ReleaseTimeline />
    </>
  );
};

export default ReleasesPage;
