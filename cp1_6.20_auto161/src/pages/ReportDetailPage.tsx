import React from 'react';
import { useParams } from 'react-router-dom';
import InspectionReport from '../components/InspectionReport';

const ReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <InspectionReport reportId={id || null} canRegenerate />
    </div>
  );
};

export default ReportDetailPage;
