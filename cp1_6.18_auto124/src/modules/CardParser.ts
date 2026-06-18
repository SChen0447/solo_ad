import { v4 as uuidv4 } from 'uuid'
import { Card, getRandomColor } from './GridStore'

const DATE_PATTERNS = [
  /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
  /(\d{4})年(\d{1,2})月(\d{1,2})日/,
  /(\d{4})\.(\d{1,2})\.(\d{1,2})/
]

export const extractDate = (text: string): Date | null => {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const year = parseInt(match[1], 10)
      const month = parseInt(match[2], 10) - 1
      const day = parseInt(match[3], 10)
      const date = new Date(year, month, day)
      if (!isNaN(date.getTime())) {
        return date
      }
    }
  }
  return null
}

export const parseText = (text: string): Card[] => {
  const lines = text.split(/\n\n+/).filter(line => line.trim())
  const cards: Card[] = []

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    const timestamp = extractDate(trimmedLine)
    const isUnfiled = timestamp === null

    let title = trimmedLine.substring(0, 30)
    let content = trimmedLine

    const firstNewline = trimmedLine.indexOf('\n')
    if (firstNewline > 0) {
      title = trimmedLine.substring(0, Math.min(firstNewline, 30))
      content = trimmedLine.substring(firstNewline + 1).trim()
    }

    const card: Card = {
      id: uuidv4(),
      title: title || '未命名',
      content: content.substring(0, 200),
      timestamp,
      color: getRandomColor(),
      isUnfiled,
      createdAt: Date.now(),
      x: 0,
      y: 0,
      scale: 1,
      isNew: true
    }

    cards.push(card)
  }

  return cards
}

export const parseImage = async (file: File): Promise<Card> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      const timestamp = extractDate(file.name) || null
      const isUnfiled = timestamp === null

      const img = new window.Image()
      img.onload = () => {
        const card: Card = {
          id: uuidv4(),
          title: file.name.replace(/\.[^/.]+$/, '').substring(0, 30) || '图片',
          content: isUnfiled ? '未归档' : `拍摄于 ${formatDate(timestamp!)}`,
          timestamp,
          imageUrl,
          color: getRandomColor(),
          isUnfiled,
          createdAt: Date.now(),
          x: 0,
          y: 0,
          scale: 1,
          isNew: true
        }
        resolve(card)
      }
      img.onerror = () => {
        const card: Card = {
          id: uuidv4(),
          title: file.name.replace(/\.[^/.]+$/, '').substring(0, 30) || '图片',
          content: isUnfiled ? '未归档' : `拍摄于 ${formatDate(timestamp!)}`,
          timestamp,
          imageUrl,
          color: getRandomColor(),
          isUnfiled,
          createdAt: Date.now(),
          x: 0,
          y: 0,
          scale: 1,
          isNew: true
        }
        resolve(card)
      }
      img.src = imageUrl
    }

    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const isValidImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  return validTypes.includes(file.type)
}
