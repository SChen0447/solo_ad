import React, { useEffect, useState } from 'react';
import { FixedSizeGrid, GridChildComponentProps } from 'react-window';
import { PurchaseRequest } from '../../backend/types';
import { fetchRequests } from '../Api';
import RequestCard from './RequestCard';

const CARD_WIDTH = 340;
const CARD_HEIGHT = 200;
const GAP = 20;

interface RequestListProps {}

const RequestList: React.FC<RequestListProps> = () => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const data = await fetchRequests();
        setRequests(data);
      } catch {
        console.error('Failed to load requests');
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
        const availableWidth = width - 48;
        const calculatedCols = Math.max(1, Math.floor((availableWidth + GAP) / (CARD_WIDTH + GAP)));
        setColumns(Math.min(calculatedCols, 3));
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const Cell = ({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
    const index = rowIndex * columns + columnIndex;
    if (index >= requests.length) return null;

    const request = requests[index];
    return (
      <div
        style={{
          ...style,
          left: (style.left as number) + GAP / 2,
          top: (style.top as number) + GAP / 2,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
        }}
      >
        <RequestCard request={request} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">申购列表</h1>
        <div className="empty-state">加载中...</div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">申购列表</h1>
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>暂无申购记录</p>
        </div>
      </div>
    );
  }

  const useVirtualScroll = requests.length > 20;
  const rowCount = Math.ceil(requests.length / columns);
  const gridWidth = columns * (CARD_WIDTH + GAP);
  const gridHeight = Math.min(rowCount * (CARD_HEIGHT + GAP), 800);

  return (
    <div className="page-container">
      <h1 className="page-title">申购列表</h1>
      {useVirtualScroll ? (
        <FixedSizeGrid
          className="virtual-list"
          columnCount={columns}
          columnWidth={CARD_WIDTH + GAP}
          height={gridHeight}
          rowCount={rowCount}
          rowHeight={CARD_HEIGHT + GAP}
          width={gridWidth}
        >
          {Cell}
        </FixedSizeGrid>
      ) : (
        <div
          className="card-grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(${CARD_WIDTH}px, 1fr))`,
          }}
        >
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
};

export default RequestList;
