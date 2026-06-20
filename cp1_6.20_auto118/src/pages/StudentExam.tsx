import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionCard from '../components/QuestionCard';
import {
  authApi,
  bankApi,
  examApi,
  practiceApi,
  User,
  QuestionBank,
  Question,
  ExamSubmitResult,
  WrongQuestionGroup,
} from '../api/examApi';

type StudentView =
  | 'home'
  | 'examSelect'
  | 'examDoing'
  | 'examResult'
  | 'practiceSelect'
  | 'practiceDoing'
  | 'wrongBook';

const EXAM_DURATION_SEC = 60 * 60;

const StudentExam: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '', mode: 'login' as 'login' | 'register' });
  const [loginMsg, setLoginMsg] = useState('');

  const [view, setView] = useState<StudentView>('home');
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null);

  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [examId, setExamId] = useState<number | null>(null);
  const [examAnswers, setExamAnswers] = useState<Record<number, string | string[]>>({});
  const [examResult, setExamResult] = useState<ExamSubmitResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SEC);
  const timerRef = useRef<number | null>(null);

  const [practiceBankTags, setPracticeBankTags] = useState<string[]>([]);
  const [practiceConfig, setPracticeConfig] = useState({
    knowledgeTags: [] as string[],
    difficulty: '' as '' | '简单' | '中等' | '困难',
  });
  const [curPracticeQ, setCurPracticeQ] = useState<Question | null>(null);
  const [curPracticeAns, setCurPracticeAns] = useState<string | string[] | null>(null);
  const [practiceFeedback, setPracticeFeedback] = useState<{
    is_correct: boolean;
    correct_answer: string | string[];
    explanation?: string;
  } | null>(null);
  const [practiceAnswer, setPracticeAnswer] = useState<string | string[]>('');

  const [wrongGroups, setWrongGroups] = useState<WrongQuestionGroup[]>([]);

  const [globalMsg, setGlobalMsg] = useState({ text: '', type: '' as 'success' | 'error' });
  const [loading, setLoading] = useState(false);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setGlobalMsg({ text, type });
    setTimeout(() => setGlobalMsg({ text: '', type: '' }), 3000);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmitExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopTimer();
  }, []);

  useEffect(() => {
    if (user && view === 'home') loadBanks();
  }, [user, view]);

  const loadBanks = async () => {
    try {
      const res = await bankApi.getAll();
      setBanks(res.data);
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
      const res = await (loginForm.mode === 'login'
        ? authApi.login(loginForm.username, loginForm.password)
        : authApi.register(loginForm.username, loginForm.password, 'student'));
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

  const startExam = async (bank: QuestionBank) => {
    try {
      setLoading(true);
      const res = await examApi.generate(user!.id, bank.id, 20);
      setExamQuestions(res.data.questions);
      setExamId(res.data.exam_id);
      setExamAnswers({});
      setExamResult(null);
      setSelectedBank(bank);
      setTimeLeft(EXAM_DURATION_SEC);
      setView('examDoing');
      startTimer();
    } catch (e) {
      showMessage('生成试卷失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitExam = async (auto = false) => {
    if (!examId || examResult) return;
    stopTimer();
    try {
      setLoading(true);
      const answers: Record<string, string | string[]> = {};
      Object.keys(examAnswers).forEach((k) => {
        answers[k] = examAnswers[Number(k)];
      });
      const res = await examApi.submit(examId, user!.id, answers);
      setExamResult(res.data);
      setView('examResult');
      if (!auto) showMessage('试卷提交成功', 'success');
      else showMessage('时间到，已自动交卷', 'error');
    } catch (e) {
      showMessage('提交失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const enterPracticeMode = async (bank: QuestionBank) => {
    setSelectedBank(bank);
    try {
      const res = await bankApi.getKnowledgeTags(bank.id);
      setPracticeBankTags(res.data);
    } catch {}
    setPracticeConfig({ knowledgeTags: [], difficulty: '' });
    setCurPracticeQ(null);
    setPracticeFeedback(null);
    setView('practiceSelect');
  };

  const getNextPractice = async () => {
    if (!selectedBank) return;
    try {
      setLoading(true);
      setPracticeFeedback(null);
      setPracticeAnswer('');
      setCurPracticeAns(null);
      const res = await practiceApi.getRandom(
        selectedBank.id,
        practiceConfig.knowledgeTags,
        practiceConfig.difficulty || undefined,
        user!.id
      );
      if (res.data.question) {
        setCurPracticeQ(res.data.question);
        setCurPracticeAns(res.data.answer);
      } else {
        showMessage('该条件下暂无题目，请调整筛选', 'error');
      }
    } catch (e) {
      showMessage('获取题目失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitPractice = async () => {
    if (!curPracticeQ) return;
    try {
      setLoading(true);
      const res = await practiceApi.submit(user!.id, curPracticeQ.id, practiceAnswer);
      setPracticeFeedback(res.data);
    } catch (e) {
      showMessage('提交失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadWrongBook = async () => {
    try {
      const res = await practiceApi.getWrongQuestions(user!.id);
      setWrongGroups(res.data);
      setView('wrongBook');
    } catch (e) {
      showMessage('加载错题本失败', 'error');
    }
  };

  const redoWrongTag = async (group: WrongQuestionGroup) => {
    if (!selectedBank) {
      const hasBank = banks.find((b) => b.total_questions > 0);
      if (!hasBank) {
        showMessage('暂无可用题库', 'error');
        return;
      }
      setSelectedBank(hasBank);
    }
    setPracticeConfig({ knowledgeTags: [group.tag], difficulty: '' });
    setView('practiceSelect');
    showMessage(`已设置知识点：${group.tag}，点击"开始练习"继续`, 'success');
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };
  const timePercent = ((EXAM_DURATION_SEC - timeLeft) / EXAM_DURATION_SEC) * 100;
  const isUrgent = timeLeft <= 300;

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
              style={{ backgroundColor: '#42a5f5' }}
            >
              考
            </div>
            <h1 className="text-2xl font-bold text-[#1a237e]">智能考试题库系统</h1>
            <p className="text-sm text-gray-500 mt-2">学生端登录</p>
          </div>
          <div className="flex gap-2 mb-5">
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                loginForm.mode === 'login' ? 'bg-[#1a237e] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setLoginForm({ ...loginForm, mode: 'login' })}
            >
              登录
            </button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                loginForm.mode === 'register' ? 'bg-[#1a237e] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setLoginForm({ ...loginForm, mode: 'register' })}
            >
              注册
            </button>
          </div>
          <input
            className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg mb-3 outline-none focus:border-[#1a237e]"
            placeholder="用户名（默认：student1）"
            value={loginForm.username}
            onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
          />
          <input
            type="password"
            className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg mb-3 outline-none focus:border-[#1a237e]"
            placeholder="密码（默认：student123）"
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
            {loginForm.mode === 'login' ? '登录' : '注册新学生账号'}
          </button>
          <p className="text-xs text-gray-400 mt-4 text-center">
            内置账号：student1 / student123
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
              style={{ backgroundColor: '#42a5f5' }}
            >
              考
            </div>
            <div>
              <div className="text-lg font-bold text-[#1a237e]">智能考试题库系统</div>
              <div className="text-xs text-gray-500">学生端</div>
            </div>
          </div>
          <nav className="flex gap-1">
            {[
              { key: 'home', label: '首页' },
              { key: 'wrongBook', label: '错题本' },
            ].map((item) => (
              <button
                key={item.key}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  (view === item.key || (item.key === 'home' && !['wrongBook'].includes(view)))
                    ? 'bg-[#1a237e] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => {
                  if (item.key === 'wrongBook') loadWrongBook();
                  else {
                    stopTimer();
                    setView('home');
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
                stopTimer();
                setUser(null);
                setShowLogin(true);
              }}
            >
              退出
            </button>
          </div>
        </div>
      </header>

      {view === 'examDoing' && (
        <div className="fixed top-16 left-0 right-0 z-30" style={{ height: '8px', background: '#e0e0e0' }}>
          <motion.div
            animate={{ width: `${timePercent}%` }}
            transition={{ ease: 'linear', duration: 1 }}
            className={`h-full ${isUrgent ? 'animate-pulse' : ''}`}
            style={{
              height: '8px',
              background: isUrgent ? '#e53935' : '#ffb300',
              width: `${100 - timePercent}%`,
            }}
          />
          <div className="absolute right-4 top-2 text-xs font-semibold" style={{ color: isUrgent ? '#e53935' : '#1a237e' }}>
            剩余时间：{formatTime(timeLeft)}
          </div>
        </div>
      )}

      <div className={`max-w-[1280px] mx-auto px-6 py-8 ${view === 'examDoing' ? 'pt-14' : ''}`}>
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
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid md:grid-cols-3 gap-5 mb-8">
                {[
                  { icon: '📝', title: '模拟考试', desc: '自适应出题，20道题60分钟', color: '#1a237e', action: () => setView('examSelect') },
                  { icon: '⚡', title: '实时练习', desc: '选择知识点逐题练习，即时反馈', color: '#42a5f5', action: () => setView('practiceSelect') },
                  { icon: '📒', title: '错题本', desc: '按知识点分组查看错题并重练', color: '#ffb300', action: loadWrongBook },
                ].map((c) => (
                  <motion.div
                    key={c.title}
                    whileHover={{ y: -4 }}
                    className="bg-white rounded-2xl border border-[#e0e0e0] p-6 cursor-pointer transition-all"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                    onClick={c.action}
                  >
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-4"
                      style={{ backgroundColor: `${c.color}15` }}
                    >
                      {c.icon}
                    </div>
                    <h3 className="text-lg font-bold mb-1" style={{ color: c.color }}>
                      {c.title}
                    </h3>
                    <p className="text-sm text-gray-500">{c.desc}</p>
                  </motion.div>
                ))}
              </div>

              <h2 className="text-xl font-bold text-[#1a237e] mb-4">可用题库</h2>
              {banks.length === 0 ? (
                <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-[#e0e0e0]">
                  暂无题库
                </div>
              ) : (
                <div
                  className="grid gap-5"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))' }}
                >
                  {banks.map((bank) => (
                    <motion.div
                      key={bank.id}
                      whileHover={{ y: -3 }}
                      className="bg-white rounded-2xl border border-[#e0e0e0] p-6 transition-all"
                      style={{
                        maxWidth: '420px',
                        minHeight: '180px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      }}
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
                      <div className="text-sm text-gray-600 mb-4">
                        📝 共 <b className="text-[#1a237e]">{bank.total_questions}</b> 道题 · 平均难度：
                        <b>{bank.avg_difficulty}</b>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="flex-1 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                          style={{ backgroundColor: '#1a237e' }}
                          disabled={bank.total_questions < 1}
                          onClick={() => startExam(bank)}
                        >
                          开始考试
                        </button>
                        <button
                          className="flex-1 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                          style={{ backgroundColor: '#42a5f5' }}
                          disabled={bank.total_questions < 1}
                          onClick={() => enterPracticeMode(bank)}
                        >
                          实时练习
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'examSelect' && (
            <motion.div
              key="ex-sel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button
                    className="px-4 py-2 rounded-lg border border-[#e0e0e0] text-gray-600 hover:bg-gray-50 text-sm"
                    onClick={() => setView('home')}
                  >
                    ← 返回首页
                  </button>
                  <h2 className="text-2xl font-bold text-[#1a237e]">选择题库开始模拟考试</h2>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                <div className="text-sm text-[#1a237e]">
                  🎯 考试规则：系统根据你历史作答中的薄弱知识点（错误率 {'>'}60%）自动生成试卷，共 20 题，
                  薄弱知识点占比 ≥60%，难度分布：简单 30%、中等 50%、困难 20%。考试时长 60 分钟。
                </div>
              </div>
              {banks.filter((b) => b.total_questions >= 1).length === 0 ? (
                <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-[#e0e0e0]">
                  暂无可用于考试的题库
                </div>
              ) : (
                <div
                  className="grid gap-5"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))' }}
                >
                  {banks
                    .filter((b) => b.total_questions >= 1)
                    .map((bank) => (
                      <motion.div
                        key={bank.id}
                        whileHover={{ y: -3 }}
                        className="bg-white rounded-2xl border border-[#e0e0e0] p-6 cursor-pointer transition-all"
                        style={{
                          maxWidth: '420px',
                          minHeight: '180px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        }}
                        onClick={() => startExam(bank)}
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
                        <div className="text-sm text-gray-600 mb-4">
                          📝 <b>{bank.total_questions}</b> 道题 · 均难：<b>{bank.avg_difficulty}</b>
                        </div>
                        <button
                          className="w-full py-2.5 rounded-lg text-white font-semibold hover:opacity-90"
                          style={{ backgroundColor: '#1a237e' }}
                        >
                          进入考试 →
                        </button>
                      </motion.div>
                    ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'examDoing' && examQuestions.length > 0 && (
            <motion.div
              key="exam-doing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-[#1a237e]">模拟考试</h2>
                  <p className="text-sm text-gray-500">
                    {selectedBank?.name} · 共 {examQuestions.length} 题 · 满分
                    {examQuestions.reduce((s, q) => s + q.score, 0)}分
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className="px-4 py-2 rounded-lg font-mono font-bold text-lg"
                    style={{
                      color: isUrgent ? '#e53935' : '#1a237e',
                      backgroundColor: isUrgent ? '#fee' : '#eef2ff',
                    }}
                  >
                    ⏱ {formatTime(timeLeft)}
                  </div>
                  <button
                    className="px-6 py-2.5 rounded-lg text-white font-semibold hover:opacity-90"
                    style={{ backgroundColor: '#ffb300' }}
                    disabled={loading}
                    onClick={() => {
                      if (confirm('确定提交试卷吗？')) handleSubmitExam(false);
                    }}
                  >
                    提交试卷
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {examQuestions.map((q, idx) => (
                  <div key={q.id}>
                    <QuestionCard
                      question={q}
                      index={idx}
                      mode="exam"
                      userAnswer={examAnswers[q.id]}
                      onChange={(ans) => setExamAnswers({ ...examAnswers, [q.id]: ans })}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  className="px-8 py-3 rounded-xl text-white font-bold hover:opacity-90"
                  style={{ backgroundColor: '#1a237e' }}
                  disabled={loading}
                  onClick={() => {
                    if (confirm('确定提交试卷吗？')) handleSubmitExam(false);
                  }}
                >
                  提交试卷
                </button>
              </div>
            </motion.div>
          )}

          {view === 'examResult' && examResult && (
            <motion.div
              key="exam-result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div
                className="bg-white rounded-2xl border border-[#e0e0e0] p-8 mb-6 text-center"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
              >
                <div className="text-6xl mb-4">{examResult.percentage >= 60 ? '🎉' : '💪'}</div>
                <h2 className="text-2xl font-bold text-[#1a237e] mb-4">考试结束！</h2>
                <div className="grid md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                  {[
                    { label: '得分', value: `${examResult.score} / ${examResult.total_score}`, color: '#1a237e', big: true },
                    { label: '正确率', value: `${examResult.percentage}%`, color: examResult.percentage >= 60 ? '#4caf50' : '#e53935', big: true },
                    {
                      label: '答对题数',
                      value: `${examResult.details.filter((d) => d.is_correct).length} / ${examResult.details.length}`,
                      color: '#42a5f5',
                    },
                    { label: '通过状态', value: examResult.percentage >= 60 ? '✅ 通过' : '❌ 未通过', color: examResult.percentage >= 60 ? '#4caf50' : '#e53935' },
                  ].map((item) => (
                    <div key={item.label} className="p-4 bg-gray-50 rounded-xl">
                      <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                      <div
                        className={`${item.big ? 'text-2xl' : 'text-lg'} font-bold`}
                        style={{ color: item.color }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    className="px-6 py-2.5 rounded-lg border border-[#e0e0e0] text-gray-600 hover:bg-gray-50 font-semibold"
                    onClick={() => setView('home')}
                  >
                    返回首页
                  </button>
                  {selectedBank && (
                    <button
                      className="px-6 py-2.5 rounded-lg text-white font-semibold hover:opacity-90"
                      style={{ backgroundColor: '#1a237e' }}
                      onClick={() => startExam(selectedBank)}
                    >
                      再考一次
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-bold text-[#1a237e] mb-4">答题详情</h3>
              <div className="space-y-2">
                {examQuestions.map((q, idx) => {
                  const detail = examResult.details.find((d) => d.question_id === q.id);
                  return (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      index={idx}
                      mode="review"
                      userAnswer={detail?.user_answer}
                      correctAnswer={detail?.correct_answer}
                      isCorrect={detail?.is_correct}
                      earnedScore={detail?.score}
                      maxScore={detail?.max_score}
                      explanation={detail?.explanation}
                      showResult={true}
                      disabled={true}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}

          {view === 'practiceSelect' && (
            <motion.div
              key="pr-sel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button
                    className="px-4 py-2 rounded-lg border border-[#e0e0e0] text-gray-600 hover:bg-gray-50 text-sm"
                    onClick={() => setView('home')}
                  >
                    ← 返回首页
                  </button>
                  <h2 className="text-2xl font-bold text-[#1a237e]">实时练习模式</h2>
                </div>
              </div>

              <div
                className="bg-white rounded-2xl border border-[#e0e0e0] p-8 max-w-2xl mx-auto"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                {!selectedBank && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">选择题库</label>
                    <select
                      className="w-full px-4 py-2.5 border border-[#e0e0e0] rounded-lg outline-none focus:border-[#1a237e]"
                      value=""
                      onChange={async (e) => {
                        const b = banks.find((x) => x.id === Number(e.target.value));
                        if (b) {
                          setSelectedBank(b);
                          try {
                            const r = await bankApi.getKnowledgeTags(b.id);
                            setPracticeBankTags(r.data);
                          } catch {}
                        }
                      }}
                    >
                      <option value="">-- 请选择题库 --</option>
                      {banks.filter((b) => b.total_questions > 0).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}（{b.total_questions}题）
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedBank && (
                  <>
                    <div className="mb-6 p-3 bg-blue-50 rounded-lg text-sm text-[#1a237e]">
                      当前题库：<b>{selectedBank.name}</b>（{selectedBank.total_questions} 道题）
                      <button
                        className="ml-3 text-xs underline"
                        onClick={() => {
                          setSelectedBank(null);
                          setPracticeBankTags([]);
                          setPracticeConfig({ knowledgeTags: [], difficulty: '' });
                        }}
                      >
                        更换
                      </button>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        知识点（不选则从全部知识点中随机）
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {practiceBankTags.length === 0 ? (
                          <span className="text-sm text-gray-400">题库中暂无知识点标签</span>
                        ) : (
                          practiceBankTags.map((t) => {
                            const sel = practiceConfig.knowledgeTags.includes(t);
                            return (
                              <button
                                key={t}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                  sel
                                    ? 'bg-[#1a237e] text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                onClick={() => {
                                  const next = sel
                                    ? practiceConfig.knowledgeTags.filter((x) => x !== t)
                                    : [...practiceConfig.knowledgeTags, t];
                                  setPracticeConfig({ ...practiceConfig, knowledgeTags: next });
                                }}
                              >
                                {t}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="mb-8">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">难度（可选）</label>
                      <div className="flex gap-2">
                        {(['', '简单', '中等', '困难'] as const).map((d) => (
                          <button
                            key={d || 'all'}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                              practiceConfig.difficulty === d
                                ? 'bg-[#1a237e] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            onClick={() => setPracticeConfig({ ...practiceConfig, difficulty: d })}
                          >
                            {d || '全部难度'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      className="w-full py-3 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-40"
                      style={{ backgroundColor: '#42a5f5' }}
                      disabled={!selectedBank || loading}
                      onClick={getNextPractice}
                    >
                      开始练习
                    </button>
                  </>
                )}
              </div>

              {curPracticeQ && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#1a237e]">当前题目</h3>
                    <button
                      className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                      style={{ backgroundColor: '#42a5f5' }}
                      disabled={loading}
                      onClick={getNextPractice}
                    >
                      下一题 →
                    </button>
                  </div>

                  <QuestionCard
                    question={curPracticeQ}
                    mode="practice"
                    userAnswer={practiceFeedback ? practiceAnswer : undefined}
                    correctAnswer={practiceFeedback?.correct_answer || curPracticeAns}
                    isCorrect={practiceFeedback?.is_correct}
                    explanation={practiceFeedback?.explanation}
                    showResult={!!practiceFeedback}
                    onChange={setPracticeAnswer}
                  />

                  {!practiceFeedback && (
                    <div className="flex justify-end mt-2">
                      <button
                        className="px-8 py-2.5 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-40"
                        style={{ backgroundColor: '#1a237e' }}
                        disabled={loading || practiceAnswer === '' || (Array.isArray(practiceAnswer) && practiceAnswer.length === 0)}
                        onClick={submitPractice}
                      >
                        提交答案
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {view === 'wrongBook' && (
            <motion.div
              key="wrong-book"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button
                    className="px-4 py-2 rounded-lg border border-[#e0e0e0] text-gray-600 hover:bg-gray-50 text-sm"
                    onClick={() => setView('home')}
                  >
                    ← 返回首页
                  </button>
                  <h2 className="text-2xl font-bold text-[#1a237e]">我的错题本</h2>
                </div>
              </div>

              {wrongGroups.length === 0 ? (
                <div className="py-20 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-[#e0e0e0]">
                  <div className="text-5xl mb-4">🎯</div>
                  暂无错题，继续保持！
                </div>
              ) : (
                <div className="space-y-6">
                  {wrongGroups.map((group) => (
                    <div
                      key={group.tag}
                      className="bg-white rounded-2xl border border-[#e0e0e0] overflow-hidden"
                      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                    >
                      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-[#f0f0f0]">
                        <div>
                          <h3 className="text-lg font-bold text-[#1a237e]">
                            📚 {group.tag}
                            <span className="ml-2 text-sm font-normal text-gray-500">（{group.questions.length} 道错题）</span>
                          </h3>
                        </div>
                        <button
                          className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90"
                          style={{ backgroundColor: '#ffb300' }}
                          onClick={() => redoWrongTag(group)}
                        >
                          🔁 重新练习此知识点
                        </button>
                      </div>
                      <div className="p-4 space-y-2">
                        {group.questions.map((q, idx) => (
                          <QuestionCard
                            key={`${q.id}-${idx}`}
                            question={q}
                            index={idx}
                            mode="review"
                            correctAnswer={q.answer}
                            explanation={q.explanation}
                            showResult={true}
                            disabled={true}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StudentExam;
