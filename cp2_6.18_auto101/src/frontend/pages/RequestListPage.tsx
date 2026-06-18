import { useEffect, useState, useMemo } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
import type { PurchaseRequest } from '../../backend/types';
import { fetchRequests } from '../Api';
import { RequestCard } from '../components/RequestCard';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const CARD_WIDTH = 340;
const CARD_HEIGHT = 180;
const CARD_GAP = 24;

export function RequestListPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState(2);

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

  const useVirtualScroll = requests.length > 20;

  const gridData = useMemo(() => {
    return { requests, columns };
  }, [requests, columns]);

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
      <div style={headerStyle}>
        <h1 style={titleStyle}>申购列表</h1>
        <Link to="/create" style={createButtonStyle}>
          <Plus size={18} />
          新建申购
        </Link>
      </div>

      {requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
          暂无申购记录，点击上方按钮创建新的申购单
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
            height={Math.min(600, Math.ceil(requests.length / columns) * (CARD_HEIGHT + CARD_GAP))}
            rowCount={Math.ceil(requests.length / columns)}
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
          {requests.map((request) => (
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

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '32px',
  maxWidth: `${CARD_WIDTH * 2 + 24}px`,
  marginLeft: 'auto',
  marginRight: 'auto',
  width: '100%',
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
};
