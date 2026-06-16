import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, X, Undo2, FileCode2, CheckCircle, ChevronDown } from 'lucide-react';
import EditorPanel from './components/EditorPanel';
import DiffViewer from './components/DiffViewer';
import {
  Language,
  CommentStyle,
  ParseResult,
  detectLanguage,
  parseCode
} from './utils/CodeParser';
import {
  GeneratedComment,
  generateAllComments,
  applyComments,
  countCommentLines
} from './utils/CommentGenerator';

interface Tab {
  id: string;
  filename: string;
  language: Language;
  originalCode: string;
  parseResult: ParseResult | null;
  comments: GeneratedComment[];
  history: string[];
  historyIndex: number;
}

const MAX_TABS = 10;
const DEBOUNCE_MS = 500;

const sampleCodeByLang: Record<Language, string> = {
  javascript: `// JavaScript示例
function greetUser(name, isAdmin = false) {
  const message = \`Hello, \${name}!\`;
  console.log(message);
  return { name, isAdmin, message };
}

class UserManager {
  constructor(users) {
    this.users = users;
  }

  findUserById(userId) {
    return this.users.find(u => u.id === userId);
  }

  addUser(newUser) {
    this.users.push(newUser);
    return true;
  }
}

const calculateTotal = (items, taxRate = 0.1) => {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 + taxRate);
};
`,
  typescript: `// TypeScript示例
interface User {
  id: number;
  name: string;
  email: string;
}

function formatUserName(user: User, uppercase: boolean = false): string {
  const fullName = \`\${user.name} (\${user.email})\`;
  return uppercase ? fullName.toUpperCase() : fullName;
}

class UserService {
  private users: User[];

  constructor(initialUsers: User[] = []) {
    this.users = initialUsers;
  }

  getUserById(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }

  getAllUsers(): User[] {
    return [...this.users];
  }
}

const asyncFetchUser = async (userId: number): Promise<User | null> => {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    return await response.json();
  } catch {
    return null;
  }
};
`,
  python: `# Python示例
def calculate_discount(price: float, discount_rate: float = 0.1) -> float:
    """Calculate discounted price."""
    return price * (1 - discount_rate)


class ShoppingCart:
    def __init__(self, items: list = None):
        self.items = items or []
    
    def add_item(self, item: dict) -> None:
        self.items.append(item)
    
    def get_total(self, tax_rate: float = 0.08) -> float:
        subtotal = sum(item["price"] for item in self.items)
        return subtotal * (1 + tax_rate)
    
    def remove_item(self, item_id: int) -> bool:
        for i, item in enumerate(self.items):
            if item.get("id") == item_id:
                self.items.pop(i)
                return True
        return False


def is_valid_email(email: str) -> bool:
    return "@" in email and "." in email.split("@")[-1]
`,
  java: `// Java示例
public class UserService {
    private List<User> users;

    public UserService(List<User> initialUsers) {
        this.users = new ArrayList<>(initialUsers);
    }

    public User findUserById(int userId) {
        for (User user : users) {
            if (user.getId() == userId) {
                return user;
            }
        }
        return null;
    }

    public boolean addUser(User newUser) {
        if (newUser != null) {
            users.add(newUser);
            return true;
        }
        return false;
    }

    public int getUserCount() {
        return users.size();
    }
}

public class StringUtils {
    public static String capitalize(String input) {
        if (input == null || input.isEmpty()) {
            return input;
        }
        return input.substring(0, 1).toUpperCase() + input.substring(1);
    }
}
`
};

