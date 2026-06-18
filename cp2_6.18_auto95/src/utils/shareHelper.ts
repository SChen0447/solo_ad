export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    } catch {
      return false
    }
  }
}

export async function copyImageToClipboard(imageBase64: string): Promise<boolean> {
  try {
    const base64Data = imageBase64.split(',')[1] || imageBase64
    const mimeMatch = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/)
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png'

    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType })

    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({ [mimeType]: blob })
      await navigator.clipboard.write([item])
      return true
    }
    return false
  } catch {
    return false
  }
}

export function generateShareLink(): string {
  const baseUrl = window.location.origin + window.location.pathname
  const timestamp = Date.now()
  return `${baseUrl}?share=${timestamp}`
}
