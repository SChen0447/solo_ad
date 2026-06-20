import React, { useState, useEffect, useCallback } from 'react';
import CodeEditor from './components/CodeEditor';
import ResultPanel from './components/ResultPanel';
import RankTab from './components/RankTab';
import WebSocketClient from './services/WebSocketClient';
import type { Problem, RunResult, UserInfo } from './types';
import axios from 'axios';

const App: React.FC = () => {
  const [user] = useState<UserInfo>(() => {
    const saved = localStorage.getItem('user_info');
    if (saved) return JSON.parse(saved);
    const newUser = {
      userId: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      username: `用户${Math.floor(Math.random() * 10000)}`,
    };
    localStorage.setItem('user_info', JSON.stringify(newUser));
    return newUser;
  });

  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblemId, setCurrentProblemId] = useState<number>(1);
  const [code, setCode] = useState<string>('');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'problem' | 'ranking' | 'discussion'>('problem');
  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null);

  useEffect(() => {
    const client = new WebSocketClient('ws://localhost:5000/ws/run', {
      onResult: (result: RunResult) => {
        setRunResult(result);
        setIsRunning(false);
      },
      onConnect: () => console.log('WebSocket connected'),
      onDisconnect: () => console.log('WebSocket disconnected'),
    });
    client.connect();
    setWsClient(client);
    return () => client.disconnect();
  }, []);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const res = await axios.get('/api/problems');
        setProblems(res.data);
        if (res.data.length > 0) {
          setCurrentProblemId(res.data[0].id);
          setCode(res.data[0].starterCode);
        }
      } catch (err) {
        console.error('Failed to fetch problems:', err);
        const fallback: Problem[] = [
          {
            id: 1,
            title: '两数之和',
            difficulty: 'easy',
            description: '给定一个整数数组 nums 和一个整数目标值 target，请你在该数组中找出和为目标值 target 的那两个整数，并返回它们的数组下标。\n\n你可以假设每种输入只会对应一个答案。但是，数组中同一个元素在答案里不能重复出现。',
            inputExample: 'nums = [2,7,11,15], target = 9',
            outputExample: '[0,1]',
            starterCode: 'def two_sum(nums, target):\n    # 在这里编写你的代码\n    pass\n\nif __name__ == "__main__":\n    print(two_sum([2, 7, 11, 15], 9))',
          },
          {
            id: 2,
            title: '斐波那契数列',
            difficulty: 'easy',
            description: '编写一个函数，输入 n，求斐波那契（Fibonacci）数列的第 n 项。\n\n斐波那契数列的定义如下：\nF(0) = 0, F(1) = 1\nF(N) = F(N - 1) + F(N - 2), 其中 N > 1.',
            inputExample: 'n = 10',
            outputExample: '55',
            starterCode: 'def fibonacci(n):\n    # 在这里编写你的代码\n    pass\n\nif __name__ == "__main__":\n    print(fibonacci(10))',
          },
          {
            id: 3,
            title: '反转字符串',
            difficulty: 'medium',
            description: '编写一个函数，其作用是将输入的字符串反转过来。输入字符串以字符数组 s 的形式给出。\n\n不要给另外的数组分配额外的空间，你必须原地修改输入数组、使用 O(1) 的额外空间解决这一问题。',
            inputExample: 's = ["h","e","l","l","o"]',
            outputExample: '["o","l","l","e","h"]',
            starterCode: 'def reverse_string(s):\n    # 在这里编写你的代码\n    pass\n\nif __name__ == "__main__":\n    s = ["h", "e", "l", "l", "o"]\n    reverse_string(s)\n    print(s)',
          },
          {
            id: 4,
            title: '最长公共前缀',
            difficulty: 'medium',
            description: '编写一个函数来查找字符串数组中的最长公共前缀。\n\n如果不存在公共前缀，返回空字符串 ""。',
            inputExample: 'strs = ["flower","flow","flight"]',
            outputExample: '"fl"',
            starterCode: 'def longest_common_prefix(strs):\n    # 在这里编写你的代码\n    pass\n\nif __name__ == "__main__":\n    print(longest_common_prefix(["flower", "flow", "flight"]))',
          },
        ];
        setProblems(fallback);
        setCode(fallback[0].starterCode);
      }
    };
    fetchProblems();
  }, []);

  const currentProblem = problems.find((p) => p.id === currentProblemId);

  const handleRunCode = useCallback(() => {
    if (!wsClient || !wsClient.isConnected()) {
      alert('WebSocket 未连接，请稍后重试');
      return;
    }
    const lineCount = code.split('\n').length;
    if (lineCount > 300) {
      alert('代码不能超过300行');
      return;
    }
    setIsRunning(true);
    setRunResult(null);
    wsClient.sendRunCode(code, currentProblemId, user.userId, user.username);
  }, [wsClient, code, currentProblemId, user]);

  const handleSubmitCode = useCallback(() => {
    if (!wsClient || !wsClient.isConnected()) {
      alert('WebSocket 未连接，请稍后重试');
      return;
    }
    const lineCount = code.split('\n').length;
    if (lineCount > 300) {
      alert('代码不能超过300行');
      return;
    }
    setIsRunning(true);
    setRunResult(null);
    wsClient.sendSubmitCode(code, currentProblemId, user.userId, user.username);
  }, [wsClient, code, currentProblemId, user]);

  const handleProblemChange = (problemId: number) => {
    const problem = problems.find((p) => p.id === problemId);
    if (problem) {
      setCurrentProblemId(problemId);
      setCode(problem.starterCode);
      setRunResult(null);
    }
  };

  return (
    <div style={styles.app} className="app-container">
      <div style={styles.header} className="header">
        <div style={styles.logo}>🐍 Python 在线代码练习平台</div>
        <div style={styles.headerRight}>
          <span style={styles.username}>{user.username}</span>
        </div>
      </div>

      <div style={styles.mainContainer} className="app-layout">
        <div style={styles.leftPanel} className="left-panel">
          <CodeEditor
            code={code}
            onChange={setCode}
            onRun={handleRunCode}
            onSubmit={handleSubmitCode}
            isRunning={isRunning}
            currentProblem={currentProblem}
          />
          <ResultPanel result={runResult} code={code} onLineClick={(line) => {}} />
        </div>

        <div style={styles.rightPanel} className="right-panel">
          <div style={styles.tabHeader}>
            {(['problem', 'ranking', 'discussion'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...styles.tabButton,
                  ...(activeTab === tab ? styles.tabButtonActive : {}),
                }}
              >
                {tab === 'problem' ? '题目描述' : tab === 'ranking' ? '排行榜' : '讨论区'}
                {activeTab === tab && <div style={styles.tabUnderline} />}
              </button>
            ))}
          </div>

          <div style={styles.tabContent} className="tab-content">
            {activeTab === 'problem' && currentProblem && (
              <div style={styles.problemPanel}>
                <div style={styles.problemSelector}>
                  <select
                    value={currentProblemId}
                    onChange={(e) => handleProblemChange(Number(e.target.value))}
                    style={styles.select}
                  >
                    {problems.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.difficulty === 'easy' ? '简单' : p.difficulty === 'medium' ? '中等' : '困难'})
                      </option>
                    ))}
                  </select>
                </div>
                <h2 style={styles.problemTitle}>{currentProblem.title}</h2>
                <span
                  style={{
                    ...styles.difficultyBadge,
                    backgroundColor:
                      currentProblem.difficulty === 'easy'
                        ? '#22c55e'
                        : currentProblem.difficulty === 'medium'
                        ? '#f59e0b'
                        : '#ef4444',
                  }}
                >
                  {currentProblem.difficulty === 'easy' ? '简单' : currentProblem.difficulty === 'medium' ? '中等' : '困难'}
                </span>
                <div style={styles.problemDescription}>
                  {currentProblem.description.split('\n').map((line, i) => (
                    <p key={i} style={{ margin: '8px 0', lineHeight: 1.6 }}>
                      {line}
                    </p>
                  ))}
                </div>
                <div style={styles.exampleBox}>
                  <h4 style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>输入示例</h4>
                  <pre style={styles.codeBlock}>{currentProblem.inputExample}</pre>
                </div>
                <div style={styles.exampleBox}>
                  <h4 style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>输出示例</h4>
                  <pre style={styles.codeBlock}>{currentProblem.outputExample}</pre>
                </div>
              </div>
            )}

            {activeTab === 'ranking' && (
              <RankTab user={user} problemId={currentProblemId} />
            )}

            {activeTab === 'discussion' && (
              <DiscussionTab user={user} problemId={currentProblemId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DiscussionTab: React.FC<{ user: UserInfo; problemId: number }> = ({ user, problemId }) => {
  const [messages, setMessages] = useState<any[]>([
    {
      id: 1,
      userId: 'user_demo1',
      username: 'Python爱好者',
      content: '这道题用哈希表解法效率最高！',
      timestamp: '2024-01-15 10:30',
      isMine: false,
    },
    {
      id: 2,
      userId: 'user_demo2',
      username: '算法小白',
      content: '谢谢分享，终于理解了~',
      timestamp: '2024-01-15 11:00',
      isMine: false,
    },
  ]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg = {
      id: Date.now(),
      userId: user.userId,
      username: user.username,
      content: input.trim(),
      timestamp: new Date().toLocaleString('zh-CN'),
      isMine: true,
    };
    setMessages((prev) => [newMsg, ...prev].slice(0, 20));
    setInput('');
  };

  return (
    <div style={styles.discussionContainer}>
      <div style={styles.messageList}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.messageWrapper,
              justifyContent: msg.isMine ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              className="scale-in message-bubble"
              style={{
                ...styles.messageBubble,
                backgroundColor: msg.isMine ? 'var(--gradient-start)' : '#f0f0f0',
                color: msg.isMine ? 'white' : '#1a1a2e',
                maxWidth: '70%',
              }}
            >
              {!msg.isMine && <div style={styles.messageSender}>{msg.username}</div>}
              <div style={styles.messageContent}>{msg.content}</div>
              <div
                style={{
                  ...styles.messageTime,
                  color: msg.isMine ? 'rgba(255,255,255,0.7)' : '#888',
                }}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={styles.messageInputWrapper}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="输入消息..."
          style={styles.messageInput}
        />
        <button onClick={sendMessage} className="btn-primary" style={styles.sendBtn}>
          发送
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
  },
  header: {
    height: '56px',
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--bg-card)',
    borderBottom: '1px solid var(--accent)',
    flexShrink: 0,
  },
  logo: {
    fontSize: '18px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  username: {
    color: 'var(--text-primary)',
    fontSize: '14px',
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  leftPanel: {
    width: '65%',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid var(--accent)',
  },
  rightPanel: {
    width: '35%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-card)',
  },
  tabHeader: {
    display: 'flex',
    borderBottom: '1px solid var(--accent)',
    flexShrink: 0,
  },
  tabButton: {
    position: 'relative',
    flex: 1,
    padding: '16px',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'color 0.3s ease',
  },
  tabButtonActive: {
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: '3px',
    background: 'linear-gradient(90deg, var(--gradient-start), var(--gradient-end))',
    borderRadius: '2px',
    animation: 'fadeIn 0.3s ease',
  },
  tabContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
  problemPanel: {},
  problemSelector: {
    marginBottom: '16px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: 'var(--accent)',
    color: 'var(--text-primary)',
    border: 'none',
    fontSize: '14px',
    outline: 'none',
  },
  problemTitle: {
    fontSize: '22px',
    fontWeight: 700,
    marginBottom: '12px',
    display: 'inline-block',
    marginRight: '12px',
  },
  difficultyBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'white',
    verticalAlign: 'middle',
  },
  problemDescription: {
    marginTop: '16px',
    marginBottom: '16px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    lineHeight: 1.8,
  },
  exampleBox: {
    backgroundColor: 'var(--accent)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  codeBlock: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: "'Fira Code', monospace",
    color: 'var(--text-primary)',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  discussionContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: '16px',
  },
  messageWrapper: {
    display: 'flex',
    marginBottom: '16px',
  },
  messageBubble: {
    borderRadius: '12px',
    padding: '10px 14px',
    position: 'relative',
  },
  messageSender: {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '4px',
    opacity: 0.8,
  },
  messageContent: {
    fontSize: '14px',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  messageTime: {
    fontSize: '11px',
    marginTop: '6px',
    textAlign: 'right',
  },
  messageInputWrapper: {
    display: 'flex',
    gap: '8px',
    paddingTop: '16px',
    borderTop: '1px solid var(--accent)',
  },
  messageInput: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: 'var(--accent)',
    color: 'var(--text-primary)',
    border: 'none',
    fontSize: '14px',
    outline: 'none',
  },
  sendBtn: {
    padding: '10px 20px',
  },
};

export default App;
