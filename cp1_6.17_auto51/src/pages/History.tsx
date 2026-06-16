import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  Alert,
  IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';

interface OptionSummary {
  text: string;
  votes: number;
}

interface HistoryItem {
  id: string;
  title: string;
  createdAt: string;
  totalVotes: number;
  participants: number;
  isCreator: boolean;
  optionsSummary: OptionSummary[];
}

interface VoteDetail {
  id: string;
  title: string;
  options: Array<{
    id: number;
    text: string;
    votes: number;
    timestamps: string[];
  }>;
  createdAt: string;
  deadline: string;
  totalVotes: number;
  voters: string[];
}

const GRADIENT_COLORS = ['#4A00E0', '#6A10E8', '#8E2DE2', '#A545E8', '#C065F0', '#D885F5'];

const History: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<string, VoteDetail>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const userId = localStorage.getItem('userId') || 'user_' + Math.random().toString(36).slice(2, 9);
  localStorage.setItem('userId', userId);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { userId };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await axios.get('/api/votes/history', { params });
      setHistory(response.data.history);
      setFilteredHistory(response.data.history);
    } catch (err) {
      setSnackbar({ open: true, message: '加载历史记录失败', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [userId, startDate, endDate]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSearch = () => {
    loadHistory();
  };

  const loadDetail = async (voteId: string) => {
    if (detailMap[voteId]) {
      setExpandedId(expandedId === voteId ? null : voteId);
      return;
    }
    setDetailLoading(voteId);
    try {
      const response = await axios.get(`/api/votes/${voteId}`);
      setDetailMap(prev => ({ ...prev, [voteId]: response.data }));
      setExpandedId(voteId);
    } catch (err) {
      setSnackbar({ open: true, message: '加载详情失败', severity: 'error' });
    } finally {
      setDetailLoading(null);
    }
  };

  const buildTimeSeries = (detail: VoteDetail) => {
    const allTimes: string[] = [];
    detail.options.forEach(opt => {
      opt.timestamps.forEach(t => allTimes.push(t));
    });
    allTimes.sort();
    if (allTimes.length === 0) return [];

    const startTime = new Date(allTimes[0]).getTime();
    const endTime = new Date(allTimes[allTimes.length - 1]).getTime();
    const totalSpan = endTime - startTime || 1;
    const bucketCount = Math.min(10, allTimes.length);
    const bucketSize = totalSpan / bucketCount;

    const buckets: Array<{ time: string; [key: string]: number | string }> = [];
    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = startTime + i * bucketSize;
      const date = new Date(bucketStart);
      buckets.push({
        time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
      });
      detail.options.forEach(opt => {
        buckets[i][opt.text] = 0;
      });
    }

    detail.options.forEach(opt => {
      opt.timestamps.forEach(t => {
        const tTime = new Date(t).getTime();
        const idx = Math.min(Math.floor((tTime - startTime) / bucketSize), bucketCount - 1);
        if (idx >= 0 && buckets[idx]) {
          (buckets[idx] as any)[opt.text] = ((buckets[idx] as any)[opt.text] || 0) + 1;
        }
      });
    });

    return buckets;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)',
        padding: { xs: '12px', md: '32px' },
        paddingBottom: { xs: '80px', md: '32px' }
      }}
    >
      <Box sx={{ maxWidth: 900, margin: '0 auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <IconButton
            onClick={() => { window.location.hash = '/'; }}
            sx={{ color: '#fff' }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h4"
            sx={{
              color: '#fff',
              fontWeight: 700,
              textShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            投票历史
          </Typography>
        </Box>

        <Card
          sx={{
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            marginBottom: '20px'
          }}
        >
          <CardContent sx={{ padding: { xs: '16px', md: '20px' } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#333', marginBottom: '12px' }}>
              日期筛选
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}
            >
              <TextField
                type="date"
                label="开始日期"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: isMobile ? '100%' : 180 }}
              />
              <TextField
                type="date"
                label="结束日期"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: isMobile ? '100%' : 180 }}
              />
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={handleSearch}
                size="small"
                sx={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)',
                  textTransform: 'none',
                  fontWeight: 600,
                  padding: isMobile ? '10px 20px' : '6px 16px',
                  fontSize: isMobile ? '16px' : '14px',
                  '&:hover': { filter: 'brightness(1.1)' }
                }}
              >
                搜索
              </Button>
            </Box>
          </CardContent>
        </Card>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <CircularProgress sx={{ color: '#fff' }} />
          </Box>
        ) : filteredHistory.length === 0 ? (
          <Card sx={{ borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#666' }}>
              暂无投票记录
            </Typography>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredHistory.map((item) => (
              <Card
                key={item.id}
                sx={{
                  borderRadius: '12px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                  overflow: 'visible',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-2px)' }
                }}
              >
                <Accordion
                  expanded={expandedId === item.id}
                  onChange={() => loadDetail(item.id)}
                  sx={{ boxShadow: 'none', background: 'transparent', '&:before': { display: 'none' } }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: '#8E2DE2' }} />}
                    sx={{ padding: { xs: '12px 16px', md: '16px 20px' } }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#333', fontSize: { xs: '16px', md: '18px' } }}>
                          {item.title}
                        </Typography>
                        <Chip
                          label={item.isCreator ? '创建' : '参与'}
                          size="small"
                          sx={{
                            background: item.isCreator
                              ? 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)'
                              : '#e0e0e0',
                            color: item.isCreator ? '#fff' : '#666',
                            '& .MuiChip-label': { fontWeight: 600, fontSize: '11px' }
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: { xs: '8px', md: '20px' }, flexWrap: 'wrap', fontSize: { xs: '12px', md: '14px' }, color: '#666' }}>
                        <span>📅 {formatDate(item.createdAt)}</span>
                        <span>👥 {item.participants} 人参与</span>
                        <span>🗳 {item.totalVotes} 票</span>
                      </Box>
                      {item.optionsSummary.length > 0 && (
                        <Box sx={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {item.optionsSummary.map((opt, idx) => (
                            <Chip
                              key={idx}
                              label={`${opt.text}: ${opt.votes}`}
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: GRADIENT_COLORS[idx % GRADIENT_COLORS.length],
                                color: GRADIENT_COLORS[idx % GRADIENT_COLORS.length],
                                '& .MuiChip-label': { fontSize: '11px' }
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ padding: { xs: '12px 16px 20px', md: '16px 24px 24px' }, borderTop: '1px solid #eee' }}>
                    {detailLoading === item.id ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                        <CircularProgress sx={{ color: '#8E2DE2' }} size={24} />
                      </Box>
                    ) : detailMap[item.id] ? (
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#4A00E0', marginBottom: '12px' }}>
                          详细结果
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                          {detailMap[item.id].options.map((opt, idx) => {
                            const percent = detailMap[item.id].totalVotes > 0
                              ? ((opt.votes / detailMap[item.id].totalVotes) * 100).toFixed(1)
                              : '0.0';
                            return (
                              <Box key={opt.id}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <Typography sx={{ fontSize: '14px', color: '#333', fontWeight: 500 }}>
                                    {opt.text}
                                  </Typography>
                                  <Typography sx={{ fontSize: '14px', color: '#666', fontWeight: 600 }}>
                                    {opt.votes} 票 ({percent}%)
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    width: '100%',
                                    height: '10px',
                                    background: '#f0f0f0',
                                    borderRadius: '5px',
                                    overflow: 'hidden'
                                  }}
                                >
                                  <Box
                                    sx={{
                                      height: '100%',
                                      background: GRADIENT_COLORS[idx % GRADIENT_COLORS.length],
                                      borderRadius: '5px',
                                      transition: 'width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                      width: `${percent}%`,
                                      minWidth: Number(percent) > 0 ? '2px' : '0'
                                    }}
                                  />
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>

                        {detailMap[item.id].options.some(o => o.timestamps.length > 0) && (
                          <>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#4A00E0', marginBottom: '12px' }}>
                              投票时间分布
                            </Typography>
                            <Box sx={{ width: '100%', height: isMobile ? 240 : 280 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={buildTimeSeries(detailMap[item.id])} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                                  <YAxis tick={{ fontSize: 11 }} />
                                  <Tooltip />
                                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                                  {detailMap[item.id].options.map((opt, idx) => (
                                    <Line
                                      key={opt.id}
                                      type="monotone"
                                      dataKey={opt.text}
                                      stroke={GRADIENT_COLORS[idx % GRADIENT_COLORS.length]}
                                      strokeWidth={2}
                                      dot={{ fill: GRADIENT_COLORS[idx % GRADIENT_COLORS.length], r: 3 }}
                                      activeDot={{ r: 5 }}
                                      animationDuration={500}
                                    />
                                  ))}
                                </LineChart>
                              </ResponsiveContainer>
                            </Box>
                          </>
                        )}

                        <Button
                          variant="outlined"
                          onClick={() => { window.location.hash = `/vote/${item.id}`; }}
                          sx={{
                            marginTop: '16px',
                            borderRadius: '8px',
                            color: '#8E2DE2',
                            borderColor: '#8E2DE2',
                            textTransform: 'none',
                            fontWeight: 600,
                            '&:hover': { borderColor: '#4A00E0', backgroundColor: 'rgba(142,45,226,0.05)' }
                          }}
                        >
                          查看投票页面
                        </Button>
                      </Box>
                    ) : null}
                  </AccordionDetails>
                </Accordion>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          borderTop: '1px solid #eee',
          padding: '10px 20px',
          justifyContent: 'space-around',
          zIndex: 100,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
        }}
      >
        <Button
          onClick={() => { window.location.hash = '/'; }}
          sx={{ color: '#8E2DE2', textTransform: 'none', fontWeight: 600 }}
        >
          创建投票
        </Button>
        <Button
          onClick={() => { window.location.hash = '/history'; }}
          sx={{ color: '#8E2DE2', textTransform: 'none', fontWeight: 600 }}
        >
          历史记录
        </Button>
        <Button
          onClick={() => { window.location.hash = '/admin'; }}
          sx={{ color: '#8E2DE2', textTransform: 'none', fontWeight: 600 }}
        >
          管理后台
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default History;
