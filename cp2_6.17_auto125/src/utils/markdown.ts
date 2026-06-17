function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function renderMarkdown(text: string): string {
  let html = escapeHtml(text)

  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>')

  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>')

  html = html.replace(/`([^`]+)`/g, '<code style="background-color:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px;color:#be185d;">$1</code>')

  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (match, linkText, url) => {
      if (isValidUrl(url)) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#6366f1;text-decoration:underline;">${linkText}</a>`
      }
      return match
    }
  )

  const lines = html.split('\n')
  const processedLines: string[] = []
  let inList = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) {
        processedLines.push('<ul style="margin:8px 0;padding-left:20px;">')
        inList = true
      }
      const itemContent = trimmed.replace(/^[-*]\s+/, '')
      processedLines.push(`<li style="margin:4px 0;">${itemContent}</li>`)
    } else {
      if (inList) {
        processedLines.push('</ul>')
        inList = false
      }
      if (trimmed === '') {
        processedLines.push('<br/>')
      } else {
        processedLines.push(line)
      }
    }
  }

  if (inList) {
    processedLines.push('</ul>')
  }

  return processedLines.join('\n')
}
