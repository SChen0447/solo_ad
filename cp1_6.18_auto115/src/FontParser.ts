export interface FontMetadata {
  familyName: string
  fullName: string
  postScriptName: string
  style: string
  weight: number
  italic: boolean
  fileName: string
}

export class FontParser {
  static async parseFile(file: File): Promise<ArrayBuffer> {
    return await file.arrayBuffer()
  }

  static extractBasicMetadata(file: File, buffer: ArrayBuffer): FontMetadata {
    const baseName = file.name.replace(/\.(ttf|otf|woff2?)$/i, '')
    let familyName = baseName
    let style = 'Regular'
    let weight = 400
    let italic = false

    const nameParts = baseName.split(/[-_\s]+/)
    if (nameParts.length > 1) {
      const last = nameParts[nameParts.length - 1].toLowerCase()
      if (last.includes('bold')) {
        weight = 700
        style = 'Bold'
      } else if (last.includes('light')) {
        weight = 300
        style = 'Light'
      } else if (last.includes('thin')) {
        weight = 100
        style = 'Thin'
      } else if (last.includes('medium')) {
        weight = 500
        style = 'Medium'
      } else if (last.includes('black') || last.includes('heavy')) {
        weight = 900
        style = 'Black'
      }
      if (last.includes('italic') || last.includes('oblique')) {
        italic = true
        style += ' Italic'
      }
      familyName = nameParts.slice(0, -1).join(' ')
    }

    try {
      const extracted = this.parseNameTable(buffer)
      if (extracted.familyName) familyName = extracted.familyName
      if (extracted.style) style = extracted.style
      if (extracted.italic !== undefined) italic = extracted.italic
    } catch (_e) {
      // Fallback to filename-based parsing
    }

    return {
      familyName,
      fullName: `${familyName} ${style}`.trim(),
      postScriptName: `${familyName}-${style}`.replace(/\s+/g, ''),
      style,
      weight,
      italic,
      fileName: file.name
    }
  }

  private static parseNameTable(buffer: ArrayBuffer): Partial<FontMetadata> {
    const result: Partial<FontMetadata> = {}
    const view = new DataView(buffer)
    const offset = 0

    const sfntVersion = view.getUint32(offset, false)
    if (sfntVersion !== 0x00010000 && sfntVersion !== 0x4f54544f) {
      return result
    }

    const numTables = view.getUint16(offset + 4, false)
    let nameTableOffset = -1

    for (let i = 0; i < numTables; i++) {
      const tableOffset = offset + 12 + i * 16
      const tag = view.getUint32(tableOffset, false)
      if (tag === 0x6e616d65) {
        nameTableOffset = view.getUint32(tableOffset + 8, false)
        break
      }
    }

    if (nameTableOffset === -1) return result

    const count = view.getUint16(nameTableOffset + 2, false)
    const stringOffset = view.getUint16(nameTableOffset + 4, false)

    let family: string | null = null
    let style: string | null = null

    for (let i = 0; i < count; i++) {
      const recordOffset = nameTableOffset + 6 + i * 12
      const nameId = view.getUint16(recordOffset + 6, false)
      const length = view.getUint16(recordOffset + 8, false)
      const strOffset = view.getUint16(recordOffset + 10, false)
      const actualOffset = nameTableOffset + stringOffset + strOffset

      if (nameId === 1 && !family) {
        family = this.readString(view, actualOffset, length)
      } else if (nameId === 2 && !style) {
        style = this.readString(view, actualOffset, length)
      }

      if (family && style) break
    }

    if (family) result.familyName = family
    if (style) {
      result.style = style
      if (style.toLowerCase().includes('italic')) {
        result.italic = true
      }
    }

    return result
  }

  private static readString(view: DataView, offset: number, length: number): string {
    const platformId = view.getUint16(offset - 12, false)
    const encodingId = view.getUint16(offset - 10, false)

    if (platformId === 3 || (platformId === 0 && encodingId === 3)) {
      const chars: string[] = []
      for (let i = 0; i < length; i += 2) {
        const code = view.getUint16(offset + i, false)
        chars.push(String.fromCharCode(code))
      }
      return chars.join('')
    }

    const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, length)
    return new TextDecoder('utf-8').decode(bytes)
  }

  static generateFontFamilyKey(familyName: string): string {
    return `custom_${familyName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`
  }
}
