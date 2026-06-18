import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { PurchaseRequest } from '../../backend/types';
import { fetchRequests, updateStatus } from '../Api';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store';
import { CheckCircle2, XCircle, Package, ChevronDown, ChevronRight } from 'lucide-react';

function ItemsDetailTable({ request }: { request: PurchaseRequest }) {
  return (
    <div style={{ padding: '0 16px 16px 16px', backgroundColor: '#fafafa' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>
        📋 物品清单
      </div>
      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th style={itemThStyle('center', '40px')}>序号</th>
            <th style={itemThStyle('left')}>物品名称</th>
            <th style={itemThStyle('center', '60px')}>数量</th>
            <th style={itemThStyle('right', '80px')}>单价(¥)</th>
            <th style={itemThStyle('right', '90px')}>小计(¥)</th>
          </tr>
        </thead>
        <tbody>
          {request.items.map((item, index) => (
            <tr key={index} style={{ borderBottom: index < request.items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <td style={itemTdStyle('center')}>{index + 1}</td>
              <td style={itemTdStyle('left')}>{item.name}</td>
              <td style={itemTdStyle('center')}>{item.quantity}</td>
              <td style={itemTdStyle('right')}>{item.unitPrice.toLocaleString()}</td>
              <td style={{ ...itemTdStyle('right'), fontWeight: 600, color: '#1f2937' }}>
                {(item.quantity * item.unitPrice).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
            <td colSpan={4} style={{ padding: '8px 10px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#374151' }}>
              合计：
            </td>
            <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#1f2937' }}>
              ¥{request.total.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function itemThStyle(align: 'left' | 'center' | 'right', width?: string): React.CSSProperties {
  return {
    textAlign: align,
    padding: '8px 10px',
    fontWeight: 600,
    color: '#374151',
    fontSize: '12px',
    ...(width ? { width } : {}),
  };
}

function itemTdStyle(align: 'left' | 'center' | 'right'): React.CSSProperties {
  return {
    textAlign: align,
    padding: '7px 10px',
    color: '#4b5563',
    fontSize: '12px',
  };
}

type AdminStatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'delivered';

const adminStatusOptions: { value: AdminStatusFilter; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已批准' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'delivered', label: '已送达' },
];

export function AdminDashboardPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>('all');
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

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

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

  const filteredRequests = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return requests.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) {
        return false;
      }
      if (keyword) {
        const matchTitle = req.title.toLowerCase().includes(keyword);
        const matchApplicant = req.applicant.toLowerCase().includes(keyword);
        if (!matchTitle && !matchApplicant) {
          return false;
        }
      }
      return true;
    });
  }, [requests, searchKeyword, statusFilter]);

  const hasActiveFilter = searchKeyword.trim() !== '' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearchKeyword('');
    setStatusFilter('all');
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
          加载中...
        </div>
      </div>
    );
  }

  const renderTable = (
    dataList: PurchaseRequest[],
    showDeliverButton: boolean = false
  ) => {
    if (dataList.length === 0) {
      return <div style={emptyStyle}>暂无数据</div>;
    }

    return (
      <div style={tableContainerStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeaderStyle}>
                <th style={{ ...thStyle('center'), width: '40px' }}>
                  <span title="展开查看物品明细">📎</span>
                </th>
                <th style={thStyle('left')}>标题</th>
                <th style={thStyle('left')}>申请人</th>
                <th style={thStyle('right')}>总金额</th>
                <th style={thStyle('center')}>状态</th>
                <th style={thStyle('right')}>操作</th>
              </tr>
            </thead>
            <tbody>
              {dataList.map((request, index) => {
                const isExpanded = expandedIds.has(request.id);
                const baseBg = index % 2 === 0 ? '#f9fafb' : '#ffffff';
                return (
                  <React.Fragment key={request.id}>
                    <tr
                      style={{
                        ...tableRowStyle,
                        backgroundColor: baseBg,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e5e7eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = baseBg;
                      }}
                    >
                      <td style={{ ...tdStyle('center'), padding: '8px 12px' }}>
                        <button
                          onClick={() => toggleExpand(request.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6b7280',
                            transition: 'all 0.2s ease-out',
                          }}
                          title={isExpanded ? '收起明细' : '展开查看物品明细'}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#d1d5db';
                            e.currentTarget.style.color = '#1f2937';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#6b7280';
                          }}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td style={tdStyle('left')}>
                        <div style={{ fontWeight: 500, color: '#1f2937' }}>{request.title}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                          {new Date(request.createdAt).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td style={tdStyle('left')}>{request.applicant}</td>
                      <td style={{ ...tdStyle('right'), fontWeight: 600, color: '#1f2937' }}>
                        ¥{request.total.toLocaleString()}
                      </td>
                      <td style={tdStyle('center')}>
                        <StatusBadge status={request.status} />
                      </td>
                      <td style={{ ...tdStyle('right'), padding: '8px 12px' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {!showDeliverButton ? (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(request.id, 'approved')}
                                disabled={updatingId === request.id}
                                style={getActionButtonStyle('#22c55e')}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.backgroundColor = '#16a34a')
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.backgroundColor = '#22c55e')
                                }
                              >
                                <CheckCircle2 size={16} />
                                批准
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(request.id, 'rejected')}
                                disabled={updatingId === request.id}
                                style={getActionButtonStyle('#ef4444')}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.backgroundColor = '#dc2626')
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.backgroundColor = '#ef4444')
                                }
                              >
                                <XCircle size={16} />
                                驳回
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(request.id, 'delivered')}
                              disabled={updatingId === request.id}
                              style={getActionButtonStyle('#3b82f6')}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor = '#2563eb')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = '#3b82f6')
                              }
                            >
                              <Package size={16} />
                              标记送达
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    <tr
                      style={{
                        transition: 'all 0.35s ease-out',
                      }}
                    >
                      <td
                        colSpan={6}
                        style={{
                          padding: 0,
                          maxHeight: isExpanded ? '600px' : '0',
                          overflow: 'hidden',
                          transition: 'all 0.35s ease-out',
                          backgroundColor: '#fafafa',
                          borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
                        }}
                      >
                        <div
                          style={{
                            opacity: isExpanded ? 1 : 0,
                            transform: isExpanded ? 'translateY(0)' : 'translateY(-8px)',
                            transition: 'all 0.3s ease-out 0.05s',
                          }}
                        >
                          {isExpanded && <ItemsDetailTable request={request} />}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const getSectionTitle = (): { title: string; hint?: string; showDeliver: boolean } => {
    switch (statusFilter) {
      case 'pending':
        return { title: '待审批申购单', hint: '点击左侧箭头展开查看物品明细', showDeliver: false };
      case 'approved':
        return { title: '已批准（可标记送达）', showDeliver: true };
      case 'rejected':
        return { title: '已拒绝申购单', showDeliver: false };
      case 'delivered':
        return { title: '已送达申购单', showDeliver: false };
      default:
        return { title: '全部申购单', hint: '点击左侧箭头展开查看物品明细', showDeliver: false };
    }
  };

  const sectionInfo = getSectionTitle();

  const getListForCurrentFilter = () => {
    if (statusFilter !== 'all') {
      return filteredRequests;
    }
    return filteredRequests;
  };

  const shouldShowDeliverButton = (status: PurchaseRequest['status']) => {
    return status === 'approved';
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>审批仪表板</h1>

        <div style={statsStyle}>
          <div
            onClick={() => setStatusFilter('pending')}
            style={{
              ...statCardStyle('#fef3c7', '#92400e'),
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
              border: statusFilter === 'pending' ? '2px solid #f59e0b' : '2px solid transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{pendingRequests.length}</div>
            <div style={{ fontSize: '13px' }}>待审批</div>
          </div>
          <div
            onClick={() => setStatusFilter('approved')}
            style={{
              ...statCardStyle('#dcfce7', '#166534'),
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
              border: statusFilter === 'approved' ? '2px solid #22c55e' : '2px solid transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{approvedRequests.length}</div>
            <div style={{ fontSize: '13px' }}>已批准</div>
          </div>
          <div
            onClick={() => setStatusFilter('rejected')}
            style={{
              ...statCardStyle('#fee2e2', '#991b1b'),
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
              border: statusFilter === 'rejected' ? '2px solid #ef4444' : '2px solid transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{rejectedRequests.length}</div>
            <div style={{ fontSize: '13px' }}>已驳回</div>
          </div>
          <div
            onClick={() => setStatusFilter('delivered')}
            style={{
              ...statCardStyle('#dbeafe', '#1e40af'),
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
              border: statusFilter === 'delivered' ? '2px solid #3b82f6' : '2px solid transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{deliveredRequests.length}</div>
            <div style={{ fontSize: '13px' }}>已送达</div>
          </div>
        </div>

        <div style={adminFilterBarStyle}>
          <div style={adminSearchBoxStyle}>
            <Search size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索标题或申请人..."
              style={adminSearchInputStyle}
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                style={clearIconStyle}
                title="清除搜索"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AdminStatusFilter)}
              style={adminSelectStyle}
            >
              {adminStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilter && (
            <button onClick={clearFilters} style={adminClearBtnStyle}>
              <X size={14} />
              重置
            </button>
          )}

          <div style={adminResultStyle}>
            共 {filteredRequests.length} 条
            {hasActiveFilter && (
              <span style={{ color: '#9ca3af', marginLeft: '4px' }}>
                / {requests.length}
              </span>
            )}
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>
            {sectionInfo.title}
            {sectionInfo.hint && (
              <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#9ca3af', marginLeft: '10px' }}>
                {sectionInfo.hint}
              </span>
            )}
          </h2>

          {filteredRequests.length === 0 ? (
            <div style={adminEmptyStyle}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔍</div>
              {hasActiveFilter ? (
                <>
                  <div style={{ fontSize: '14px', color: '#374151', fontWeight: 500, marginBottom: '6px' }}>
                    没有匹配的申购单
                  </div>
                  <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '14px' }}>
                    试试清除搜索或更换筛选状态
                  </div>
                  <button onClick={clearFilters} style={adminClearBigStyle}>
                    清除筛选
                  </button>
                </>
              ) : (
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>暂无申购单</div>
              )}
            </div>
          ) : statusFilter === 'all' ? (
            <>
              {pendingRequests.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={subSectionTitleStyle}>
                    待审批 ({pendingRequests.length})
                  </h3>
                  {renderTable(
                    filteredRequests.filter((r) => r.status === 'pending'),
                    false
                  )}
                </div>
              )}
              {approvedRequests.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={subSectionTitleStyle}>
                    已批准 ({approvedRequests.length})
                  </h3>
                  {renderTable(
                    filteredRequests.filter((r) => r.status === 'approved'),
                    true
                  )}
                </div>
              )}
              {rejectedRequests.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={subSectionTitleStyle}>
                    已拒绝 ({rejectedRequests.length})
                  </h3>
                  {renderTable(
                    filteredRequests.filter((r) => r.status === 'rejected'),
                    false
                  )}
                </div>
              )}
              {deliveredRequests.length > 0 && (
                <div>
                  <h3 style={subSectionTitleStyle}>
                    已送达 ({deliveredRequests.length})
                  </h3>
                  {renderTable(
                    filteredRequests.filter((r) => r.status === 'delivered'),
                    false
                  )}
                </div>
              )}
            </>
          ) : (
            renderTable(getListForCurrentFilter(), sectionInfo.showDeliver)
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
    whiteSpace: 'nowrap' as const,
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
  display: 'flex',
  alignItems: 'center',
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
  minWidth: '720px',
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
  verticalAlign: 'middle',
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
