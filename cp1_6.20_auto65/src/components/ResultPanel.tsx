import React, { useState } from 'react';
import type { RunResult, CodeWarning } from '../types';

interface ResultPanelProps {
  result: RunResult | null;
  code: string;
  onLineClick: (line: number) => void;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ result, code, onLineClick }) => {
  const [outputMode, setOutputMode] = useState<'text' | 'html'>('text');
  const [activeSection, setActiveSection] = useState<'output' | 'warnings' | 'tests'>('output');

  if (!result) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyText}>点击上方「运行」按钮执行代码</div>
      </div>
    );
  }

  const passRate = result.testCases
    ? (result.testCases.filter((t) => t.passed).length / result.testCases.length
    : 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.tabs}>
          {(['output', 'warnings', 'tests'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSection(tab)}
              style={{
                ...styles.tab,
                ...(activeSection === tab ? styles.tabActive : {}),
              }}
            >
              {tab === 'output'
                ? '运行结果'
                : tab === 'warnings'
                ? `代码分析 ${result.warnings && result.warnings.length > 0 ? `(${result.warnings.length})` : ''}`
                : `测试用例 ${result.testCases ? `(${Math.round(passRate * 100)}%)` : ''}`
            </button>
          ))}
        </div>
        <div style={styles.modeSwitch}>
          <button
            onClick={() => setOutputMode('text')}
            style={{
              ...styles.modeBtn,
              ...(outputMode === 'text' ? styles.modeBtnActive : {}),
            }}
          >
            纯文本
          </button>
          <button
            onClick={() => setOutputMode('html')}
            style={{
              ...styles.modeBtn,
              ...(outputMode === 'html' ? styles.modeBtnActive : {}),
            }}
          >
            HTML
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {activeSection === 'output' && (
          <div style={styles.outputSection}>
            {result.timeout && (
              <div style={styles.timeoutBanner}>⏱️ 执行超时（超过2秒限制）</div>
            )}
            {result.stderr && (
              <div style={styles.errorSection}>
                <div style={styles.sectionTitle}>❌ 错误信息</div>
                <pre style={styles.errorContent}>{result.stderr}</pre>
              </div>
            )}
            {result.stdout && (
              <div style={styles.stdoutSection}>
                <div style={styles.sectionTitle}>📤 标准输出</div>
                {outputMode === 'text' ? (
                  <pre style={styles.stdoutContent}>{result.stdout}</pre>
                ) : (
                  <div
                    style={styles.htmlContent}
                    dangerouslySetInnerHTML={{ __html: result.stdout }}
                  />
                )}
              </div>
            )}
            {!result.stdout && !result.stderr && !result.timeout && (
              <div style={styles.noOutput}>(无输出)</div>
            )}
            <div style={styles.executionInfo}>
              执行时间: <strong>{result.executionTime}ms</strong>
              {result.exitCode !== undefined && (
                <>
                  {' '}
                  | 退出码: <strong>{result.exitCode}</strong>
                </>
              )}
            </div>
          </div>
        )}

        {activeSection === 'warnings' && (
          <div style={styles.warningsSection}>
            {result.warnings && result.warnings.length > 0 ? (
              result.warnings.map((warning: CodeWarning, index: number) => (
                <div
                  key={index}
                  onClick={() => onLineClick(warning.line)}
                  style={styles.warningItem}
                >
                  <span
                    style={{
                      ...styles.warningType,
                      backgroundColor:
                        warning.type === 'error'
                          ? 'rgba(248, 113, 113, 0.2)'
                          : warning.type === 'warning'
                          ? 'rgba(251, 191, 36, 0.2)'
                          : 'rgba(59, 130, 246, 0.2)',
                      color:
                        warning.type === 'error'
                          ? '#f87171'
                          : warning.type === 'warning'
                          ? '#fbbf24'
                          : '#3b82f6',
                    }}
                  >
                    {warning.type === 'error'
                      ? '错误'
                      : warning.type === 'warning'
                      ? '警告'
                      : '提示'}
                  </span>
                  <span style={styles.warningLine}>第{warning.line}行</span>
                  <span style={styles.warningMessage}>{warning.message}</span>
                </div>
              ))
            ) : (
              <div style={styles.noWarnings}>✅ 未发现代码问题</div>
            )}
          </div>
        )}

        {activeSection === 'tests' && (
          <div style={styles.testsSection}>
            {result.testCases && result.testCases.length > 0 ? (
              <>
                <div style={styles.passRateInfo}>
                  通过率: {passRate * 100}% ({result.testCases.filter((t) => t.passed).length}/
                  {result.testCases.length})
                </div>
                {result.testCases.map((testCase) => (
                  <div
                    key={testCase.id}
                    style={{
                      ...styles.testCaseItem,
                      borderLeftColor: testCase.passed ? '#4ade80' : '#f87171',
                    }}
                  >
                    <span
                      style={{
                        ...styles.testCaseBadge,
                        backgroundColor: testCase.passed
                          ? 'rgba(74, 222, 128, 0.2)'
                          : 'rgba(248, 113, 113, 0.2)',
                        color: testCase.passed ? '#4ade80' : '#f87171',
                      }}
                    >
                      {testCase.passed ? '✓ 通过' : '✗ 失败'}
                    </span>
                    <span style={styles.testCaseId}>测试用例 #{testCase.id}</span>
                    {!testCase.passed && testCase.error && (
                      <div style={styles.testCaseError}>错误: {testCase.error}</div>
                    )}
                    {!testCase.passed && testCase.expectedOutput && (
                      <div style={styles.testCaseDiff}>
                        <div>期望输出: <code style={styles.inlineCode}>{testCase.expectedOutput}</code></div>
                        <div>实际输出: <code style={styles.inlineCode}>{testCase.actualOutput}</code></div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div style={styles.noTests}>点击「提交评测」运行测试用例</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '280px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-card)',
    borderTop: '1px solid var(--accent)',
    flexShrink: 0,
  },
  emptyContainer: {
    height: '280px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-card)',
    borderTop: '1px solid var(--accent)',
    flexShrink: 0,
  },
  emptyText: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: '1px solid var(--accent)',
    flexShrink: 0,
  },
  tabs: {
    display: 'flex',
    gap: '4px',
  },
  tab: {
    padding: '6px 16px',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    borderRadius: '6px',
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: 'var(--accent)',
    color: 'var(--text-primary)',
  },
  modeSwitch: {
    display: 'flex',
    gap: '4px',
    backgroundColor: 'var(--accent)',
    borderRadius: '6px',
    padding: '2px',
  },
  modeBtn: {
    padding: '4px 12px',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    borderRadius: '4px',
    transition: 'all 0.2s',
  },
  modeBtnActive: {
    backgroundColor: 'var(--gradient-start)',
    color: 'white',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },
  outputSection: {},
  timeoutBanner: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    color: '#fbbf24',
    padding: '8px 12px',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '13px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '8px',
  },
  errorSection: {
    marginBottom: '12px',
  },
  errorContent: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    padding: '12px',
    borderRadius: '6px',
    color: '#f87171',
    fontFamily: "'Fira Code', monospace",
    fontSize: '12px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    maxHeight: '120px',
    overflowY: 'auto',
  },
  stdoutSection: {},
  stdoutContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: '12px',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontFamily: "'Fira Code', monospace",
    fontSize: '12px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    maxHeight: '120px',
    overflowY: 'auto',
  },
  htmlContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: '12px',
    borderRadius: '6px',
    maxHeight: '120px',
    overflowY: 'auto',
  },
  noOutput: {
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontStyle: 'italic',
  },
  executionInfo: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid var(--accent)',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  warningsSection: {},
  warningItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '6px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  warningType: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    flexShrink: 0,
  },
  warningLine: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  warningMessage: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    flex: 1,
  },
  noWarnings: {
    color: '#4ade80',
    fontSize: '14px',
    textAlign: 'center',
    padding: '24px',
  },
  testsSection: {},
  passRateInfo: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '12px',
    color: 'var(--text-primary)',
  },
  testCaseItem: {
    padding: '10px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '6px',
    marginBottom: '8px',
    borderLeft: '3px solid',
  },
  testCaseBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    marginRight: '8px',
  },
  testCaseId: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  testCaseError: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#f87171',
  },
  testCaseDiff: {
    marginTop: '8px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  inlineCode: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: "'Fira Code', monospace",
    fontSize: '11px',
  },
  noTests: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
    textAlign: 'center',
    padding: '24px',
  },
};

export default ResultPanel;
