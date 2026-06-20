const fs = require('fs');
const data = JSON.parse(fs.readFileSync('e:\\solo\\SoloAutoDemo\\tasks\\auto178\\backend\\card_data.json', 'utf8'));
console.log('卡牌总数:', data.length);
const elements = {};
data.forEach(card => {
  elements[card.element] = (elements[card.element] || 0) + 1;
});
for (const [elem, count] of Object.entries(elements)) {
  console.log(elem + ':', count + '张');
}
console.log('');
console.log('卡牌列表:');
data.forEach(card => {
  console.log('  ' + card.emoji + ' ' + card.name + ' (' + card.element + ') - 法力:' + card.manaCost);
});
