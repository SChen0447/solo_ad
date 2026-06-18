import { parseResume } from './src/backend/parser';

const testResume = `张三
高级前端工程师

联系方式
邮箱: zhangsan@example.com
电话: 13800138000

专业技能
JavaScript, TypeScript, React, Vue.js, HTML, CSS, Node.js, Git, Webpack, Vite

工作经历
2021年03月 - 至今
某某科技有限公司
高级前端工程师
负责公司核心产品的前端开发工作，参与技术选型和架构设计。

2018年06月 - 2021年02月
某互联网公司
前端开发工程师
负责多个Web应用的开发和维护。

教育背景
2014年09月 - 2018年06月
某某大学
本科
计算机科学与技术
`;

const result = parseResume(testResume);
console.log('=== 解析结果 ===');
console.log('姓名:', result.name);
console.log('技能数量:', result.skills.length);
console.log('技能列表:', result.skills);
console.log('工作经历数量:', result.workExperience.length);
console.log('工作经历:', JSON.stringify(result.workExperience, null, 2));
console.log('教育背景数量:', result.education.length);
console.log('教育背景:', JSON.stringify(result.education, null, 2));
