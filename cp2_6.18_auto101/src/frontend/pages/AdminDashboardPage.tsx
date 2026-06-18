import { useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { PurchaseRequest } from '../../backend/types';
import { fetchRequests, updateStatus } from '../Api';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store';
import { CheckCircle2, XCircle, Package } from 'lucide-react';

export function AdminDashboardPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const isLoggedIn = useAppStore((state) => state.isLoggedIn);
  const showToast = useAppStore((state) => state.showToast);
  const location = useLocation();

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const data = await fetchRequests();
        setRequests(data);
      } catch (error) {
        console.error('Failed to fetch requests:', error);
      } finally {
        setLoading(false);
      }
    };
    if (isLoggedIn) {
      loadRequests();
    }
  }, [isLoggedIn]);

  const handleUpdateStatus = useCallback(
    async (id: string, status: 'approved' | 'rejected' | 'delivered') => {
      setUpdatingId(id);
      try {
        const updated = await updateStatus(id, status);
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? updated : r))
        );
        const statusText =
          status === 'approved' ? '已批准' : status === 'rejected' ? '已驳回' : '已标记为已送达';
        showToast(`申购单${statusText}`, 'success');
      } catch (error) {
        console.error('Failed to update status:', error);
        showToast('操作失败，请重试', 'error');
      } finally {
        setUpdatingId(null);
      }
    },
    [showToast]
  );

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const approvedRequests = requests.filter((r) => r.status === 'approved');
  const rejectedRequests = requests.filter((r) => r.status === 'rejected');
  const deliveredRequests = requests.filter((r) => r.status === 'delivered');

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>审批仪表板</h1>

        <div style={statsStyle}>
          <div style={statCardStyle('#fef3c7', '#92400e')}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{pendingRequests.length}</div>
            <div style={{ fontSize: '13px' }}>待审批</div>
          </div>
          <div style={statCardStyle('#dcfce7', '#166534')}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{approvedRequests.length}</div>
            <div style={{ fontSize: '13px' }}>已批准</div>
          </div>
          <div style={statCardStyle('#fee2e2', '#991b1b')}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{rejectedRequests.length}</div>
            <div style={{ fontSize: '13px' }}>已驳回</div>
          </div>
          <div style={statCardStyle('#dbeafe', '#1e40af')}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{deliveredRequests.length}</div>
            <div style={{ fontSize: '13px' }}>已送达</div>
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>待审批申购单</h2>
          {pendingRequests.length === 0 ? (
            <div style={emptyStyle}>暂无待审批的申购单</div>
          ) : (
            <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr style={tableHeaderStyle}>
                    <th style={thStyle('left')}>标题</th>
                    <th style={thStyle('left')}>申请人</th>
                    <th style={thStyle('right')}>总金额</th>
                    <th style={thStyle('center')}>状态</th>
                    <th style={thStyle('right')}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((request, index) => (
                    <tr
                      key={request.id}
                      style={{
                        ...tableRowStyle,
                        backgroundColor: index % 2 === 0 ? '#f9fafb' : '#ffffff',
                      }}
                    >
                      <td style={tdStyle('left')}>{request.title}</td>
                      <td style={tdStyle('left')}>{request.applicant}</td>
                      <td style={tdStyle('right')}>¥{request.total.toLocaleString()}</td>
                      <td style={tdStyle('center')}>
                        <StatusBadge status={request.status} />
                      </td>
                      <td style={{ ...tdStyle('right'), display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleUpdateStatus(request.id, 'approved')}
                          disabled={updatingId === request.id}
                          style={getActionButtonStyle('#22c55e')}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#16a34a')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#22c55e')}
                        >
                          <CheckCircle2 size={16} />
                          批准
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(request.id, 'rejected')}
                          disabled={updatingId === request.id}
                          style={getActionButtonStyle('#ef4444')}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
                        >
                          <XCircle size={16} />
                          驳回
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>已批准（可标记送达）</h2>
          {approvedRequests.length === 0 ? (
            <div style={emptyStyle}>暂无已批准的申购单</div>
          ) : (
            <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr style={tableHeaderStyle}>
                    <th style={thStyle('left')}>标题</th>
                    <th style={thStyle('left')}>申请人</th>
                    <th style={thStyle('right')}>总金额</th>
                    <th style={thStyle('center')}>状态</th>
                    <th style={thStyle('right')}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedRequests.map((request, index) => (
                    <tr
                      key={request.id}
                      style={{
                        ...tableRowStyle,
                        backgroundColor: index % 2 === 0 ? '#f9fafb' : '#ffffff',
                      }}
                    >
                      <td style={tdStyle('left')}>{request.title}</td>
                      <td style={tdStyle('left')}>{request.applicant}</td>
                      <td style={tdStyle('right')}>¥{request.total.toLocaleString()}</td>
                      <td style={tdStyle('center')}>
                        <StatusBadge status={request.status} />
                      </td>
                      <td style={{ ...tdStyle('right'), display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleUpdateStatus(request.id, 'delivered')}
                          disabled={updatingId === request.id}
                          style={getActionButtonStyle('#3b82f6')}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
                        >
                          <Package size={16} />
                          标记送达
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getActionButtonStyle(color: string): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    backgroundColor: color,
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
  };
}

const pageStyle: React.CSSProperties = {
  minHeight: 'calc(100vh - 56px)',
  backgroundColor: '#f3f4f6',
  padding: '32px 24px',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0 0 24px 0',
};

const statsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '16px',
  marginBottom: '32px',
};

const statCardStyle = (bgColor: string, textColor: string): React.CSSProperties => ({
  backgroundColor: bgColor,
  color: textColor,
  padding: '20px',
  borderRadius: '12px',
  textAlign: 'center',
});

const sectionStyle: React.CSSProperties = {
  marginBottom: '32px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#374151',
  margin: '0 0 16px 0',
};

const tableContainerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  border: '1px solid #e5e7eb',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const tableHeaderStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderBottom: '2px solid #e5e7eb',
};

const tableRowStyle: React.CSSProperties = {
  height: '48px',
  transition: 'background-color 0.2s ease-out',
  cursor: 'default',
};

const tableRowHoverProps = {
  onMouseEnter: (e: React.MouseEvent<HTMLTableRowElement>) => {
    e.currentTarget.style.backgroundColor = '#e5e7eb';
  },
  onMouseLeave: (e: React.MouseEvent<HTMLTableRowElement>, index: number) => {
    e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';
  },
};

const thStyle = (align: 'left' | 'center' | 'right'): React.CSSProperties => ({
  textAlign: align,
  padding: '12px 16px',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
});

const tdStyle = (align: 'left' | 'center' | 'right'): React.CSSProperties => ({
  textAlign: align,
  padding: '12px 16px',
  fontSize: '14px',
  color: '#374151',
  borderBottom: '1px solid #f3f4f6',
});

const emptyStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: '48px',
  textAlign: 'center',
  color: '#9ca3af',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};
