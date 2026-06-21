import React, { useState, useEffect } from 'react'
import { Problem } from './types'
import Result from './Result'

interface EditorProps {
  problem: Problem
  onRunComplete?: () => void
}

const Editor: React.FC<EditorProps> = ({ problem, onRunComplete }) => {
  const [code, setCode] = useState(problem.template)
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<boolean | null>(null)

  useEffect(() => {
    setCode(problem.template)
    setOutput('')
    setError('')
    setSuccess(null)
  }, [problem.id, problem.template])

  const handleRun = async () => {
    setIsRunning(true)
    setOutput('')
    setError('')
    setSuccess(null)

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          problemId: problem.id,
        }),
      })

      const data = await response.json()

      setOutput(data.output || '')
      setError(data.error || '')
      setSuccess(data.success)
      onRunComplete?.()
    } catch (err) {
      setError('连接服务器失败，请稍后重试')
      setSuccess(false)
    } finally {
      setIsRunning(false)
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value)
  }

  return (
    <>
      <div className="editor-container">
        <div className="editor-header">
          <span>代码编辑器</span>
          <button className="run-btn" onClick={handleRun} disabled={isRunning}>
            {isRunning ? (
              <>
                <div className="spinner" />
                运行中...
              </>
            ) : (
              <>
                ▶ 运行代码
              </>
            )}
          </button>
        </div>
        <textarea
          className="code-editor"
          value={code}
          onChange={handleCodeChange}
          placeholder="请在此处编写代码..."
          spellCheck={false}
        />
      </div>
      <Result output={output} error={error} success={success} />
    </>
  )
}

export default Editor
