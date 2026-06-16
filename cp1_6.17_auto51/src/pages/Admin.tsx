import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface StatsData {
  totalVotes: number;
  totalParticipants: number;
  totalVotesCast: number;
  avgParticipation: number;
  votes: Array<{
    id: string;
    title: string;
    createdAt: string;
    totalVotes: number;
    participants: number;
  }>;
}

const Admin: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/votes/stats');
      setStats(response.data);
    } catch (err) {
      setSnackbar({ open: true, message: '加载统计数据失败', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const exportCsv = async (voteId: string) => {
    setExporting(voteId);
    try {
      const response = await axios.get(`/api/votes/${voteId}/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vote_${voteId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: '导出成功', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: '导出失败', severity: 'error' });
    } finally {
      setExporting(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const StatCard = ({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: string }) => (
    <Card
      sx={{
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        flex: 1,
        minWidth: isMobile ? '100%' : 180,
        overflow: 'visible'
      }}
    >
      <CardContent sx={{ padding: { xs: '16px', md: '20px' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Typography sx={{ fontSize: isMobile ? '24px' : '28px' }}>{icon}</Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '24px', md: '32px' },
              background: `linear-gradient(135deg, ${color}cc 0%, ${color} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {value}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#666', fontWeight: 500, fontSize: { xs: '13px', md: '14px' } }}>
          {label}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)',
        padding: { xs: '12px', md: '32px' },
        paddingBottom: { xs: '80px', md: '32px' }
      }}
    >
      <Box sx={{ maxWidth: 1100, margin: '0 auto' }}>
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
            管理后台
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <CircularProgress sx={{ color: '#fff' }} />
          </Box>
        ) : stats ? (
          <>
            <Box
              sx={{
                display: 'flex',
                gap: { xs: '12px', md: '20px' },
                marginBottom: '28px',
                flexWrap: 'wrap'
              }}
            >
              <StatCard label="总投票数" value={stats.totalVotes} color="#4A00E0" icon="📊" />
              <StatCard label="总参与人数" value={stats.totalParticipants} color="#8E2DE2" icon="👥" />
              <StatCard label="总投票次数" value={stats.totalVotesCast} color="#6A10E8" icon="🗳️" />
              <StatCard label="平均参与度" value={stats.avgParticipation} color="#A545E8" icon="📈" />
            </Box>

            <Card
              sx={{
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                overflow: 'visible'
              }}
            >
              <CardContent sx={{ padding: { xs: '12px', md: '20px' } }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#333', marginBottom: '16px', fontSize: { xs: '16px', md: '18px' } }}>
                  所有投票
                </Typography>
                {stats.votes.length === 0 ? (
                  <Typography variant="body1" sx={{ color: '#666', textAlign: 'center', padding: '30px' }}>
                    暂无投票数据
                  </Typography>
                ) : isMobile ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {stats.votes.map((v) => (
                      <Card
                        key={v.id}
                        sx={{
                          borderRadius: '10px',
                          background: '#fafafa',
                          padding: '14px'
                        }}
                      >
                        <Typography sx={{ fontWeight: 600, color: '#333', marginBottom: '8px', wordBreak: 'break-word' }}>
                          {v.title}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', fontSize: '12px', color: '#666' }}>
                          <span>📅 {formatDate(v.createdAt)}</span>
                          <span>👥 {v.participants} 人 · 🗳 {v.totalVotes} 票</span>
                        </Box>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={exporting === v.id ? <CircularProgress size={14} sx={{ color: '#8E2DE2' }} /> : <DownloadIcon />}
                          onClick={() => exportCsv(v.id)}
                          disabled={exporting === v.id}
                          size="small"
                          sx={{
                            borderRadius: '8px',
                            color: '#8E2DE2',
                            borderColor: '#8E2DE2',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '14px',
                            padding: '8px',
                            '&:hover': { borderColor: '#4A00E0', backgroundColor: 'rgba(142,45,226,0.05)' }
                          }}
                        >
                          {exporting === v.id ? '导出中...' : '导出CSV'}
                        </Button>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ background: 'linear-gradient(135deg, rgba(74,0,224,0.08) 0%, rgba(142,45,226,0.08) 100%)' }}>
                          <TableCell sx={{ fontWeight: 700, color: '#4A00E0', fontSize: '14px' }}>投票主题</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#4A00E0', fontSize: '14px' }}>创建时间</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#4A00E0', fontSize: '14px' }}>参与人数</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#4A00E0', fontSize: '14px' }}>总票数</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#4A00E0', fontSize: '14px' }}>操作</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats.votes.map((v, idx) => (
                          <TableRow
                            key={v.id}
                            sx={{
                              '&:nth-of-type(even)': { background: '#fafafa' },
                              '&:hover': { background: 'rgba(142,45,226,0.04)' },
                              transition: 'background 0.2s'
                            }}
                          >
                            <TableCell sx={{ fontSize: '14px', color: '#333', fontWeight: 500, maxWidth: 300 }}>
                              <Box
                                sx={{
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                                title={v.title}
                              >
                                {v.title}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontSize: '14px', color: '#666' }}>{formatDate(v.createdAt)}</TableCell>
                            <TableCell sx={{ fontSize: '14px', color: '#666' }}>{v.participants}</TableCell>
                            <TableCell sx={{ fontSize: '14px', color: '#666' }}>{v.totalVotes}</TableCell>
                            <TableCell>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={exporting === v.id ? <CircularProgress size={14} sx={{ color: '#8E2DE2' }} /> : <DownloadIcon />}
                                onClick={() => exportCsv(v.id)}
                                disabled={exporting === v.id}
                                sx={{
                                  borderRadius: '8px',
                                  color: '#8E2DE2',
                                  borderColor: '#8E2DE2',
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  '&:hover': { borderColor: '#4A00E0', backgroundColor: 'rgba(142,45,226,0.05)' }
                                }}
                              >
                                {exporting === v.id ? '导出中' : '导出CSV'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
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

export default Admin;
