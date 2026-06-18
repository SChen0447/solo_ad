import { create } from 'zustand'

export interface DiffLine {
  value: string
  added?: boolean
  removed?: boolean
}

interface AppState {
  leftCode: string
  rightCode: string
  appliedLeftCode: string
  appliedRightCode: string
  zoom: number
  syncScroll: boolean
  diffEnabled: boolean
  leftDiffLines: DiffLine[]
  rightDiffLines: DiffLine[]

  setLeftCode: (code: string) => void
  setRightCode: (code: string) => void
  applyLeftCode: () => void
  applyRightCode: () => void
  setZoom: (zoom: number) => void
  setSyncScroll: (enabled: boolean) => void
  setDiffEnabled: (enabled: boolean) => void
  setDiffLines: (left: DiffLine[], right: DiffLine[]) => void
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-top: 0;
    }
    p {
      color: #666;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background: #5c6ac4;
      color: white;
      border-radius: 4px;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>版本 A</h1>
    <p>这是版本 A 的示例页面。你可以在左侧编辑区修改 HTML 代码，然后点击"套用"按钮查看效果。</p>
    <a href="#" class="btn">了解更多</a>
  </div>
</body>
</html>`

const DEFAULT_HTML_B = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0;
      padding: 20px;
      background: #f0f4ff;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      padding: 32px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(92, 106, 196, 0.2);
    }
    h1 {
      color: #5c6ac4;
      margin-top: 0;
    }
    p {
      color: #555;
      line-height: 1.8;
      font-size: 15px;
    }
    .btn {
      display: inline-block;
      padding: 12px 28px;
      background: linear-gradient(135deg, #5c6ac4, #7c8ccc);
      color: white;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>版本 B</h1>
    <p>这是版本 B 的示例页面。与版本 A 相比，样式有所调整。你可以在右侧编辑区修改 HTML 代码，然后点击"套用"按钮查看效果。</p>
    <a href="#" class="btn">立即体验</a>
  </div>
</body>
</html>`

export const useAppStore = create<AppState>((set, get) => ({
  leftCode: DEFAULT_HTML,
  rightCode: DEFAULT_HTML_B,
  appliedLeftCode: DEFAULT_HTML,
  appliedRightCode: DEFAULT_HTML_B,
  zoom: 100,
  syncScroll: true,
  diffEnabled: false,
  leftDiffLines: [],
  rightDiffLines: [],

  setLeftCode: (code: string) => set({ leftCode: code }),
  setRightCode: (code: string) => set({ rightCode: code }),

  applyLeftCode: () => set({ appliedLeftCode: get().leftCode }),
  applyRightCode: () => set({ appliedRightCode: get().rightCode }),

  setZoom: (zoom: number) => set({ zoom }),
  setSyncScroll: (enabled: boolean) => set({ syncScroll: enabled }),
  setDiffEnabled: (enabled: boolean) => set({ diffEnabled: enabled }),

  setDiffLines: (left: DiffLine[], right: DiffLine[]) =>
    set({ leftDiffLines: left, rightDiffLines: right }),
}))
