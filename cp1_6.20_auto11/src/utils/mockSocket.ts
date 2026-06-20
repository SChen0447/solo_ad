import type { User, CursorPosition, Comment, Reply, Proposal, Snapshot, CodeFile } from '../types';

type EventCallback = (...args: any[]) => void;

class MockSocket {
  private listeners: Map<string, EventCallback[]> = new Map();
  private users: Map<string, User> = new Map();
  private cursors: Record<string, CursorPosition> = {};
  private comments: Comment[] = [];
  private proposals: Proposal[] = [];
  private snapshots: Snapshot[] = [];
  private files: Record<string, CodeFile> = {};
  private roomId: string = '';
  private currentUserId: string = '';

  constructor() {
    this.initMockFiles();
    this.initMockUsers();
    this.initMockComments();
    this.initMockSnapshots();
  }

  private initMockFiles(): void {
    this.files = {
      'main.js': {
        name: 'main.js',
        language: 'javascript',
        content: `// 欢迎使用 CodeCollab 协作平台
// 这里是一个 JavaScript 示例文件

function calculateSum(numbers) {
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    total += numbers[i];
  }
  return total;
}

function findMax(numbers) {
  if (numbers.length === 0) return null;
  let max = numbers[0];
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] > max) {
      max = numbers[i];
    }
  }
  return max;
}

const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
console.log("Sum:", calculateSum(data));
console.log("Max:", findMax(data));

export { calculateSum, findMax };
`,
      },
      'utils.ts': {
        name: 'utils.ts',
        language: 'typescript',
        content: `// TypeScript 工具函数模块

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return \`\${year}-\${month}-\${day}\`;
}

function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return { success: true, data, timestamp: Date.now() };
  } catch (error) {
    return { success: false, error: String(error), timestamp: Date.now() };
  }
}

export { formatDate, validateEmail, fetchData };
export type { User, ApiResponse };
`,
      },
      'algorithm.py': {
        name: 'algorithm.py',
        language: 'python',
        content: `# Python 算法示例文件
from typing import List, Optional, Tuple

def binary_search(arr: List[int], target: int) -> int:
    """二分查找算法"""
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

def quick_sort(arr: List[int]) -> List[int]:
    """快速排序算法"""
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

def fibonacci(n: int) -> int:
    """斐波那契数列（动态规划）"""
    if n <= 1:
        return n
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]

if __name__ == "__main__":
    test_data = [3, 6, 8, 12, 14, 17, 25, 29, 31, 43, 56]
    print("Binary search result:", binary_search(test_data, 17))
    print("Quick sort:", quick_sort([64, 34, 25, 12, 22, 11, 90]))
    print("Fibonacci(10):", fibonacci(10))
`,
      },
    };
  }

  private initMockUsers(): void {
    this.currentUserId = 'user-' + Math.random().toString(36).substr(2, 9);
    this.users.set(this.currentUserId, {
      id: this.currentUserId,
      name: '我',
      color: '#6366f1',
      avatar: '我',
    });

    const otherUsers: User[] = [
      { id: 'user-alice', name: 'Alice', color: '#f43f5e', avatar: 'A' },
      { id: 'user-bob', name: 'Bob', color: '#10b981', avatar: 'B' },
      { id: 'user-charlie', name: 'Charlie', color: '#f59e0b', avatar: 'C' },
    ];
    otherUsers.forEach((u) => this.users.set(u.id, u));
  }

  private initMockComments(): void {
    const currentUser = this.users.get(this.currentUserId)!;
    const alice = this.users.get('user-alice')!;
    const bob = this.users.get('user-bob')!;

    this.comments = [
      {
        id: 'comment-1',
        roomId: 'demo-room',
        lineNumber: 5,
        content: '这里可以考虑使用 Array.reduce 来简化代码',
        author: alice,
        createdAt: Date.now() - 3600000,
        resolved: false,
        replies: [
          {
            id: 'reply-1',
            content: '好建议！reduce 会让代码更简洁',
            author: bob,
            createdAt: Date.now() - 3000000,
          },
        ],
        fileName: 'main.js',
      },
      {
        id: 'comment-2',
        roomId: 'demo-room',
        lineNumber: 15,
        content: '边界条件处理得很好，检查了空数组的情况',
        author: bob,
        createdAt: Date.now() - 1800000,
        resolved: true,
        resolvedBy: alice,
        resolvedAt: Date.now() - 900000,
        replies: [],
        fileName: 'main.js',
      },
      {
        id: 'comment-3',
        roomId: 'demo-room',
        lineNumber: 25,
        content: '建议添加类型保护，避免 numbers 为 undefined 的情况',
        author: alice,
        createdAt: Date.now() - 600000,
        resolved: false,
        replies: [],
        fileName: 'utils.ts',
      },
    ];
  }

