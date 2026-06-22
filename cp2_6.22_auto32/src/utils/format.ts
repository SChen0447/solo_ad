export function formatDateCN(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input)
  if (isNaN(date.getTime())) {
    return typeof input === 'string' ? input : ''
  }
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDateShort(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input)
  if (isNaN(date.getTime())) {
    return typeof input === 'string' ? input.slice(5) : ''
  }
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}-${d}`
}
