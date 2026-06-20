import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionCard from '../components/QuestionCard';
import {
  authApi,
  bankApi,
  questionApi,
  statsApi,
  User,
  QuestionBank,
  Question,
  ClassStats,
  KnowledgeStat,
  QuestionType,
} from '../api/examApi';

type ViewType =
  | 'banks'
  | 'bankDetail'
  | 'addQuestion'
  | 'batchImport'
  | 'stats';

const TeacherDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '', mode: 'login' as 'login' | 'register' });
  const [loginMsg, setLoginMsg] = useState('');

  const [view, setView] = useState<ViewType>('banks');
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [selectedQIds, setSelectedQIds] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<ClassStats | null>(null);
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStat[]>([]);

  const [newBankForm, setNewBankForm] = useState({ name: '', subject: '', difficulty: '中等' });
  const [showNewBankModal, setShowNewBankModal] = useState(false);

  const [newQ, setNewQ] = useState<Partial<Question>>({
    type: 'single',
    content: '',
    options: ['', '', '', ''],
    answer: '',
    explanation: '',
    score: 5,
    difficulty: '中等',
    knowledge_tags: [],
  });
  const [newTagInput, setNewTagInput] = useState('');

  const [batchText, setBatchText] = useState('');
  const [batchMsg, setBatchMsg] = useState('');

  const [loading, setLoading] = useState(false);
  const [globalMsg, setGlobalMsg] = useState({ text: '', type: '' as 'success' | 'error' });

  const barCanvasRef = useRef<HTMLCanvasElement>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setGlobalMsg({ text, type });
    setTimeout(() => setGlobalMsg({ text: '', type: '' }), 3000);
  };

  useEffect(() => {
    if (user) {
      loadBanks();
    }
  }, [user]);

  useEffect(() => {
    if (view === 'stats') {
      loadStats();
    }
  }, [view]);

  const loadBanks = async () => {
    try {
      setLoading(true);
      const res = await bankApi.getAll();
      setBanks(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadBankQuestions = async (bank: QuestionBank) => {
    try {
      setLoading(true);
      const res = await bankApi.getQuestions(bank.id);
      setBankQuestions(res.data);
      setSelectedBank(bank);
      setSelectedQIds(new Set());
      setView('bankDetail');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [s1, s2] = await Promise.all([statsApi.getClassStats(), statsApi.getKnowledgeStats()]);
      setStats(s1.data);
      setKnowledgeStats(s2.data);
      setTimeout(() => {
        drawBarChart(s1.data);
        drawRadarChart(s2.data);
      }, 50);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async () => {
    try {
      setLoginMsg('');
      if (!loginForm.username || !loginForm.password) {
        setLoginMsg('请输入用户名和密码');
        return;
      }
      const apiFn = loginForm.mode === 'login' ? authApi.login : authApi.register;
      const res = await apiFn(loginForm.username, loginForm.password, 'teacher');
      if (res.data.success) {
        setUser(res.data.user);
        setShowLogin(false);
      } else {
        setLoginMsg(res.data.message || '操作失败');
      }
    } catch (e: any) {
      setLoginMsg(e.response?.data?.message || '网络错误');
    }
  };

  const handleCreateBank = async () => {
    try {
      if (!newBankForm.name || !newBankForm.subject) {
        showMessage('请填写题库名称和科目', 'error');
        return;
      }
      await bankApi.create(newBankForm.name, newBankForm.subject, newBankForm.difficulty, user!.id);
      showMessage('题库创建成功', 'success');
      setShowNewBankModal(false);
      setNewBankForm({ name: '', subject: '', difficulty: '中等' });
      loadBanks();
    } catch (e) {
      showMessage('创建失败', 'error');
    }
  };

  const handleDeleteBank = async (id: number) => {
    if (!confirm('确定删除该题库及其所有题目？')) return;
    try {
      await bankApi.delete(id);
      showMessage('删除成功', 'success');
      loadBanks();
    } catch (e) {
      showMessage('删除失败', 'error');
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedBank) return;
    try {
      if (!newQ.content || !newQ.answer) {
        showMessage('请填写题目内容和答案', 'error');
        return;
      }
      await bankApi.addQuestion(selectedBank.id, newQ as any);
      showMessage('题目添加成功', 'success');
      setNewQ({
        type: 'single',
        content: '',
        options: ['', '', '', ''],
        answer: '',
        explanation: '',
        score: 5,
        difficulty: '中等',
        knowledge_tags: [],
      });
      loadBankQuestions(selectedBank);
      setView('bankDetail');
    } catch (e) {
      showMessage('添加失败', 'error');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedQIds.size === 0) {
      showMessage('请先选择要删除的题目', 'error');
      return;
    }
    if (!confirm(`确定删除选中的 ${selectedQIds.size} 道题？`)) return;
    try {
      await questionApi.batchDelete(Array.from(selectedQIds));
      showMessage('删除成功', 'success');
      loadBankQuestions(selectedBank!);
    } catch (e) {
      showMessage('删除失败', 'error');
    }
  };

  const handleExport = async () => {
    if (!selectedBank) return;
    try {
      const res = await bankApi.export(selectedBank.id);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedBank.name}_题库.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('导出成功', 'success');
    } catch (e) {
      showMessage('导出失败', 'error');
    }
  };

  const handleBatchImport = async () => {
    if (!selectedBank) return;
    try {
      const data = JSON.parse(batchText);
      const questions = Array.isArray(data) ? data : data.questions;
      if (!Array.isArray(questions)) {
        setBatchMsg('JSON格式错误，请传入题目数组');
        return;
      }
      const res = await bankApi.batchAdd(selectedBank.id, questions);
      setBatchMsg(`成功导入 ${res.data.count} 道题`);
      loadBankQuestions(selectedBank);
    } catch (e: any) {
      setBatchMsg('导入失败：' + (e.message || 'JSON解析错误'));
    }
  };

  const addOption = () => {
    if (newQ.options && newQ.options.length < 6) {
      setNewQ({ ...newQ, options: [...newQ.options, ''] });
    }
  };
  const removeOption = (idx: number) => {
    if (newQ.options && newQ.options.length > 4) {
      const opts = newQ.options.filter((_, i) => i !== idx);
      setNewQ({ ...newQ, options: opts });
    }
  };
  const toggleMultiAnswer = (opt: string, idx: number) => {
    const ans = (newQ.answer as string[]) || [];
    const key = opt || `${idx}`;
    const next = ans.includes(key) ? ans.filter((a) => a !== key) : [...ans, key];
    setNewQ({ ...newQ, answer: next });
  };
  const addKnowledgeTag = () => {
    if (!newTagInput.trim()) return;
    const tags = [...(newQ.knowledge_tags || []), newTagInput.trim()];
    setNewQ({ ...newQ, knowledge_tags: tags });
    setNewTagInput('');
  };
  const removeKnowledgeTag = (t: string) => {
    setNewQ({ ...newQ, knowledge_tags: (newQ.knowledge_tags || []).filter((x) => x !== t) });
  };

  const drawBarChart = (data: ClassStats) => {
    const canvas = barCanvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const padding = { top: 30, right: 30, bottom: 60, left: 50 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;
    const maxVal = Math.max(...data.distribution, 1);
    const barW = 40;
    const gap = 20;
    const totalW = data.distribution.length * (barW + gap) - gap;
    const startX = padding.left + (chartW - totalW) / 2;

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(W - padding.right, y);
      ctx.stroke();
      ctx.fillStyle = '#999';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(maxVal - (maxVal / 4) * i)), padding.left - 8, y + 4);
    }

    data.distribution.forEach((val, i) => {
      const x = startX + i * (barW + gap);
      const h = (val / maxVal) * chartH;
      const y = padding.top + chartH - h;
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, '#1a237e');
      grad.addColorStop(1, '#42a5f5');
      ctx.fillStyle = grad;
      const r = 4;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(val), x + barW / 2, y - 8);
      ctx.fillStyle = '#555';
      ctx.font = '13px sans-serif';
      ctx.fillText(data.segment_labels[i] + '分', x + barW / 2, H - padding.bottom + 22);
    });
    ctx.fillStyle = '#1a237e';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('各分数段人数分布', W / 2, 20);
  };

  const drawRadarChart = (data: KnowledgeStat[]) => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (!data || data.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无知识点数据', W / 2, H / 2);
      return;
    }
    const centerX = W / 2;
    const centerY = H / 2 + 10;
    const radius = Math.min(W, H) / 2 - 80;
    const N = Math.min(data.length, 8);
    const displayData = data.slice(0, N);
    const levels = 5;
    const colors = ['#e53935', '#1a237e', '#42a5f5', '#4caf50', '#ffb300', '#9c27b0', '#00bcd4', '#ff5722'];

    for (let lv = 1; lv <= levels; lv++) {
      const r = (radius * lv) / levels;
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    for (let i = 0; i < N; i++) {
      const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
      ctx.strokeStyle = '#e0e0e0';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(66,165,245,0.2)';
    ctx.strokeStyle = '#1a237e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
      const r = (radius * displayData[i].error_rate) / 100;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    displayData.forEach((d, i) => {
      const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
      const r = (radius * d.error_rate) / 100;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      const lx = centerX + (radius + 24) * Math.cos(angle);
      const ly = centerY + (radius + 24) * Math.sin(angle);
      ctx.fillStyle = '#333';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${d.tag} (${d.error_rate}%)`, lx, ly + 4);
    });

    ctx.fillStyle = '#1a237e';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('知识点薄弱项雷达图（平均错误率%）', W / 2, 25);
  };

  if (showLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-[420px] bg-white rounded-2xl shadow-xl p-8 border border-[#e0e0e0]"
        >
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-4"
              style={{ backgroundColor: '#1a237e' }}
            >
              智
            </div>
            <h1 className="text-2xl font-bold text-[#1a237e]">智能考试题库系统</h1>
            <p className="text-sm text-gray-500 mt-2">教师控制台登录</p>
          </div>
          <div className="flex gap-2 mb-5">
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                loginForm.mode === 'login'
                  ? 'bg-[#1a237e] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setLoginForm({ ...loginForm, mode: 'login' })}
            >
              登录
            </button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                loginForm.mode === 'register'
                  ? 'bg-[#1a237e] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setLoginForm({ ...loginForm, mode: 'register' })}
            >
              注册
            </button>
          </div>
          <input
            className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg mb-3 outline-none focus:border-[#1a237e]"
            placeholder="用户名（默认：admin）"
            value={loginForm.username}
            onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
          />
          <input
            type="password"
            className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg mb-3 outline-none focus:border-[#1a237e]"
            placeholder="密码（默认：admin123）"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          {loginMsg && <div className="text-sm text-red-500 mb-3">{loginMsg}</div>}
          <button
            className="w-full py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: '#1a237e' }}
            onClick={handleLogin}
          >
            {loginForm.mode === 'login' ? '登录' : '注册新教师账号'}
          </button>
          <p className="text-xs text-gray-400 mt-4 text-center">
            内置账号：admin / admin123（教师） · student1 / student123（学生）
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#e0e0e0] shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: '#1a237e' }}
            >
              智
            </div>
            <div>
              <div className="text-lg font-bold text-[#1a237e]">智能考试题库系统</div>
              <div className="text-xs text-gray-500">教师控制台</div>
            </div>
          </div>
          <nav className="flex gap-1">
            {[
              { key: 'banks', label: '题库管理' },
              { key: 'stats', label: '数据统计' },
            ].map((item) => (
              <button
                key={item.key}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  (view === item.key || (view !== 'stats' && item.key === 'banks'))
                    ? 'bg-[#1a237e] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => {
                  if (item.key === 'banks') {
                    setView('banks');
                    setSelectedBank(null);
                  } else {
                    setView(item.key as ViewType);
                  }
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">欢迎，{user!.username}</span>
            <button
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              onClick={() => {
                setUser(null);
                setShowLogin(true);
              }}
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-6 py-8">
        {globalMsg.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 p-3 rounded-lg text-sm font-medium ${
              globalMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {globalMsg.text}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {view === 'banks' && !selectedBank && (
            <motion.div
              key="banks"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#1a237e]">题库管理</h2>
                <button
                  className="px-5 py-2.5 rounded-lg text-white font-semibold transition-all hover:opacity-90 flex items-center gap-2"
                  style={{ backgroundColor: '#ffb300' }}
                  onClick={() => setShowNewBankModal(true)}
                >
                  + 新建题库
                </button>
              </div>
              {loading ? (
                <div className="py-20 text-center text-gray-500">加载中...</div>
              ) : banks.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <div className="text-5xl mb-4">📚</div>
                  暂无题库，点击右上角创建
                </div>
              ) : (
                <div
                  className="grid gap-5"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))' }}
                >
                  {banks.map((bank) => (
                    <motion.div
                      key={bank.id}
                      whileHover={{ y: -3, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
                      className="bg-white rounded-2xl border border-[#e0e0e0] p-6 cursor-pointer transition-all relative group"
                      style={{
                        width: '100%',
                        maxWidth: '420px',
                        minHeight: '180px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      }}
                      onClick={() => loadBankQuestions(bank)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-lg font-bold text-[#1a237e] mb-1">{bank.name}</div>
                          <div className="text-xs text-gray-500">科目：{bank.subject}</div>
                        </div>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                          style={{
                            backgroundColor:
                              bank.difficulty === '简单' ? '#4caf50' : bank.difficulty === '困难' ? '#e53935' : '#ffb300',
                          }}
                        >
                          {bank.difficulty}
                        </span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-[#f0f0f0] flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>
                            📝 <b className="text-[#1a237e]">{bank.total_questions}</b> 道题
                          </span>
                          <span>
                            📊 均难：<b>{bank.avg_difficulty}</b>
                          </span>
                        </div>
                        <button
                          className="px-3 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBank(bank.id);
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'bankDetail' && selectedBank && (
            <motion.div
              key="bank-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <button
                    className="px-4 py-2 rounded-lg border border-[#e0e0e0] text-gray-600 hover:bg-gray-50 text-sm"
                    onClick={() => {
                      setSelectedBank(null);
                      setView('banks');
                    }}
                  >
                    ← 返回题库列表
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-[#1a237e]">{selectedBank.name}</h2>
                    <p className="text-sm text-gray-500">
                      科目：{selectedBank.subject} · 共 {bankQuestions.length} 道题
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90"
                    style={{ backgroundColor: '#42a5f5' }}
                    onClick={() => setView('addQuestion')}
                  >
                    + 添加题目
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90"
                    style={{ backgroundColor: '#ffb300' }}
                    onClick={() => setView('batchImport')}
                  >
                    批量导入
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg border border-[#e0e0e0] text-gray-600 hover:bg-gray-50 text-sm font-semibold"
                    onClick={handleExport}
                  >
                    导出JSON
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-semibold disabled:opacity-40"
                    disabled={selectedQIds.size === 0}
                    onClick={handleBatchDelete}
                  >
                    批量删除 ({selectedQIds.size})
                  </button>
                </div>
              </div>

              {bankQuestions.length === 0 ? (
                <div className="py-20 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-[#e0e0e0]">
                  暂无题目，请添加
                </div>
              ) : (
                <div className="space-y-3">
                  {bankQuestions.map((q, idx) => (
                    <div key={q.id} className="relative">
                      <div className="absolute left-3 top-3 z-10">
                        <input
                          type="checkbox"
                          className="w-4 h-4 cursor-pointer"
                          checked={selectedQIds.has(q.id)}
                          onChange={(e) => {
                            const next = new Set(selectedQIds);
                            if (e.target.checked) next.add(q.id);
                            else next.delete(q.id);
                            setSelectedQIds(next);
                          }}
                        />
                      </div>
                      <div className="pl-10">
                        <QuestionCard
                          question={q}
                          index={idx}
                          mode="edit"
                          userAnswer={undefined}
                          correctAnswer={q.answer}
                          showResult={false}
                          disabled={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'addQuestion' && selectedBank && (
            <motion.div
              key="add-q"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl border border-[#e0e0e0] p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <button
                    className="text-sm text-[#42a5f5] mb-2 hover:underline"
                    onClick={() => setView('bankDetail')}
                  >
                    ← 返回题目列表
                  </button>
                  <h2 className="text-2xl font-bold text-[#1a237e]">添加新题目</h2>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">题型</label>
                  <select
                    className="w-full px-4 py-2.5 border border-[#e0e0e0] rounded-lg outline-none focus:border-[#1a237e]"
                    value={newQ.type}
                    onChange={(e) => {
                      const t = e.target.value as QuestionType;
                      setNewQ({
                        ...newQ,
                        type: t,
                        answer: t === 'multiple' ? [] : '',
                        options: t === 'fill' ? [] : ['', '', '', ''],
                      });
                    }}
                  >
                    <option value="single">单选题（4个选项，一个正确）</option>
                    <option value="multiple">多选题（4-6个选项，至少两个正确）</option>
                    <option value="fill">填空题</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">分值（1-10）</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className="w-full px-4 py-2.5 border border-[#e0e0e0] rounded-lg outline-none focus:border-[#1a237e]"
                      value={newQ.score || 5}
                      onChange={(e) => setNewQ({ ...newQ, score: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">难度</label>
                    <select
                      className="w-full px-4 py-2.5 border border-[#e0e0e0] rounded-lg outline-none focus:border-[#1a237e]"
                      value={newQ.difficulty}
                      onChange={(e) => setNewQ({ ...newQ, difficulty: e.target.value as any })}
                    >
                      <option value="简单">简单</option>
                      <option value="中等">中等</option>
                      <option value="困难">困难</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">题目内容</label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg outline-none focus:border-[#1a237e]"
                  placeholder="请输入题目内容..."
                  value={newQ.content}
                  onChange={(e) => setNewQ({ ...newQ, content: e.target.value })}
                />
              </div>

              {newQ.type !== 'fill' && newQ.options && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">选项</label>
                    {newQ.options.length < 6 && (
                      <button
                        className="text-sm text-[#42a5f5] hover:underline"
                        onClick={addOption}
                      >
                        + 添加选项
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {newQ.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        {newQ.type === 'multiple' && (
                          <input
                            type="checkbox"
                            checked={((newQ.answer as string[]) || []).includes(opt || `${idx}`)}
                            onChange={() => toggleMultiAnswer(opt, idx)}
                            className="w-5 h-5 cursor-pointer"
                            title="标记为正确答案"
                          />
                        )}
                        {newQ.type === 'single' && (
                          <input
                            type="radio"
                            name="correct_single"
                            checked={newQ.answer === opt || newQ.answer === String.fromCharCode(65 + idx)}
                            onChange={() => setNewQ({ ...newQ, answer: opt })}
                            className="w-5 h-5 cursor-pointer"
                            title="标记为正确答案"
                          />
                        )}
                        <span className="text-sm font-semibold text-[#1a237e] w-6">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <input
                          className="flex-1 px-4 py-2.5 border border-[#e0e0e0] rounded-lg outline-none focus:border-[#1a237e]"
                          placeholder={`选项 ${String.fromCharCode(65 + idx)}`}
                          value={opt}
                          onChange={(e) => {
                            const opts = [...newQ.options!];
                            opts[idx] = e.target.value;
                            setNewQ({ ...newQ, options: opts });
                          }}
                        />
                        {newQ.options && newQ.options.length > 4 && (
                          <button
                            className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded"
                            onClick={() => removeOption(idx)}
                          >
                            移除
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 {newQ.type === 'single' ? '请在选项前点击单选按钮标记正确答案' : '请在选项前勾选复选框标记正确答案（至少两个）'}
                  </p>
                </div>
              )}

              {newQ.type === 'fill' && (
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    正确答案（多个答案请用 JSON 数组格式，如 ["答案A","答案B"]）
                  </label>
                  <input
                    className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg outline-none focus:border-[#1a237e]"
                    placeholder='例如：计算机 或 ["苹果","Apple"]'
                    value={newQ.answer as string}
                    onChange={(e) => setNewQ({ ...newQ, answer: e.target.value })}
                  />
                </div>
              )}

              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">知识点标签</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {(newQ.knowledge_tags || []).map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1 rounded-full text-xs bg-blue-50 text-[#42a5f5] border border-blue-100 flex items-center gap-1"
                    >
                      {t}
                      <button
                        className="text-blue-400 hover:text-blue-600"
                        onClick={() => removeKnowledgeTag(t)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-4 py-2.5 border border-[#e0e0e0] rounded-lg outline-none focus:border-[#1a237e]"
                    placeholder="输入标签后回车或点击添加"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKnowledgeTag())}
                  />
                  <button
                    className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
                    style={{ backgroundColor: '#42a5f5' }}
                    onClick={addKnowledgeTag}
                  >
                    添加
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">答案解析（可选）</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg outline-none focus:border-[#1a237e]"
                  placeholder="输入答案解析..."
                  value={newQ.explanation}
                  onChange={(e) => setNewQ({ ...newQ, explanation: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  className="px-6 py-2.5 rounded-lg border border-[#e0e0e0] text-gray-600 hover:bg-gray-50 font-semibold"
                  onClick={() => setView('bankDetail')}
                >
                  取消
                </button>
                <button
                  className="px-8 py-2.5 rounded-lg text-white font-semibold hover:opacity-90"
                  style={{ backgroundColor: '#1a237e' }}
                  onClick={handleAddQuestion}
                >
                  保存题目
                </button>
              </div>
            </motion.div>
          )}

          {view === 'batchImport' && selectedBank && (
            <motion.div
              key="batch"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl border border-[#e0e0e0] p-8"
            >
              <button
                className="text-sm text-[#42a5f5] mb-2 hover:underline block"
                onClick={() => setView('bankDetail')}
              >
                ← 返回题目列表
              </button>
              <h2 className="text-2xl font-bold text-[#1a237e] mb-2">批量导入题目（JSON）</h2>
              <p className="text-sm text-gray-500 mb-4">
                粘贴 JSON 数据，支持格式一：数组形式，或格式二：{'{ questions: [...] }'}
              </p>
              <pre className="text-xs bg-gray-50 p-4 rounded-lg mb-4 overflow-x-auto text-gray-600">
{`[
  {
    "type": "single",
    "content": "题目内容",
    "options": ["A", "B", "C", "D"],
    "answer": "A",
    "score": 5,
    "difficulty": "中等",
    "knowledge_tags": ["标签1"]
  }
]`}
              </pre>
              <textarea
                rows={12}
                className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg outline-none focus:border-[#1a237e] font-mono text-sm"
                placeholder="请粘贴 JSON 数组..."
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
              />
              {batchMsg && (
                <div className={`mt-3 text-sm ${batchMsg.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>
                  {batchMsg}
                </div>
              )}
              <div className="mt-4 flex justify-end gap-3">
                <button
                  className="px-6 py-2.5 rounded-lg border border-[#e0e0e0] text-gray-600 hover:bg-gray-50 font-semibold"
                  onClick={() => setView('bankDetail')}
                >
                  返回
                </button>
                <button
                  className="px-8 py-2.5 rounded-lg text-white font-semibold hover:opacity-90"
                  style={{ backgroundColor: '#ffb300' }}
                  onClick={handleBatchImport}
                >
                  开始导入
                </button>
              </div>
            </motion.div>
          )}

          {view === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-[#1a237e] mb-6">班级数据统计看板</h2>

              {stats && (
                <div className="grid md:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: '平均分', value: stats.avg_score + '%', color: '#1a237e' },
                    { label: '最高分', value: stats.max_score + '%', color: '#4caf50' },
                    { label: '最低分', value: stats.min_score + '%', color: '#e53935' },
                    { label: '通过率', value: stats.pass_rate + '%', color: '#ffb300' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-white rounded-2xl border border-[#e0e0e0] p-6"
                      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                    >
                      <div className="text-sm text-gray-500 mb-2">{item.label}</div>
                      <div className="text-3xl font-bold" style={{ color: item.color }}>
                        {item.value}
                      </div>
                      {item.label === '通过率' && (
                        <div className="text-xs text-gray-400 mt-1">共 {stats.total_exams} 次考试，≥60分为通过</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-6">
                <div
                  className="bg-white rounded-2xl border border-[#e0e0e0] p-6"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                >
                  <canvas ref={barCanvasRef} width={560} height={360} className="w-full" />
                </div>
                <div
                  className="bg-white rounded-2xl border border-[#e0e0e0] p-6"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                >
                  <canvas ref={radarCanvasRef} width={560} height={400} className="w-full" />
                </div>
              </div>

              {knowledgeStats.length > 0 && (
                <div
                  className="mt-6 bg-white rounded-2xl border border-[#e0e0e0] p-6"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                >
                  <h3 className="text-lg font-bold text-[#1a237e] mb-4">知识点错误率明细</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#e0e0e0] text-gray-600">
                          <th className="py-3 text-left px-4">知识点</th>
                          <th className="py-3 text-left px-4">总题数</th>
                          <th className="py-3 text-left px-4">错误率</th>
                          <th className="py-3 text-left px-4 w-1/2">分布</th>
                        </tr>
                      </thead>
                      <tbody>
                        {knowledgeStats
                          .sort((a, b) => b.error_rate - a.error_rate)
                          .map((k) => (
                            <tr key={k.tag} className="border-b border-gray-50">
                              <td className="py-3 px-4 font-medium text-[#1a237e]">{k.tag}</td>
                              <td className="py-3 px-4 text-gray-600">{k.total}</td>
                              <td className="py-3 px-4">
                                <span
                                  className="font-bold"
                                  style={{
                                    color:
                                      k.error_rate > 60
                                        ? '#e53935'
                                        : k.error_rate > 30
                                        ? '#ffb300'
                                        : '#4caf50',
                                  }}
                                >
                                  {k.error_rate}%
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: k.error_rate + '%',
                                      background:
                                        k.error_rate > 60
                                          ? '#e53935'
                                          : k.error_rate > 30
                                          ? '#ffb300'
                                          : '#4caf50',
                                    }}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showNewBankModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowNewBankModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-2xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[#1a237e] mb-5">创建新题库</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">题库名称</label>
                <input
                  className="w-full px-4 py-2.5 border border-[#e0e0e0] rounded-lg outline-none focus:border-[#1a237e]"
                  placeholder="如：期末模拟试卷一"
                  value={newBankForm.name}
                  onChange={(e) => setNewBankForm({ ...newBankForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">科目</label>
                <input
                  className="w-full px-4 py-2.5 border border-[#e0e0e0] rounded-lg outline-none focus:border-[#1a237e]"
                  placeholder="如：计算机基础"
                  value={newBankForm.subject}
                  onChange={(e) => setNewBankForm({ ...newBankForm, subject: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">整体难度</label>
                <select
                  className="w-full px-4 py-2.5 border border-[#e0e0e0] rounded-lg outline-none focus:border-[#1a237e]"
                  value={newBankForm.difficulty}
                  onChange={(e) => setNewBankForm({ ...newBankForm, difficulty: e.target.value })}
                >
                  <option value="简单">简单</option>
                  <option value="中等">中等</option>
                  <option value="困难">困难</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-5 py-2.5 rounded-lg border border-[#e0e0e0] text-gray-600 hover:bg-gray-50 font-semibold"
                onClick={() => setShowNewBankModal(false)}
              >
                取消
              </button>
              <button
                className="px-6 py-2.5 rounded-lg text-white font-semibold hover:opacity-90"
                style={{ backgroundColor: '#1a237e' }}
                onClick={handleCreateBank}
              >
                创建
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default TeacherDashboard;
