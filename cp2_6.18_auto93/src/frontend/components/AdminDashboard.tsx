import React, { useEffect, useState } from 'react';
import { PurchaseRequest, RequestStatus } from '../../backend/types';
import { fetchRequests, updateStatus } from '../Api';

const statusLabels: Record<RequestStatus, string> = {
  pending: '待审批',
  approved: '已批准',
  rejected: '已驳回',
  delivered: '已送达',
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface AdminDashboardProps {
  isAdmin: boolean;
  onShowToast: (type: 'success' | 'error', message: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isAdmin, onShowToast }) => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      const data = await fetchRequests();
      setRequests(data);
    } catch {
      onShowToast('error', '加载申购单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadRequests();
    }
  }, [isAdmin]);

  const handleUpdateStatus = async (id: string, status: RequestStatus) => {
    setProcessingId(id);
    try {
      const updated = await updateStatus(id, status);
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
      onShowToast(
        'success',
        status === 'approved' ? '已批准该申购单' : '已驳回该申购单'
      );
    } catch {
      onShowToast('error', '操作失败，请重试');
    } finally {
      setProcessingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="page-container">
        <h1 className="page-title">审批仪表板</h1>
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <p>请先以管理员身份登录</p>
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <div className="page-container">
      <h1 className="page-title">审批仪表板</h1>
      <div className="dashboard-container">
        {loading ? (
          <div className="empty-state">加载中...</div>
        ) : pendingRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <p>暂无待审批的申购单</p>
          </div>
        ) : (
          <table className="approval-table">
            <thead>
              <tr>
                <th>标题</th>
                <th>申请人</th>
                <th>物品数</th>
                <th>总金额</th>
                <th>创建时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((request) => (
                <tr key={request.id}>
                  <td style={{ fontWeight: 500, color: '#1f2937' }}>
                    {request.title}
                  </td>
                  <td>{request.applicant}</td>
                  <td>{request.items.length}</td>
                  <td style={{ fontWeight: 600 }}>
                    ¥{request.total.toFixed(2)}
                  </td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>
                    {formatDate(request.createdAt)}
                  </td>
                  <td>
                    <span
                      className={`status-badge status-${request.status}`}
                      key={request.status}
                    >
                      {statusLabels[request.status]}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="approve-btn"
                        onClick={() => handleUpdateStatus(request.id, 'approved')}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? '处理中...' : '批准'}
                      </button>
                      <button
                        className="reject-btn"
                        onClick={() => handleUpdateStatus(request.id, 'rejected')}
                        disabled={processingId === request.id}
                      >
                        驳回
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
