const HEATMAP_COLORS = {
  LOW: { r: 255, g: 77, b: 79 },
  HIGH: { r: 82, g: 196, b: 26 },
  EMPTY: { r: 42, g: 42, b: 74 },
}

function interpolateRGB(c1, c2, t) {
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  return `rgb(${r},${g},${b})`
}

function getScoreColorDynamic(score, minScore, maxScore) {
  if (score <= 0) {
    const e = HEATMAP_COLORS.EMPTY
    return `rgb(${e.r},${e.g},${e.b})`
  }
  if (maxScore === minScore) {
    return interpolateRGB(HEATMAP_COLORS.LOW, HEATMAP_COLORS.HIGH, 0.5)
  }
  const normalized = (score - minScore) / (maxScore - minScore)
  return interpolateRGB(HEATMAP_COLORS.LOW, HEATMAP_COLORS.HIGH, normalized)
}

console.log('=== 测试 1: 大范围分布 (1.0 - 5.0) ===')
console.log('最低分 1.0:', getScoreColorDynamic(1.0, 1.0, 5.0))
console.log('2.0:', getScoreColorDynamic(2.0, 1.0, 5.0))
console.log('中点 3.0:', getScoreColorDynamic(3.0, 1.0, 5.0))
console.log('4.0:', getScoreColorDynamic(4.0, 1.0, 5.0))
console.log('最高分 5.0:', getScoreColorDynamic(5.0, 1.0, 5.0))

console.log('\n=== 测试 2: 中间集中分布 (3.0 - 3.8) ===')
console.log('最低分 3.0:', getScoreColorDynamic(3.0, 3.0, 3.8))
console.log('3.2:', getScoreColorDynamic(3.2, 3.0, 3.8))
console.log('中点 3.4:', getScoreColorDynamic(3.4, 3.0, 3.8))
console.log('3.6:', getScoreColorDynamic(3.6, 3.0, 3.8))
console.log('最高分 3.8:', getScoreColorDynamic(3.8, 3.0, 3.8))

console.log('\n=== 测试 3: 所有分数相同 (4.2 - 4.2) ===')
console.log('4.2 (应返回中点色):', getScoreColorDynamic(4.2, 4.2, 4.2))

console.log('\n=== 测试 4: 未投票舞台 (0分) ===')
console.log('0分 (占位色):', getScoreColorDynamic(0, 1.0, 5.0))

console.log('\n=== 测试 5: 两端接近分布 (4.5 - 4.9) ===')
console.log('4.5:', getScoreColorDynamic(4.5, 4.5, 4.9))
console.log('4.7:', getScoreColorDynamic(4.7, 4.5, 4.9))
console.log('4.9:', getScoreColorDynamic(4.9, 4.5, 4.9))

console.log('\n=== 测试 6: 5个舞台模拟数据 ===')
const stages = [
  { name: '主舞台', score: 4.8 },
  { name: '电子舞台', score: 4.2 },
  { name: '摇滚舞台', score: 3.5 },
  { name: '民谣舞台', score: 2.8 },
  { name: '嘻哈舞台', score: 1.5 },
]
const scores = stages.map((s) => s.score)
const min = Math.min(...scores)
const max = Math.max(...scores)
console.log('分数范围:', min, '-', max)
stages.forEach((s) => {
  console.log(`  ${s.name}: ${s.score} → ${getScoreColorDynamic(s.score, min, max)}`)
})