function createTab(language: Language = 'javascript'): Tab {
  const sampleCode = sampleCodeByLang[language];
  const extMap: Record<Language, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java'
  };
  return {
    id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    filename: `untitled.${extMap[language]}`,
    language,
    originalCode: sampleCode,
    parseResult: null,
    comments: [],
    history: [sampleCode],
    historyIndex: 0
  };
}

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([
    createTab('javascript'),
    createTab('typescript'),
    createTab('python'),
    createTab('java')
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [commentStyle, setCommentStyle] = useState<CommentStyle>('jsdoc');
  const [currentLine, setCurrentLine] = useState<number>(1);
  const [scrollToLine, setScrollToLine] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.6);
  const [isNarrow, setIsNarrow] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState<string | null>(null);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTab = useMemo(
    () => tabs.find(t => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  const modifiedCode = useMemo(
    () => applyComments(activeTab.originalCode, activeTab.comments),
    [activeTab.originalCode, activeTab.comments]
  );

  const appliedCommentLines = useMemo(
    () => countCommentLines(activeTab.comments),
    [activeTab.comments]
  );

  useEffect(() => {
    const checkWidth = () => {
      setIsNarrow(window.innerWidth < 800);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const parseAndGenerateComments = useCallback((tab: Tab, style: CommentStyle) => {
    try {
      const parseResult = parseCode(tab.originalCode, tab.language);
      const comments = generateAllComments(
        parseResult.functions,
        parseResult.classes,
        style,
        tab.language,
        tab.originalCode
      ).map(c => ({ ...c, applied: true }));
      return { parseResult, comments };
    } catch {
      return { parseResult: null, comments: [] };
    }
  }, []);

  useEffect(() => {
    if (!activeTab.originalCode.trim()) {
      setTabs(prev => prev.map(t =>
        t.id === activeTabId
          ? { ...t, parseResult: null, comments: [] }
          : t
      ));
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const { parseResult, comments } = parseAndGenerateComments(activeTab, commentStyle);
      setTabs(prev => prev.map(t =>
        t.id === activeTabId
          ? { ...t, parseResult, comments }
          : t
      ));
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [activeTabId, activeTab.originalCode, commentStyle, parseAndGenerateComments, activeTab]);

  useEffect(() => {
    const { parseResult, comments } = parseAndGenerateComments(activeTab, commentStyle);
    setTabs(prev => prev.map(t =>
      t.id === activeTabId
        ? { ...t, parseResult, comments }
        : t
    ));
  }, [activeTabId, commentStyle]);

  const handleCodeChange = useCallback((newCode: string) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabId) return t;
      const newHistory = t.history.slice(0, t.historyIndex + 1);
      newHistory.push(newCode);
      return {
        ...t,
        originalCode: newCode,
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    }));
  }, [activeTabId]);

  const handleLanguageChange = useCallback((language: Language) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabId) return t;
      const extMap: Record<Language, string> = {
        javascript: 'js',
        typescript: 'ts',
        python: 'py',
        java: 'java'
      };
      const sampleCode = sampleCodeByLang[language];
      return {
        ...t,
        language,
        originalCode: sampleCode,
        filename: `untitled.${extMap[language]}`,
        parseResult: null,
        comments: [],
        history: [sampleCode],
        historyIndex: 0
      };
    }));
    setShowLangDropdown(false);
  }, [activeTabId]);

  const handleStyleChange = useCallback((style: CommentStyle) => {
    setCommentStyle(style);
    setShowStyleDropdown(false);
  }, []);

  const handleCommentToggle = useCallback((commentId: string) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabId) return t;
      const newCode = applyComments(
        t.originalCode,
        t.comments.map(c =>
          c.id === commentId ? { ...c, applied: !c.applied } : c
        )
      );
      return {
        ...t,
        comments: t.comments.map(c =>
          c.id === commentId ? { ...c, applied: !c.applied } : c
        ),
        originalCode: newCode,
        history: [...t.history.slice(0, t.historyIndex + 1), newCode],
        historyIndex: t.historyIndex + 1
      };
    }));
  }, [activeTabId]);

  const handleLineClick = useCallback((lineNumber: number) => {
    setScrollToLine(lineNumber);
    setTimeout(() => setScrollToLine(null), 500);
  }, []);

  const handleUndo = useCallback(() => {
    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabId) return t;
      if (t.historyIndex <= 0) return t;
      const newIndex = t.historyIndex - 1;
      return {
        ...t,
        originalCode: t.history[newIndex],
        historyIndex: newIndex
      };
    }));
  }, [activeTabId]);

  const handleApplyAll = useCallback(() => {
    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabId) return t;
      const newComments = t.comments.map(c => ({ ...c, applied: true }));
      const newCode = applyComments(t.originalCode, newComments);
      return {
        ...t,
        comments: newComments,
        originalCode: newCode,
        history: [...t.history.slice(0, t.historyIndex + 1), newCode],
        historyIndex: t.historyIndex + 1
      };
    }));
  }, [activeTabId]);

  const handleAddTab = useCallback(() => {
    if (tabs.length >= MAX_TABS) return;
    const newTab = createTab('javascript');
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs.length]);

  const handleCloseTab = useCallback((tabId: string) => {
    if (tabs.length <= 1) return;
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId);
      const newTabs = prev.filter(t => t.id !== tabId);
      if (tabId === activeTabId) {
        const newIdx = Math.min(idx, newTabs.length - 1);
        setActiveTabId(newTabs[newIdx].id);
      }
      return newTabs;
    });
    setCloseConfirm(null);
  }, [tabs.length, activeTabId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (isNarrow) {
        const ratio = (e.clientY - rect.top) / rect.height;
        setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
      } else {
        const ratio = (e.clientX - rect.left) / rect.width;
        setSplitRatio(Math.max(0.3, Math.min(0.8, ratio)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isNarrow]);

  const langOptions: { value: Language; label: string; icon: string }[] = [
    { value: 'javascript', label: 'JavaScript', icon: 'JS' },
    { value: 'typescript', label: 'TypeScript', icon: 'TS' },
    { value: 'python', label: 'Python', icon: 'PY' },
    { value: 'java', label: 'Java', icon: 'JV' }
  ];

  const styleOptions: { value: CommentStyle; label: string }[] = [
    { value: 'jsdoc', label: 'JSDoc (JavaScript)' },
    { value: 'sphinx', label: 'Sphinx (Python)' },
    { value: 'javadoc', label: 'JavaDoc (Java)' }
  ];

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="app-title">
            <FileCode2 size={20} />
            <span>Code Comment Generator</span>
          </div>
        </div>

        <div className="toolbar-center">
          <div className="dropdown-wrapper">
            <button
              className="dropdown-btn"
              onClick={() => { setShowLangDropdown(!showLangDropdown); setShowStyleDropdown(false); }}
            >
              <span className="lang-icon">{langOptions.find(l => l.value === activeTab.language)?.icon}</span>
              <span>{langOptions.find(l => l.value === activeTab.language)?.label}</span>
              <ChevronDown size={16} />
            </button>
            {showLangDropdown && (
              <div className="dropdown-menu">
                {langOptions.map(opt => (
                  <div
                    key={opt.value}
                    className={`dropdown-item ${activeTab.language === opt.value ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(opt.value)}
                  >
                    <span className="lang-icon">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dropdown-wrapper">
            <button
              className="dropdown-btn"
              onClick={() => { setShowStyleDropdown(!showStyleDropdown); setShowLangDropdown(false); }}
            >
              <span>注释风格: {styleOptions.find(s => s.value === commentStyle)?.label}</span>
              <ChevronDown size={16} />
            </button>
            {showStyleDropdown && (
              <div className="dropdown-menu">
                {styleOptions.map(opt => (
                  <div
                    key={opt.value}
                    className={`dropdown-item ${commentStyle === opt.value ? 'active' : ''}`}
                    onClick={() => handleStyleChange(opt.value)}
                  >
                    {commentStyle === opt.value && <CheckCircle size={14} />}
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="toolbar-right">
          <button className="toolbar-btn apply-btn" onClick={handleApplyAll} title="应用所有注释">
            <CheckCircle size={16} />
            <span>全部应用</span>
          </button>
          <button className="toolbar-btn undo-btn" onClick={handleUndo} title="撤销 (Ctrl+Z)">
            <Undo2 size={16} />
            <span>撤销</span>
          </button>
        </div>
      </div>

      <div className="tab-bar">
        <div className="tabs-container">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className="tab-lang-icon">
                {langOptions.find(l => l.value === tab.language)?.icon}
              </span>
              <span className="tab-name">{tab.filename}</span>
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setCloseConfirm(tab.id);
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        {tabs.length < MAX_TABS && (
          <button className="add-tab-btn" onClick={handleAddTab} title="新建标签页">
            <Plus size={16} />
          </button>
        )}
      </div>

      <div
        className="main-content"
        ref={containerRef}
        style={{
          flexDirection: isNarrow ? 'column' : 'row'
        }}
      >
        <div
          className="panel editor-panel-wrapper"
          style={{
            [isNarrow ? 'height' : 'width']: `${splitRatio * 100}%`,
            [isNarrow ? 'width' : 'height']: '100%'
          }}
        >
          <EditorPanel
            code={activeTab.originalCode}
            language={activeTab.language}
            onChange={handleCodeChange}
            currentLine={currentLine}
            scrollToLine={scrollToLine}
          />
        </div>

        <div
          className={`splitter ${isResizing ? 'resizing' : ''} ${isNarrow ? 'horizontal' : 'vertical'}`}
          onMouseDown={handleMouseDown}
        />

        <div
          className="panel diff-panel-wrapper"
          style={{
            [isNarrow ? 'height' : 'width']: `${(1 - splitRatio) * 100}%`,
            [isNarrow ? 'width' : 'height']: '100%'
          }}
        >
          <DiffViewer
            originalCode={activeTab.originalCode}
            modifiedCode={modifiedCode}
            comments={activeTab.comments}
            onCommentToggle={handleCommentToggle}
            onLineClick={handleLineClick}
          />
        </div>
      </div>

      <div className="status-bar">
        <div className="status-left">
          <span className="status-item">
            已添加 <strong>{appliedCommentLines}</strong> 行注释
          </span>
          <span className="status-item">
            识别函数/方法: <strong>{activeTab.parseResult?.functions.length || 0}</strong>
          </span>
          <span className="status-item">
            识别类: <strong>{activeTab.parseResult?.classes.length || 0}</strong>
          </span>
        </div>
        <div className="status-right">
          <span className="status-item">行 {currentLine}</span>
          <span className="status-item">{langOptions.find(l => l.value === activeTab.language)?.label}</span>
        </div>
      </div>

      {closeConfirm && (
        <div className="modal-overlay" onClick={() => setCloseConfirm(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>确认关闭</h3>
            <p>确定要关闭该标签页吗？未保存的更改将丢失。</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setCloseConfirm(null)}>
                取消
              </button>
              <button className="modal-btn confirm" onClick={() => handleCloseTab(closeConfirm)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
