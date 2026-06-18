import { parseResume } from './src/backend/parser';
import { matchResume, jobTemplates } from './src/backend/matcher';

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

const resume = parseResume(testResume);

console.log('=== 测试前端工程师匹配 ===');
const frontendJob = jobTemplates.find(j => j.id === 'frontend')!;
const frontendReport = matchResume(resume, frontendJob);
console.log('匹配度:', frontendReport.matchPercentage + '%');
console.log('评分:', frontendReport.overallScore + ' / 10');
console.log('星级:', frontendReport.starRating);
console.log('描述:', frontendReport.description);
console.log('匹配技能:', frontendReport.matchedSkills);
console.log('缺失技能:', frontendReport.missingSkills);

console.log('\n=== 测试后端工程师匹配 ===');
const backendJob = jobTemplates.find(j => j.id === 'backend')!;
const backendReport = matchResume(resume, backendJob);
console.log('匹配度:', backendReport.matchPercentage + '%');
console.log('描述:', backendReport.description);
