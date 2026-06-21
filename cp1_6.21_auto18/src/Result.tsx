import React from 'react'

interface ResultProps {
  output: string
  error: string
  success: boolean | null
}

const Result: React.FC<ResultProps> = ({ output, error, success }) => {
  const outputClass = success === null ? '' : success ? 'success' : 'error'

  return (
    <div className="result-container">
      <div className="result-header">
        <span>运行结果</span>
        {success !== null && (
          <span className={`status-badge ${success ? 'success' : 'failed'}`}>
            {success ? '运行成功' : '运行失败'}
          </span>
        )}
      </div>
      <div className={`result-output ${outputClass}`}>
        {!output && !error && success === null && (
          <span style={{ color: '#666' }}>点击"运行代码"按钮查看结果...</span>
        )}
        {output && <div className="stdout">{output}</div>}
        {error && <div className="stderr">{error}</div>}
      </div>
    </div>
  )
}

export default Result
