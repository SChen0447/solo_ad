const recipes = [
  {
    id: 1,
    name: '番茄炒蛋',
    ingredients: [
      { name: '番茄', amount: '2个' },
      { name: '鸡蛋', amount: '3个' },
      { name: '盐', amount: '适量' },
      { name: '糖', amount: '1勺' },
      { name: '葱', amount: '少许' }
    ]
  }
]

const userIngredients = ['番茄', '鸡蛋', '盐']
const userIngredientsLower = userIngredients.map(i => i.toLowerCase().trim())

console.log('用户食材(小写):', userIngredientsLower)
console.log('')

for (const recipe of recipes) {
  console.log('菜谱:', recipe.name)
  console.log('菜谱食材:', recipe.ingredients.map(i => i.name))
  
  const matched = recipe.ingredients.filter(ing => {
    const result = userIngredientsLower.includes(ing.name.toLowerCase())
    console.log(`  ${ing.name} -> ${ing.name.toLowerCase()} in [${userIngredientsLower.join(',')}] = ${result}`)
    return result
  })
  
  console.log('匹配数量:', matched.length)
  console.log('匹配度:', Math.round((matched.length / recipe.ingredients.length) * 100) + '%')
}
