import { useEffect, useRef } from 'react'

interface QRCodeProps {
  value: string
  size?: number
  level?: 'L' | 'M' | 'Q' | 'H'
}

const GF256_EXP = new Array(512);
const GF256_LOG = new Array(256);

(function initGF256() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x
    GF256_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) {
    GF256_EXP[i] = GF256_EXP[i - 255]
  }
})()

function gfMul(a: number, b: number) {
  if (a === 0 || b === 0) return 0
  return GF256_EXP[GF256_LOG[a] + GF256_LOG[b]]
}

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1]
  for (let i = 0; i < degree; i++) {
    const newPoly = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      newPoly[j] ^= poly[j]
      newPoly[j + 1] ^= gfMul(poly[j], GF256_EXP[i])
    }
    poly = newPoly
  }
  return poly
}

function rsEncode(data: number[], ecLen: number): number[] {
  const gen = rsGeneratorPoly(ecLen)
  const result = new Array(ecLen).fill(0)
  for (const byte of data) {
    const factor = byte ^ result.shift()!
    result.push(0)
    if (factor !== 0) {
      for (let i = 0; i < gen.length - 1; i++) {
        result[i] ^= gfMul(gen[i + 1], factor)
      }
    }
  }
  return result
}

const EC_CODEWORDS: Record<string, number[]> = {
  L: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
}

const TOTAL_CODEWORDS: number[] = [
  26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
  1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034,
  3196, 3362, 3532, 3706
]

const ALIGNMENT_PATTERN_POSITIONS: (number[] | undefined)[] = [
  undefined,
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50]
]

function findMinVersion(dataLen: number, level: string): number {
  for (let v = 1; v <= 10; v++) {
    const total = TOTAL_CODEWORDS[v - 1]
    const ec = EC_CODEWORDS[level][v - 1]
    const dataCap = total - ec
    if (dataLen <= dataCap - 2) return v
  }
  return 10
}

function utf8Encode(str: string): number[] {
  const result: number[] = []
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i)
    if (code < 0x80) {
      result.push(code)
    } else if (code < 0x800) {
      result.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0xd800 || code >= 0xe000) {
      result.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      i++
      const code2 = str.charCodeAt(i)
      const cp = 0x10000 + (((code & 0x3ff) << 10) | (code2 & 0x3ff))
      result.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      )
    }
  }
  return result
}

function generateQRMatrix(value: string, level: string) {
  const encoded = utf8Encode(value)
  const version = findMinVersion(encoded.length, level)
  const size = 17 + version * 4
  const totalCw = TOTAL_CODEWORDS[version - 1]
  const ecCw = EC_CODEWORDS[level][version - 1]
  const dataCw = totalCw - ecCw

  let bitBuffer: number[] = []
  const modeBits = [0, 1, 0, 0]
  bitBuffer.push(...modeBits)

  const charCountBits = version <= 9 ? 8 : 16
  for (let i = charCountBits - 1; i >= 0; i--) {
    bitBuffer.push((encoded.length >> i) & 1)
  }

  for (const byte of encoded) {
    for (let i = 7; i >= 0; i--) {
      bitBuffer.push((byte >> i) & 1)
    }
  }

  if (bitBuffer.length <= dataCw * 8 - 4) {
    bitBuffer.push(0, 0, 0, 0)
  }
  while (bitBuffer.length % 8 !== 0) bitBuffer.push(0)

  const dataBytes: number[] = []
  for (let i = 0; i < bitBuffer.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bitBuffer[i + j] || 0)
    dataBytes.push(byte)
  }

  let padIndex = 0
  const padBytes = [0xec, 0x11]
  while (dataBytes.length < dataCw) {
    dataBytes.push(padBytes[padIndex % 2])
    padIndex++
  }

  const ecBytes = rsEncode(dataBytes, ecCw)
  const allCodewords = [...dataBytes, ...ecBytes]

  let finalBits: number[] = []
  for (const byte of allCodewords) {
    for (let i = 7; i >= 0; i--) finalBits.push((byte >> i) & 1)
  }
  while (finalBits.length < totalCw * 8) finalBits.push(0)

  const matrix: number[][] = []
  const reserved: boolean[][] = []
  for (let i = 0; i < size; i++) {
    matrix.push(new Array(size).fill(0))
    reserved.push(new Array(size).fill(false))
  }

  function setFinder(r: number, c: number) {
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        const rr = r + i, cc = c + j
        if (rr >= 0 && rr < size && cc >= 0 && cc < size) {
          let isDark = false
          if (i >= 0 && i <= 6 && j >= 0 && j <= 6) {
            if (i === 0 || i === 6 || j === 0 || j === 6) isDark = true
            else if (i >= 2 && i <= 4 && j >= 2 && j <= 4) isDark = true
          }
          matrix[rr][cc] = isDark ? 1 : 0
          reserved[rr][cc] = true
        }
      }
    }
  }

  setFinder(0, 0)
  setFinder(0, size - 7)
  setFinder(size - 7, 0)

  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0
    reserved[6][i] = true
    matrix[i][6] = i % 2 === 0 ? 1 : 0
    reserved[i][6] = true
  }
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (i !== 7 && j !== 7 && (i === 7 || j === 7)) {
        reserved[i][j] = true
        reserved[i][size - 1 - j] = true
        reserved[size - 1 - i][j] = true
      }
    }
  }

  const alignPos = ALIGNMENT_PATTERN_POSITIONS[version]
  if (alignPos) {
    for (const r of alignPos) {
      for (const c of alignPos) {
        if (reserved[r][c]) continue
        for (let i = -2; i <= 2; i++) {
          for (let j = -2; j <= 2; j++) {
            const isDark = Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0)
            matrix[r + i][c + j] = isDark ? 1 : 0
            reserved[r + i][c + j] = true
          }
        }
      }
    }
  }

  let bitIdx = 0
  let upward = true
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col--
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i
      for (let c = 0; c < 2; c++) {
        const cc = col - c
        if (!reserved[row][cc]) {
          let dark = finalBits[bitIdx] === 1
          bitIdx++
          const masked = applyMask(dark, row, cc, 0)
          matrix[row][cc] = masked ? 1 : 0
        }
      }
    }
    upward = !upward
  }

  return { matrix, size }
}

function applyMask(dark: boolean, r: number, c: number, _mask: number): boolean {
  const cond = (r + c) % 2 === 0
  return dark ? !cond : cond
}

export function QRCode({ value, size = 200, level = 'M' }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { matrix, size: qrSize } = generateQRMatrix(value, level)
    const padding = 4
    const totalSize = qrSize + padding * 2
    const cellSize = Math.floor(size / totalSize)
    const actualSize = cellSize * totalSize

    canvas.width = actualSize
    canvas.height = actualSize

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, actualSize, actualSize)

    ctx.fillStyle = '#1a237e'
    for (let r = 0; r < qrSize; r++) {
      for (let c = 0; c < qrSize; c++) {
        if (matrix[r][c] === 1) {
          ctx.fillRect(
            (c + padding) * cellSize,
            (r + padding) * cellSize,
            cellSize,
            cellSize
          )
        }
      }
    }
  }, [value, size, level])

  return (
    <canvas
      ref={canvasRef}
      className="qrcode-canvas"
      style={{ width: size, height: size }}
    />
  )
}
