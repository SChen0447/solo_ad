import express, { Request, Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

interface Problem {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  description: string
  template: string
}

interface PracticeRecord {
  id: string
  problemId: string
  problemTitle: string
  code: string
  submittedAt: string
  success: boolean
  output: string
  error: string
}

const problems: Problem[] = [
  {
    id: '1',
    title: '两数之和',
    difficulty: 'easy',
    description: '给定一个整数数组 nums 和一个整数目标值 target，请你在该数组中找出和为目标值的那两个整数，并返回它们的数组下标。',
    template: `function twoSum(nums: number[], target: number): number[] {
  // 请在这里编写你的代码
  return []
}

// 测试代码
console.log(twoSum([2, 7, 11, 15], 9))
`
  },
  {
    id: '2',
    title: '翻转字符串',
    difficulty: 'easy',
    description: '编写一个函数，将输入的字符串反转过来。',
    template: `function reverseString(s: string): string {
  // 请在这里编写你的代码
  return s
}

// 测试代码
console.log(reverseString("hello"))
`
  },
  {
    id: '3',
    title: '斐波那契数列',
    difficulty: 'medium',
    description: '计算斐波那契数列的第n项。斐波那契数列由0和1开始，之后的每一项都是前两项之和。',
    template: `function fibonacci(n: number): number {
  // 请在这里编写你的代码
  return 0
}

// 测试代码
console.log(fibonacci(10))
`
  },
  {
    id: '4',
    title: '判断回文数',
    difficulty: 'medium',
    description: '给你一个整数 x ，如果 x 是一个回文整数，返回 true ；否则，返回 false 。',
    template: `function isPalindrome(x: number): boolean {
  // 请在这里编写你的代码
  return false
}

// 测试代码
console.log(isPalindrome(121))
console.log(isPalindrome(-121))
`
  },
  {
    id: '5',
    title: '合并两个有序数组',
    difficulty: 'hard',
    description: '给定两个有序整数数组 nums1 和 nums2，请将 nums2 合并到 nums1 中，使 nums1 成为一个有序数组。',
    template: `function merge(nums1: number[], m: number, nums2: number[], n: number): number[] {
  // 请在这里编写你的代码
  return nums1
}

// 测试代码
console.log(merge([1,2,3,0,0,0], 3, [2,5,6], 3))
`
  },
  {
    id: '6',
    title: '最长公共前缀',
    difficulty: 'easy',
    description: '编写一个函数来查找字符串数组中的最长公共前缀。如果不存在公共前缀，返回空字符串 ""。',
    template: `function longestCommonPrefix(strs: string[]): string {
  // 请在这里编写你的代码
  return ""
}

// 测试代码
console.log(longestCommonPrefix(["flower","flow","flight"]))
`
  }
]

const practiceRecords: PracticeRecord[] = []

app.get('/api/problems', (_req: Request, res: Response) => {
  res.json(problems)
})

app.get('/api/problems/:id', (req: Request, res: Response) => {
  const problem = problems.find(p => p.id === req.params.id)
  if (!problem) {
    return res.status(404).json({ error: '题目不存在' })
  }
  res.json(problem)
})

app.post('/api/run', async (req: Request, res: Response) => {
  const { code, problemId } = req.body

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: '代码不能为空' })
  }

  const problem = problems.find(p => p.id === problemId)

  try {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-exec-'))
    const tempFile = path.join(tempDir, 'code.ts')

    const wrapperCode = `
${code}
`
    fs.writeFileSync(tempFile, wrapperCode)

    const result = await executeCode(tempFile)

    fs.rmSync(tempDir, { recursive: true, force: true })

    const record: PracticeRecord = {
      id: uuidv4(),
      problemId: problemId || '',
      problemTitle: problem?.title || '未知题目',
      code,
      submittedAt: new Date().toISOString(),
      success: !result.error,
      output: result.stdout,
      error: result.stderr
    }

    practiceRecords.push(record)

    res.json({
      success: !result.error,
      output: result.stdout,
      error: result.stderr,
      recordId: record.id
    })
  } catch (err) {
    res.status(500).json({ error: '执行出错' })
  }
})

function executeCode(filePath: string): Promise<{ stdout: string; stderr: string; error: boolean }> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', filePath], {
      timeout: 5000,
      shell: true
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('error', (err) => {
      stderr += err.message
      resolve({ stdout, stderr, error: true })
    })

    child.on('close', (code) => {
      resolve({ stdout, stderr, error: code !== 0 })
    })
  })
}

app.get('/api/records', (_req: Request, res: Response) => {
  res.json(practiceRecords)
})

app.get('/api/records/:id', (req: Request, res: Response) => {
  const record = practiceRecords.find(r => r.id === req.params.id)
  if (!record) {
    return res.status(404).json({ error: '记录不存在' })
  }
  res.json(record)
})

app.get('/api/stats', (_req: Request, res: Response) => {
  const totalAttempts = practiceRecords.length
  const successfulAttempts = practiceRecords.filter(r => r.success).length

  const dateSet = new Set(
    practiceRecords.map(r => new Date(r.submittedAt).toDateString())
  )

  const sortedDates = Array.from(dateSet).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  )

  let streak = 0
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  if (sortedDates.length > 0) {
    const latestDate = sortedDates[0]
    if (latestDate === today || latestDate === yesterday) {
      streak = 1
      for (let i = 1; i < sortedDates.length; i++) {
        const current = new Date(sortedDates[i - 1])
        const prev = new Date(sortedDates[i])
        const diffDays = Math.floor((current.getTime() - prev.getTime()) / 86400000)
        if (diffDays === 1) {
          streak++
        } else {
          break
        }
      }
    }
  }

  const problemStats = problems.map(p => ({
    problemId: p.id,
    title: p.title,
    attempts: practiceRecords.filter(r => r.problemId === p.id).length,
    success: practiceRecords.filter(r => r.problemId === p.id && r.success).length
  }))

  res.json({
    totalAttempts,
    successfulAttempts,
    successRate: totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0,
    currentStreak: streak,
    uniqueDays: dateSet.size,
    problemStats
  })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
