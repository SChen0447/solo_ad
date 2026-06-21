const http = require('http');

http.get('http://localhost:3001/api/inventory', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const inventory = JSON.parse(data);
    console.log('✅ 食材库存API正常');
    console.log('   食材数量:', inventory.length);
    console.log('   第一个食材:', inventory[0].name);
  });
}).on('error', (err) => {
  console.error('❌ API请求失败:', err.message);
});

http.get('http://localhost:3001/api/recommend', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const recipes = JSON.parse(data);
    console.log('✅ 菜谱推荐API正常');
    console.log('   推荐菜谱数:', recipes.length);
    console.log('   第一个菜谱:', recipes[0]?.name, '匹配度:', recipes[0]?.matchScore + '%');
  });
}).on('error', (err) => {
  console.error('❌ 推荐API请求失败:', err.message);
});

http.get('http://localhost:3001/api/family', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const members = JSON.parse(data);
    console.log('✅ 家庭成员API正常');
    console.log('   成员数量:', members.length);
    console.log('   第一个成员:', members[0].name);
  });
}).on('error', (err) => {
  console.error('❌ 家庭成员API请求失败:', err.message);
});
