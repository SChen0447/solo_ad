import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import CalendarView from './components/CalendarView';
import RecordEditor from './components/RecordEditor';
import SummaryPanel from './components/SummaryPanel';
import type { Record, WeeklySummary } from './types';
import { Plus, UtensilsCrossed } from 'lucide-react';

function App() {
  const [records, setRecords] = useState<Record[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecords();
    fetchWeeklySummary();
  }, [selectedDate]);

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/records');
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      console.error('Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklySummary = async () => {
    try {
      const res = await fetch(`/api/weekly-summary?date=${selectedDate}`);
      const data = await res.json();
      setWeeklySummary(data);
    } catch (err) {
      console.error('Failed to fetch weekly summary:', err);
    }
  };

  const handleAddRecord = (date: string) => {
    navigate(`/edit/${date}`);
  };

  const handleRecordSaved = () => {
    fetchRecords();
    fetchWeeklySummary();
    navigate('/');
  };

  const getRecordsByDate = (date: string) => {
    return records.filter(r => r.date === date);
  };

  const getDayBalanceScore = (date: string): number => {
    const dayRecords = getRecordsByDate(date);
    if (dayRecords.length === 0) return -1;
    const scores = dayRecords.map(r => r.nutrition.balanceScore);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const getBalanceColor = (score: number): string => {
    if (score < 0) return 'transparent';
    if (score < 40) return '#FF6B6B';
    if (score < 60) return '#FFA94D';
    if (score < 80) return '#94D82D';
    return '#51CF66';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-300 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-green-400 rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-gray-800">美食日志簿</h1>
              <p className="text-xs text-gray-500">记录每一餐，健康每一天</p>
            </div>
          </div>
          <button
            onClick={() => handleAddRecord(selectedDate)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl hover:from-orange-500 hover:to-orange-600 transition-all duration-200 hover-lift shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>添加记录</span>
          </button>
        </div>
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <main className="max-w-7xl mx-auto px-4 py-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <CalendarView
                    records={records}
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    onAddRecord={handleAddRecord}
                    getDayBalanceScore={getDayBalanceScore}
                    getBalanceColor={getBalanceColor}
                    getRecordsByDate={getRecordsByDate}
                  />
                </div>
                <div className="w-full lg:w-96">
                  <SummaryPanel
                    weeklySummary={weeklySummary}
                    selectedDate={selectedDate}
                  />
                </div>
              </div>
            </main>
          }
        />
        <Route
          path="/edit/:date"
          element={<RecordEditor onSave={handleRecordSaved} onCancel={() => navigate('/')} />}
        />
      </Routes>
    </div>
  );
}

export default App;
