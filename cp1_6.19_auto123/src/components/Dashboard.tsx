import { useCallback } from 'react';
import RecordForm from './RecordForm';
import CarbonCircle from './CarbonCircle';
import TrendLine from './TrendLine';
import Leaderboard from './Leaderboard';
import type { CommuteRecord, Friend } from '../types';

interface DashboardProps {
  records: CommuteRecord[];
  friends: Friend[];
  loading: boolean;
  onRecordAdded: (record: CommuteRecord) => void;
}

export default function Dashboard({
  records,
  friends,
  loading,
  onRecordAdded,
}: DashboardProps) {
  const handleRecordAdded = useCallback(
    (record: CommuteRecord) => {
      onRecordAdded(record);
    },
    [onRecordAdded]
  );

  return (
    <div className="dashboard">
      <div className="left-panel">
        <CarbonCircle records={records} />
        <TrendLine records={records} />
        <Leaderboard friends={friends} loading={loading} />
      </div>
      <div className="right-panel">
        <RecordForm onRecordAdded={handleRecordAdded} records={records} />
      </div>
    </div>
  );
}
