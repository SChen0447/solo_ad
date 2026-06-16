import React, { useState } from 'react';
import axios from 'axios';
import {
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  Snackbar,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import { QRCodeSVG } from 'qrcode.react';

interface VoteOption {
  id: number;
  text: string;
}

interface CreatedVote {
  id: string;
  link: string;
}

const VoteCreator: React.FC = () => {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState<VoteOption[]>([
    { id: 0, text: '' },
    { id: 1, text: '' }
  ]);
  const [isMultiple, setIsMultiple] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [createdVote, setCreatedVote] = useState<CreatedVote | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [loading, setLoading] = useState(false);

  const userId = localStorage.getItem('userId') || 'user_' + Math.random().toString(36).slice(2, 9);
  localStorage.setItem('userId', userId);

  const addOption = () => {
    const newId = options.length > 0 ? Math.max(...options.map(o => o.id)) + 1 : 0;
    setOptions([...options, { id: newId, text: '' }]);
  };

  const removeOption = (id: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter(o => o.id !== id));
  };

  const updateOption = (id: number, text: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, text } : o));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.text.trim());
    if (!title.trim() || validOptions.length < 2) {
      setSnackbar({ open: true, message: '请填写投票主题和至少2个有效选项', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/votes', {
        title: title.trim(),
        options: validOptions.map(o => o.text.trim()),
        isMultiple,
        deadline,
        userId
      });
      setCreatedVote(response.data);
      setSnackbar({ open: true, message: '投票创建成功！', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: '创建失败，请重试', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (createdVote) {
      const fullLink = window.location.origin + '/#/vote/' + createdVote.id;
      navigator.clipboard.writeText(fullLink);
      setSnackbar({ open: true, message: '链接已复制', severity: 'success' });
    }
  };

  const resetForm = () => {
    setTitle('');
    setOptions([{ id: 0, text: '' }, { id: 1, text: '' }]);
    setIsMultiple(false);
    setDeadline('');
    setCreatedVote(null);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)',
        padding: { xs: '16px', md: '40px' },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <Typography
        variant="h4"
        sx={{
          color: '#fff',
          fontWeight: 700,
          marginBottom: '24px',
          textShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}
      >
        创建投票
      </Typography>

      <Card
        sx={{
          width: '100%',
          maxWidth: 600,
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          overflow: 'visible'
        }}
      >
        <CardContent sx={{ padding: { xs: '16px', md: '28px' } }}>
          {!createdVote ? (
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="投票主题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                sx={{ marginBottom: '20px' }}
                variant="outlined"
                placeholder="请输入投票主题"
              />

              <Typography variant="subtitle1" sx={{ marginBottom: '12px', fontWeight: 600, color: '#333' }}>
                投票选项
              </Typography>
              {options.map((opt, idx) => (
                <Box key={opt.id} sx={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    label={`选项 ${idx + 1}`}
                    value={opt.text}
                    onChange={(e) => updateOption(opt.id, e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                  <IconButton
                    onClick={() => removeOption(opt.id)}
                    disabled={options.length <= 2}
                    sx={{
                      color: '#ff5252',
                      '&:hover': { backgroundColor: 'rgba(255,82,82,0.1)' },
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'scale(1.1)' }
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}

              <Button
                startIcon={<AddIcon />}
                onClick={addOption}
                sx={{
                  marginBottom: '20px',
                  color: '#8E2DE2',
                  '&:hover': { backgroundColor: 'rgba(142,45,226,0.1)' }
                }}
              >
                添加选项
              </Button>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isMultiple}
                      onChange={(e) => setIsMultiple(e.target.checked)}
                      sx={{ '& .MuiSwitch-colorPrimary.Mui-checked': { color: '#8E2DE2' } }}
                    />
                  }
                  label="允许多选"
                />
              </Box>

              <TextField
                fullWidth
                label="截止时间"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                sx={{ marginBottom: '24px' }}
                InputLabelProps={{ shrink: true }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)',
                  fontSize: '16px',
                  fontWeight: 600,
                  textTransform: 'none',
                  transition: 'transform 0.2s, filter 0.2s',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    filter: 'brightness(1.1)',
                    background: 'linear-gradient(135deg, #5A10F0 0%, #9E3DF2 100%)'
                  }
                }}
              >
                {loading ? '创建中...' : '创建投票'}
              </Button>
            </form>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#4A00E0', marginBottom: '16px' }}>
                🎉 投票创建成功！
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', marginBottom: '16px' }}>
                投票ID：{createdVote.id}
              </Typography>

              <Box
                sx={{
                  background: '#f5f5f5',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: '#333',
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginRight: '8px',
                    flex: 1
                  }}
                >
                  {window.location.origin + '/#/vote/' + createdVote.id}
                </Typography>
                <IconButton
                  onClick={copyLink}
                  sx={{
                    color: '#8E2DE2',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'scale(1.15)' }
                  }}
                >
                  <ContentCopyIcon />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowQR(true)}
                  sx={{
                    borderRadius: '8px',
                    color: '#8E2DE2',
                    borderColor: '#8E2DE2',
                    '&:hover': { borderColor: '#4A00E0', backgroundColor: 'rgba(142,45,226,0.05)' }
                  }}
                >
                  显示二维码
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    window.location.hash = `/vote/${createdVote.id}`;
                  }}
                  sx={{
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)',
                    '&:hover': { filter: 'brightness(1.1)' }
                  }}
                >
                  进入投票
                </Button>
                <Button
                  onClick={resetForm}
                  sx={{
                    borderRadius: '8px',
                    color: '#666',
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)' }
                  }}
                >
                  再创建一个
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showQR}
        onClose={() => setShowQR(false)}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            '@keyframes scaleIn': {
              '0%': { transform: 'scale(0.5)', opacity: 0 },
              '100%': { transform: 'scale(1)', opacity: 1 }
            }
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>扫码投票</span>
          <IconButton onClick={() => setShowQR(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', padding: '24px 24px 32px' }}>
          {createdVote && (
            <QRCodeSVG
              value={window.location.origin + '/#/vote/' + createdVote.id}
              size={220}
              level="H"
              fgColor="#4A00E0"
            />
          )}
          <Typography variant="body2" sx={{ marginTop: '16px', color: '#666' }}>
            使用手机扫描二维码参与投票
          </Typography>
        </DialogContent>
      </Dialog>

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

export default VoteCreator;
