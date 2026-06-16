import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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
  Chip
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import socketManager from '../utils/socket';

interface VoteOption {
  id: number;
  text: string;
  votes: number;
  timestamps: string[];
}

interface VoteData {
  id: string;
  title: string;
  options: VoteOption[];
  isMultiple: boolean;
  deadline: string;
  createdAt: string;
  totalVotes: number;
  voters: string[];
}

const GRADIENT_COLORS = ['#4A00E0', '#6A10E8', '#8E2DE2', '#A545E8', '#C065F0', '#D885F5'];

const VotePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [vote, setVote] = useState<VoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [isEnded, setIsEnded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const userId = localStorage.getItem('userId') || 'user_' + Math.random().toString(36).slice(2, 9);
  localStorage.setItem('userId', userId);

  const resizeRef = useRef<() => void>();
  resizeRef.current = () => setIsMobile(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => resizeRef.current?.();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadVote = useCallback(async () => {
    if (!id) return;
    try {
      const response = await axios.get(`/api/votes/${id}`);
      const data: VoteData = response.data;
      setVote(data);
      if (data.voters.includes(userId)) {
        setHasVoted(true);
      }
      setLoading(false);
    } catch (err) {
      setError('投票不存在或加载失败');
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => {
    loadVote();
  }, [loadVote]);

  useEffect(() => {
    if (!id) return;
    socketManager.joinVote(id);
    const off = socketManager.onVoteUpdated((data) => {
      if (data.voteId === id) {
        setVote(data.vote);
        if (data.vote.voters.includes(userId)) {
          setHasVoted(true);
        }
      }
    });
    return () => {
      off();
      socketManager.leaveVote(id);
    };
  }, [id, userId]);

  useEffect(() => {
    if (!vote?.deadline) {
      setCountdown('无截止时间');
      return;
    }
    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(vote.deadline).getTime();
      const diff = target - now;
      if (diff <= 0) {
        setCountdown('投票已结束');
        setIsEnded(true);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      const parts: string[] = [];
      if (days > 0) parts.push(`${days}天`);
      if (hours > 0 || days > 0) parts.push(`${hours}时`);
      parts.push(`${mins.toString().padStart(2, '0')}分`);
      parts.push(`${secs.toString().padStart(2, '0')}秒`);
      setCountdown(parts.join(' '));
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [vote?.deadline]);

  const toggleOption = (optId: number) => {
    if (hasVoted || isEnded || submitting) return;
    if (vote?.isMultiple) {
      setSelectedOptions(prev =>
        prev.includes(optId) ? prev.filter(i => i !== optId) : [...prev, optId]
      );
    } else {
      setSelectedOptions([optId]);
    }
  };

  const handleSubmit = async () => {
    if (!id || selectedOptions.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await axios.post(`/api/votes/${id}/vote`, {
        optionIds: selectedOptions,
        userId
      });
      setHasVoted(true);
      setSnackbar({ open: true, message: '投票成功！', severity: 'success' });
    } catch (err: any) {
      const msg = err.response?.data?.error || '投票失败';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <CircularProgress sx={{ color: '#8E2DE2' }} />
      </Box>
    );
  }

  if (error || !vote) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5', padding: '20px' }}>
        <Card sx={{ borderRadius: '12px', padding: '24px' }}>
          <Typography color="error" variant="h6">{error || '投票不存在'}</Typography>
        </Card>
      </Box>
    );
  }

  const chartData = vote.options.map((opt, idx) => ({
    name: opt.text.length > (isMobile ? 6 : 12) ? opt.text.slice(0, isMobile ? 6 : 12) + '...' : opt.text,
    fullName: opt.text,
    votes: opt.votes,
    percent: vote.totalVotes > 0 ? ((opt.votes / vote.totalVotes) * 100).toFixed(1) : '0.0',
    color: GRADIENT_COLORS[idx % GRADIENT_COLORS.length]
  }));

  const maxVotes = Math.max(...vote.options.map(o => o.votes), 1);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)',
        padding: { xs: '12px', md: '32px' },
        paddingBottom: { xs: '80px', md: '32px' },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 700,
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          overflow: 'visible'
        }}
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)',
            padding: { xs: '16px', md: '24px' },
            borderRadius: '12px 12px 0 0'
          }}
        >
          <Typography
            variant="h5"
            sx={{
              color: '#fff',
              fontWeight: 700,
              marginBottom: '10px',
              wordBreak: 'break-word'
            }}
          >
            {vote.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label={vote.isMultiple ? '多选' : '单选'}
              size="small"
              sx={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                '& .MuiChip-label': { fontWeight: 600 }
              }}
            />
            <Chip
              label={`${vote.totalVotes} 票`}
              size="small"
              sx={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                '& .MuiChip-label': { fontWeight: 600 }
              }}
            />
            {hasVoted && (
              <Chip
                label="已投票"
                size="small"
                sx={{
                  background: 'rgba(76,175,80,0.8)',
                  color: '#fff',
                  '& .MuiChip-label': { fontWeight: 600 }
                }}
              />
            )}
          </Box>
          <Box
            sx={{
              marginTop: '12px',
              padding: '10px 16px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            <Typography
              sx={{
                color: '#fff',
                fontWeight: 700,
                fontSize: { xs: '1.5em', md: '1em' }
              }}
            >
              ⏱ {countdown}
            </Typography>
          </Box>
        </Box>

        <CardContent sx={{ padding: { xs: '16px', md: '24px' } }}>
          {!hasVoted && !isEnded && (
            <Box sx={{ marginBottom: '24px' }}>
              <Typography variant="subtitle1" sx={{ marginBottom: '12px', fontWeight: 600, color: '#333' }}>
                {vote.isMultiple ? '请选择一个或多个选项' : '请选择一个选项'}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '14px' : '10px' }}>
                {vote.options.map((opt, idx) => {
                  const isSelected = selectedOptions.includes(opt.id);
                  return (
                    <Box
                      key={opt.id}
                      onClick={() => toggleOption(opt.id)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '16px' : '12px',
                        padding: isMobile ? '14px 16px' : '12px 16px',
                        borderRadius: '12px',
                        border: isSelected
                          ? `2px solid ${GRADIENT_COLORS[idx % GRADIENT_COLORS.length]}`
                          : '2px solid #e0e0e0',
                        background: isSelected
                          ? `linear-gradient(135deg, rgba(74,0,224,0.08) 0%, rgba(142,45,226,0.08) 100%)`
                          : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.02)',
                          borderColor: GRADIENT_COLORS[idx % GRADIENT_COLORS.length]
                        }
                      }}
                    >
                      <Box
                        sx={{
                          width: isMobile ? '36px' : '28px',
                          height: isMobile ? '36px' : '28px',
                          borderRadius: '50%',
                          border: `3px solid ${isSelected ? GRADIENT_COLORS[idx % GRADIENT_COLORS.length] : '#ccc'}`,
                          background: isSelected ? GRADIENT_COLORS[idx % GRADIENT_COLORS.length] : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? `0 0 12px ${GRADIENT_COLORS[idx % GRADIENT_COLORS.length]}80` : 'none'
                        }}
                      >
                        {isSelected && (
                          <Typography sx={{ color: '#fff', fontSize: isMobile ? '18px' : '14px', fontWeight: 700 }}>
                            ✓
                          </Typography>
                        )}
                      </Box>
                      <Typography sx={{ flex: 1, color: '#333', fontWeight: isSelected ? 600 : 400, fontSize: isMobile ? '16px' : '15px' }}>
                        {opt.text}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
              <Button
                fullWidth
                variant="contained"
                disabled={selectedOptions.length === 0 || submitting}
                onClick={handleSubmit}
                sx={{
                  marginTop: '20px',
                  padding: isMobile ? '14px 24px' : '12px 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)',
                  fontSize: isMobile ? '18px' : '16px',
                  fontWeight: 600,
                  textTransform: 'none',
                  transition: 'transform 0.2s, filter 0.2s',
                  '&:hover:not(:disabled)': {
                    transform: 'scale(1.05)',
                    filter: 'brightness(1.1)'
                  },
                  '&:disabled': {
                    background: '#ccc'
                  }
                }}
              >
                {submitting ? '提交中...' : '提交投票'}
              </Button>
            </Box>
          )}

          {(hasVoted || isEnded) && (
            <Box>
              <Typography variant="h6" sx={{ marginBottom: '16px', fontWeight: 600, color: '#4A00E0' }}>
                📊 实时投票结果
              </Typography>

              <Box sx={{ marginBottom: '24px' }}>
                {vote.options.map((opt, idx) => {
                  const percent = vote.totalVotes > 0 ? (opt.votes / vote.totalVotes) * 100 : 0;
                  return (
                    <Box key={opt.id} sx={{ marginBottom: '14px' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <Typography sx={{ fontSize: '14px', color: '#333', fontWeight: 500 }}>
                          {opt.text}
                        </Typography>
                        <Typography sx={{ fontSize: '14px', color: '#666', fontWeight: 600 }}>
                          {opt.votes} 票 ({percent.toFixed(1)}%)
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: '100%',
                          height: isMobile ? '18px' : '24px',
                          background: '#f0f0f0',
                          borderRadius: '10px',
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            background: `linear-gradient(90deg, ${GRADIENT_COLORS[idx % GRADIENT_COLORS.length]}cc 0%, ${GRADIENT_COLORS[idx % GRADIENT_COLORS.length]} 100%)`,
                            borderRadius: '10px',
                            transition: 'width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            width: `${percent}%`,
                            minWidth: percent > 0 ? '2px' : '0'
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              <Box sx={{ width: '100%', height: isMobile ? 260 : 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {isMobile ? (
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                    >
                      <XAxis type="number" domain={[0, maxVotes]} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={80}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: any, _name: any, props: any) => [
                          `${value} 票 (${props.payload.percent}%)`,
                          props.payload.fullName
                        ]}
                      />
                      <Bar
                        dataKey="votes"
                        animationDuration={300}
                        animationEasing="ease-out"
                        radius={[0, 6, 6, 0]}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        <LabelList dataKey="votes" position="right" fill="#333" fontSize={12} fontWeight={600} />
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis domain={[0, maxVotes]} />
                      <Tooltip
                        formatter={(value: any, _name: any, props: any) => [
                          `${value} 票 (${props.payload.percent}%)`,
                          props.payload.fullName
                        ]}
                      />
                      <Bar
                        dataKey="votes"
                        animationDuration={300}
                        animationEasing="ease-out"
                        radius={[6, 6, 0, 0]}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        <LabelList dataKey="votes" position="top" fill="#333" fontSize={13} fontWeight={600} />
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

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

export default VotePage;