  private initMockSnapshots(): void {
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      this.snapshots.push({
        timestamp: now - (10 - i) * 10000,
        files: Object.fromEntries(
          Object.entries(this.files).map(([key, val]) => [key, val.content])
        ),
        currentFile: 'main.js',
      });
    }
  }

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    if (event === 'room-joined') {
      setTimeout(() => {
        callback({
          roomId: this.roomId,
          users: Array.from(this.users.values()),
          currentUser: this.users.get(this.currentUserId),
          files: this.files,
          currentFile: 'main.js',
          comments: this.comments,
          proposals: this.proposals,
          snapshots: this.snapshots,
        });
      }, 100);
    }

    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private trigger(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(...args));
    }
  }

  emit(event: string, data: any): void {
    switch (event) {
      case 'join-room':
        this.roomId = data.roomId;
        this.trigger('room-joined', {
          roomId: data.roomId,
          users: Array.from(this.users.values()),
          currentUser: this.users.get(this.currentUserId),
          files: this.files,
          currentFile: 'main.js',
          comments: this.comments,
          proposals: this.proposals,
          snapshots: this.snapshots,
        });
        this.trigger('user-joined', Array.from(this.users.values()));
        break;

      case 'cursor-update':
        this.cursors[data.cursor.userId] = data.cursor;
        this.trigger('cursors-updated', this.cursors);
        break;

      case 'code-change':
        if (this.files[data.fileName]) {
          this.files[data.fileName].content = data.content;
        }
        this.trigger('code-updated', {
          fileName: data.fileName,
          content: data.content,
          language: data.language,
        });
        break;

      case 'switch-file':
        this.trigger('file-switched', {
          userId: data.userId,
          fileName: data.fileName,
        });
        break;

      case 'comment-add': {
        const newComment: Comment = {
          ...data.comment,
          id: 'comment-' + Date.now(),
          createdAt: Date.now(),
        };
        this.comments.unshift(newComment);
        this.trigger('comment-added', newComment);
        break;
      }

      case 'comment-resolve': {
        const comment = this.comments.find((c) => c.id === data.commentId);
        if (comment) {
          comment.resolved = true;
          comment.resolvedBy = data.user;
          comment.resolvedAt = Date.now();
          this.trigger('comment-updated', comment);
        }
        break;
      }

      case 'comment-reply': {
        const comment = this.comments.find((c) => c.id === data.commentId);
        if (comment) {
          const reply: Reply = {
            ...data.reply,
            id: 'reply-' + Date.now(),
            createdAt: Date.now(),
          };
          comment.replies.push(reply);
          this.trigger('comment-updated', comment);
        }
        break;
      }

      case 'proposal-create': {
        const newProposal: Proposal = {
          ...data.proposal,
          id: 'proposal-' + Date.now(),
          createdAt: Date.now(),
          status: 'pending',
          likes: [],
          rejections: [],
        };
        this.proposals.unshift(newProposal);
        this.trigger('proposal-created', newProposal);
        break;
      }

      case 'proposal-like': {
        const proposal = this.proposals.find((p) => p.id === data.proposalId);
        if (proposal && !proposal.likes.includes(data.userId)) {
          proposal.likes.push(data.userId);
          proposal.rejections = proposal.rejections.filter((u) => u !== data.userId);
          if (proposal.likes.length >= 2) {
            proposal.status = 'approved';
            this.trigger('proposal-approved', proposal);
          }
          this.trigger('proposal-updated', proposal);
        }
        break;
      }

      case 'proposal-reject': {
        const proposal = this.proposals.find((p) => p.id === data.proposalId);
        if (proposal && !proposal.rejections.includes(data.userId)) {
          proposal.rejections.push(data.userId);
          proposal.likes = proposal.likes.filter((u) => u !== data.userId);
          if (proposal.rejections.length >= 2) {
            proposal.status = 'rejected';
          }
          this.trigger('proposal-updated', proposal);
        }
        break;
      }

      case 'proposal-approve': {
        const proposal = this.proposals.find((p) => p.id === data.proposalId);
        if (proposal) {
          proposal.status = 'approved';
          this.trigger('proposal-approved', proposal);
          this.trigger('proposal-updated', proposal);
        }
        break;
      }

      case 'snapshot-save':
        this.snapshots.push(data.snapshot);
        if (this.snapshots.length > 180) {
          this.snapshots = this.snapshots.slice(-180);
        }
        this.trigger('snapshots-updated', this.snapshots);
        break;

      case 'snapshot-restore': {
        const snapshot = this.snapshots[data.snapshotIndex];
        if (snapshot) {
          Object.entries(snapshot.files).forEach(([name, content]) => {
            if (this.files[name]) {
              this.files[name].content = content;
              this.trigger('code-updated', {
                fileName: name,
                content: content,
                language: this.files[name].language,
              });
            }
          });
          this.trigger('snapshot-restored', { index: data.snapshotIndex, snapshot });
        }
        break;
      }

      case 'file-add':
        this.files[data.file.name] = data.file;
        this.trigger('file-added', data.file);
        break;
    }
  }

  disconnect(): void {
    this.listeners.clear();
  }

  getCurrentUserId(): string {
    return this.currentUserId;
  }

  getFiles(): Record<string, CodeFile> {
    return this.files;
  }
}

export const mockSocket = new MockSocket();
export default mockSocket;
