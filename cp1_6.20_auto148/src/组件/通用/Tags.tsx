import React from 'react'
import { TicketCategory, PriorityLevel } from '../../types'

interface CategoryTagProps {
  category: TicketCategory
}

const categoryStyles: Record<TicketCategory, { bg: string; color: string }> = {
  '功能建议': { bg: '#dbeafe', color: '#1e40af' },
  '缺陷报告': { bg: '#fce7f3', color: '#9d174d' },
  '服务投诉': { bg: '#fef3c7', color: '#92400e' },
  '其他': { bg: '#f3f4f6', color: '#374151' },
}

export const CategoryTag: React.FC<CategoryTagProps> = ({ category }) => {
  const style = categoryStyles[category]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 9999,
        backgroundColor: style.bg,
        color: style.color,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {category}
    </span>
  )
}

interface PriorityTagProps {
  priority: PriorityLevel
}

const priorityStyles: Record<PriorityLevel, { bg: string; color: string }> = {
  '紧急': { bg: '#fef2f2', color: '#dc2626' },
  '高': { bg: '#fff7ed', color: '#ea580c' },
  '中': { bg: '#eff6ff', color: '#2563eb' },
  '低': { bg: '#f3f4f6', color: '#6b7280' },
}

export const PriorityTag: React.FC<PriorityTagProps> = ({ priority }) => {
  const style = priorityStyles[priority]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 9999,
        backgroundColor: style.bg,
        color: style.color,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {priority}
    </span>
  )
}

interface KeywordTagProps {
  keyword: string
}

export const KeywordTag: React.FC<KeywordTagProps> = ({ keyword }) => {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 16,
        backgroundColor: '#e0e7ff',
        color: '#4338ca',
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {keyword}
    </span>
  )
}
