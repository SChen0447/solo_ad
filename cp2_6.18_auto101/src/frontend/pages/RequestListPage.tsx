import { useEffect, useState, useMemo } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
import type { PurchaseRequest } from '../../backend/types';
import { fetchRequests } from '../Api';
import { RequestCard } from '../components/RequestCard';
import { Plus, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const CARD_WIDTH = 340;
const CARD_HEIGHT = 180;
const CARD_GAP = 24;

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'delivered';

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已批准' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'delivered', label: '已送达' },
];

export function RequestListPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState(2);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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
    loadRequests();
  }, []);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setColumns(1);
      } else if (width < 1024) {
        setColumns(1);
      } else {
        setColumns(2);
      }
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

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

  const useVirtualScroll = filteredRequests.length > 20;

  const gridData = useMemo(() => {
    return { requests: filteredRequests, columns };
  }, [filteredRequests, columns]);

  const Cell = ({
    columnIndex,
    rowIndex,
    style,
    data,
  }: {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
    data: { requests: PurchaseRequest[]; columns: number };
  }) => {
    const index = rowIndex * data.columns + columnIndex;
    if (index >= data.requests.length) return null;
    const request = data.requests[index];
    return (
      <div
        style={{
          ...style,
          padding: `${CARD_GAP / 2}px`,
          boxSizing: 'border-box',
        }}
      >
        <RequestCard request={request} />
      </div>
    );
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

  return (
    <div style={pageStyle}>
      <div style={headerContainerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>申购列表</h1>
          <Link to="/create" style={createButtonStyle}>
            <Plus size={18} />
            新建申购
          </Link>
        </div>

        <div style={filterBarStyle}>
          <div style={searchBoxStyle}>
            <Search size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索标题或申请人..."
              style={searchInputStyle}
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

          <div style={selectWrapperStyle}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              style={selectStyle}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilter && (
            <button onClick={clearFilters} style={clearFilterButtonStyle}>
              <X size={14} />
              重置
            </button>
          )}

          <div style={resultCountStyle}>
            共 {filteredRequests.length} 条
            {hasActiveFilter && (
              <span style={{ color: '#9ca3af', marginLeft: '4px' }}>
                / {requests.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
          {hasActiveFilter ? (
            <>
              <div style={{ fontSize: '15px', color: '#374151', marginBottom: '6px', fontWeight: 500 }}>
                没有匹配的申购单
              </div>
              <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px' }}>
                试试清除搜索条件或更换筛选状态
              </div>
              <button onClick={clearFilters} style={clearFilterBigButtonStyle}>
                清除筛选
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '15px', color: '#374151', marginBottom: '6px', fontWeight: 500 }}>
                暂无申购记录
              </div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                点击上方「新建申购」按钮创建新的申购单
              </div>
            </>
          )}
        </div>
      ) : useVirtualScroll ? (
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Grid
            columnCount={columns}
            columnWidth={() => CARD_WIDTH + CARD_GAP}
            height={Math.min(
              600,
              Math.ceil(filteredRequests.length / columns) * (CARD_HEIGHT + CARD_GAP)
            )}
            rowCount={Math.ceil(filteredRequests.length / columns)}
            rowHeight={() => CARD_HEIGHT + CARD_GAP}
            width={columns * (CARD_WIDTH + CARD_GAP)}
            itemData={gridData}
          >
            {Cell}
          </Grid>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, ${CARD_WIDTH}px)`,
            gap: `${CARD_GAP}px`,
            justifyContent: 'center',
            width: '100%',
          }}
        >
          {filteredRequests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: 'calc(100vh - 56px)',
  backgroundColor: '#f3f4f6',
  padding: '32px 24px',
};

const headerContainerStyle: React.CSSProperties = {
  maxWidth: `${CARD_WIDTH * 2 + 24}px`,
  margin: '0 auto 32px auto',
  width: '100%',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
};

const filterBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap' as const,
  backgroundColor: '#ffffff',
  padding: '14px 16px',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
};

const searchBoxStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  flex: 1,
  minWidth: '200px',
  gap: '8px',
  padding: '0 10px 0 12px',
  backgroundColor: '#f9fafb',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  transition: 'all 0.2s ease-out',
};

const searchInputStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  padding: '9px 0',
  fontSize: '14px',
  color: '#1f2937',
};

const clearIconStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '4px',
  color: '#9ca3af',
  transition: 'all 0.15s ease-out',
};

const selectWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const selectStyle: React.CSSProperties = {
  appearance: 'none',
  padding: '9px 36px 9px 14px',
  fontSize: '14px',
  color: '#374151',
  backgroundColor: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  cursor: 'pointer',
  outline: 'none',
  transition: 'all 0.2s ease-out',
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
};

const clearFilterButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '7px 12px',
  fontSize: '13px',
  color: '#6b7280',
  backgroundColor: '#f9fafb',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease-out',
};

const clearFilterBigButtonStyle: React.CSSProperties = {
  padding: '9px 20px',
  fontSize: '14px',
  color: '#ffffff',
  backgroundColor: '#6b7280',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease-out',
};

const resultCountStyle: React.CSSProperties = {
  marginLeft: 'auto',
  fontSize: '13px',
  color: '#6b7280',
  fontWeight: 500,
  whiteSpace: 'nowrap' as const,
};

const emptyStateStyle: React.CSSProperties = {
  maxWidth: '480px',
  margin: '0 auto',
  textAlign: 'center',
  padding: '56px 32px',
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: 0,
};

const createButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  padding: '10px 20px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all 0.2s ease-out',
  cursor: 'pointer',
  border: 'none',
  whiteSpace: 'nowrap' as const,
};
