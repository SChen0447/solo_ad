import type { ContractFields, TemplateDefinition } from '../types';

const formatAmount = (n: number) =>
  '¥ ' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (s?: string) => {
  if (!s) return '______年___月___日';
  const d = new Date(s);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

export const templates: TemplateDefinition[] = [
  {
    id: 'labor_service',
    name: '劳务服务合同',
    description: '设计师、翻译、开发等劳务服务类通用模板',
    icon: '💼',
    render: (f: ContractFields) => `
<h1 style="text-align:center;font-size:22px;margin-bottom:24px;letter-spacing:4px;">劳务服务合同</h1>
<p style="text-align:right;color:#666;margin-bottom:32px;">合同编号：LS-${Date.now().toString().slice(-8)}</p>

<p>甲方：<strong>${f.partyA}</strong></p>
<p>乙方：<strong>${f.partyB}</strong></p>

<p style="margin-top:20px;line-height:1.8;">根据《中华人民共和国民法典》及相关法律法规，甲乙双方本着平等自愿、诚实信用的原则，经协商一致，就乙方为甲方提供劳务服务事宜，签订本合同，以资共同遵守。</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第一条 服务内容</h3>
<p style="line-height:1.8;">乙方同意按照甲方要求，提供以下劳务服务：<br/><br/>
&nbsp;&nbsp;&nbsp;&nbsp;<strong>${f.projectContent}</strong><br/><br/>
乙方应按照行业标准及甲方合理要求，按时、按质、按量完成上述服务。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第二条 服务期限</h3>
<p style="line-height:1.8;">本合同服务期限自 <strong>${formatDate(f.startDate)}</strong> 起至 <strong>${formatDate(f.endDate)}</strong> 止。到期前30日内双方可协商续签事宜。</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第三条 服务费用与支付方式</h3>
<p style="line-height:1.8;">
1. 本合同项下服务总费用为人民币：<strong style="color:#E74C3C;font-size:16px;">${formatAmount(f.amount)}</strong>（大写：${toChineseMoney(f.amount)}元整）。<br/>
2. 甲方应于本合同签订后3个工作日内支付总费用的30%作为预付款；服务完成并经甲方验收合格后7个工作日内支付剩余70%款项。<br/>
3. 所有款项支付至乙方指定账户，乙方需提供等额增值税发票。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第四条 双方权利义务</h3>
<p style="line-height:1.8;">
（一）甲方权利义务<br/>
&nbsp;&nbsp;1. 甲方应及时向乙方提供服务所需的全部资料与信息；<br/>
&nbsp;&nbsp;2. 甲方应按本合同约定及时支付服务费用；<br/>
&nbsp;&nbsp;3. 甲方有权对乙方服务进度与质量进行监督检查。<br/><br/>
（二）乙方权利义务<br/>
&nbsp;&nbsp;1. 乙方应按本合同约定独立完成劳务服务，不得转包；<br/>
&nbsp;&nbsp;2. 乙方应妥善保管甲方提供的资料，未经许可不得向第三方披露；<br/>
&nbsp;&nbsp;3. 乙方有权按本合同约定收取服务费用。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第五条 违约责任</h3>
<p style="line-height:1.8;">任何一方违反本合同约定，应向守约方支付合同总金额10%的违约金；给对方造成损失的，还应赔偿实际损失。因不可抗力导致本合同无法履行的，双方均不承担违约责任。</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第六条 争议解决</h3>
<p style="line-height:1.8;">本合同在履行过程中发生的争议，双方应友好协商解决；协商不成的，任何一方均有权向甲方所在地人民法院提起诉讼。</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第七条 其他</h3>
<p style="line-height:1.8;">本合同一式两份，甲乙双方各执一份，自双方签字盖章之日起生效，具有同等法律效力。本合同未尽事宜，双方可另行签订补充协议。</p>

<div style="display:flex;justify-content:space-between;margin-top:60px;gap:40px;">
  <div style="flex:1;">
    <p><strong>甲方（盖章）：${f.partyA}</strong></p>
    <p style="margin-top:12px;">授权代表签字：__________________</p>
    <p style="margin-top:12px;">签署日期：${formatDate(f.startDate)}</p>
  </div>
  <div style="flex:1;">
    <p><strong>乙方（签字）：${f.partyB}</strong></p>
    <p style="margin-top:12px;">授权代表签字：__________________</p>
    <p style="margin-top:12px;">签署日期：${formatDate(f.startDate)}</p>
  </div>
</div>
`,
  },
  {
    id: 'confidentiality',
    name: '保密协议',
    description: '双方合作期间商业秘密与技术信息保密约定',
    icon: '🔒',
    render: (f: ContractFields) => `
<h1 style="text-align:center;font-size:22px;margin-bottom:24px;letter-spacing:4px;">保 密 协 议</h1>
<p style="text-align:right;color:#666;margin-bottom:32px;">协议编号：ND-${Date.now().toString().slice(-8)}</p>

<p>甲方：<strong>${f.partyA}</strong></p>
<p>乙方：<strong>${f.partyB}</strong></p>

<p style="margin-top:20px;line-height:1.8;">鉴于甲乙双方在 <strong>${f.projectContent}</strong> 合作过程中，可能知悉对方的商业秘密、技术秘密及其他保密信息。为保护双方合法权益，经友好协商，就保密事宜达成如下协议：</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第一条 保密信息范围</h3>
<p style="line-height:1.8;">
保密信息包括但不限于：<br/>
1. 技术信息：技术方案、源代码、算法、数据库、专利申请等；<br/>
2. 经营信息：客户名单、报价策略、合同条款、财务数据、商业计划等；<br/>
3. 其他双方以书面或口头形式标注为保密的信息。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第二条 保密义务</h3>
<p style="line-height:1.8;">
1. 双方对知悉的保密信息应采取不低于保护自身同类信息的合理保密措施；<br/>
2. 未经对方书面同意，任何一方不得向第三方披露、复制、转让保密信息；<br/>
3. 仅可向因履行本协议必需知悉的员工披露，并确保该等员工承担同等保密义务。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第三条 保密期限</h3>
<p style="line-height:1.8;">本协议保密期限自 <strong>${formatDate(f.startDate)}</strong> 起至 <strong>${formatDate(f.endDate)}</strong>，保密信息到期后仍未公开的，保密义务继续有效直至该信息公开之日止。</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第四条 保密费用</h3>
<p style="line-height:1.8;">
双方确认，甲方就乙方承担本协议项下保密义务支付保密费用合计人民币 <strong style="color:#E74C3C;font-size:16px;">${formatAmount(f.amount)}</strong>。本费用为双方确认的保密义务对价，乙方已充分知悉并同意。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第五条 违约责任</h3>
<p style="line-height:1.8;">
任何一方违反本协议约定的，应向守约方支付违约金人民币 大写壹拾万元整（¥100,000.00）；违约金不足以弥补损失的，违约方还应赔偿全部实际损失，包括但不限于维权产生的律师费、诉讼费、公证费等。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第六条 适用法律与争议解决</h3>
<p style="line-height:1.8;">本协议适用中华人民共和国法律。因本协议产生的争议，双方协商解决；协商不成的，提交甲方所在地有管辖权的人民法院诉讼解决。</p>

<p style="margin-top:24px;line-height:1.8;">本协议一式两份，双方各执一份，自双方签字盖章之日起生效，具有同等法律效力。</p>

<div style="display:flex;justify-content:space-between;margin-top:60px;gap:40px;">
  <div style="flex:1;">
    <p><strong>甲方（盖章）：${f.partyA}</strong></p>
    <p style="margin-top:12px;">授权代表签字：__________________</p>
    <p style="margin-top:12px;">签署日期：${formatDate(f.startDate)}</p>
  </div>
  <div style="flex:1;">
    <p><strong>乙方（签字）：${f.partyB}</strong></p>
    <p style="margin-top:12px;">授权代表签字：__________________</p>
    <p style="margin-top:12px;">签署日期：${formatDate(f.startDate)}</p>
  </div>
</div>
`,
  },
  {
    id: 'project_entrust',
    name: '项目委托合同',
    description: '软件开发、系统搭建等项目型委托服务专用',
    icon: '📋',
    render: (f: ContractFields) => `
<h1 style="text-align:center;font-size:22px;margin-bottom:24px;letter-spacing:4px;">项目委托合同</h1>
<p style="text-align:right;color:#666;margin-bottom:32px;">合同编号：PE-${Date.now().toString().slice(-8)}</p>

<p>委托方（甲方）：<strong>${f.partyA}</strong></p>
<p>受托方（乙方）：<strong>${f.partyB}</strong></p>

<p style="margin-top:20px;line-height:1.8;">甲方委托乙方实施 <strong>${f.projectContent}</strong> 项目（以下简称"本项目"）。根据《中华人民共和国民法典》《著作权法》等法律法规，双方经充分协商，订立本合同，以昭信守。</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第一条 项目内容与要求</h3>
<p style="line-height:1.8;">
1. 项目名称：${f.projectContent}<br/>
2. 项目范围：以双方签字确认的《项目需求说明书》为准，该文件作为本合同附件一；<br/>
3. 质量标准：符合国家及行业相关技术标准，满足甲方项目需求说明书中约定的全部功能与性能要求；<br/>
4. 交付物：源代码、可执行文件、数据库脚本、技术文档、用户手册、部署文档等。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第二条 项目工期</h3>
<p style="line-height:1.8;">
1. 项目启动日期：<strong>${formatDate(f.startDate)}</strong><br/>
2. 项目验收截止日期：<strong>${formatDate(f.endDate)}</strong><br/>
3. 项目里程碑：<br/>
&nbsp;&nbsp;(1) 需求确认阶段：启动后10个工作日内；<br/>
&nbsp;&nbsp;(2) 设计评审阶段：需求确认后15个工作日内；<br/>
&nbsp;&nbsp;(3) 开发联调阶段：设计评审后60个工作日内；<br/>
&nbsp;&nbsp;(4) 测试验收阶段：开发完成后15个工作日内。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第三条 项目费用与支付</h3>
<p style="line-height:1.8;">
1. 项目总费用：人民币 <strong style="color:#E74C3C;font-size:16px;">${formatAmount(f.amount)}</strong>（大写：${toChineseMoney(f.amount)}元整），含税。<br/>
2. 支付节点：<br/>
&nbsp;&nbsp;(1) 合同签订后5个工作日内，支付30%预付款；<br/>
&nbsp;&nbsp;(2) 项目设计评审通过后5个工作日内，支付30%进度款；<br/>
&nbsp;&nbsp;(3) 项目最终验收合格后10个工作日内，支付35%验收款；<br/>
&nbsp;&nbsp;(4) 质保期（验收后3个月）届满无重大质量问题，5个工作日内支付5%质保金。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第四条 知识产权</h3>
<p style="line-height:1.8;">
1. 乙方为履行本合同而新产生的全部成果（包括但不限于源代码、文档、设计稿等）的知识产权，自甲方支付完毕全部项目费用之日起归甲方所有；<br/>
2. 乙方预先存在的技术或通用组件的知识产权仍归乙方所有，但授予甲方永久、免费、非独占的使用许可；<br/>
3. 双方保证交付物不侵犯任何第三方的知识产权，否则由侵权方承担全部责任。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第五条 项目验收</h3>
<p style="line-height:1.8;">乙方完成全部开发工作后向甲方提交验收申请。甲方应于收到申请后10个工作日内按照需求说明书完成验收，逾期未提出书面异议视为验收通过。验收不合格的，乙方应在10个工作日内完成整改后再次提交。</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第六条 质保与维护</h3>
<p style="line-height:1.8;">乙方承诺自验收合格之日起提供3个月免费质保服务，质保期内非甲方原因产生的Bug或质量问题，乙方应免费修复。质保期满后，双方可另行签订维护服务合同。</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第七条 违约责任</h3>
<p style="line-height:1.8;">
1. 乙方逾期交付的，每逾期1日按合同总额的0.1%向甲方支付违约金，累计不超过合同总额的10%；逾期超过30日的，甲方有权解除合同；<br/>
2. 甲方逾期付款的，每逾期1日按应付未付款项的0.1%向乙方支付违约金。
</p>

<p style="margin-top:24px;line-height:1.8;">本合同一式四份，甲乙双方各执两份，自双方法定代表人或授权代表签字盖章之日起生效。</p>

<div style="display:flex;justify-content:space-between;margin-top:60px;gap:40px;">
  <div style="flex:1;">
    <p><strong>甲方（盖章）：${f.partyA}</strong></p>
    <p style="margin-top:12px;">授权代表签字：__________________</p>
    <p style="margin-top:12px;">签署日期：${formatDate(f.startDate)}</p>
  </div>
  <div style="flex:1;">
    <p><strong>乙方（签字/盖章）：${f.partyB}</strong></p>
    <p style="margin-top:12px;">授权代表签字：__________________</p>
    <p style="margin-top:12px;">签署日期：${formatDate(f.startDate)}</p>
  </div>
</div>
`,
  },
  {
    id: 'cooperation',
    name: '合作协议',
    description: '双方长期业务合作、框架合作类通用协议',
    icon: '🤝',
    render: (f: ContractFields) => `
<h1 style="text-align:center;font-size:22px;margin-bottom:24px;letter-spacing:4px;">合 作 协 议</h1>
<p style="text-align:right;color:#666;margin-bottom:32px;">协议编号：CO-${Date.now().toString().slice(-8)}</p>

<p>甲方：<strong>${f.partyA}</strong></p>
<p>乙方：<strong>${f.partyB}</strong></p>

<p style="margin-top:20px;line-height:1.8;">甲乙双方本着平等互利、优势互补、共同发展的原则，经充分协商，就 <strong>${f.projectContent}</strong> 事宜建立长期战略合作关系，达成如下协议，以资共同信守。</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第一条 合作内容</h3>
<p style="line-height:1.8;">
1. 合作领域：双方发挥各自资源优势，在${f.projectContent}等领域开展深度合作；<br/>
2. 合作模式：甲方负责提供业务渠道与客户资源，乙方负责提供专业服务能力与交付执行；<br/>
3. 合作方式：具体项目以双方另行签订的《项目确认单》为准，该确认单为本协议不可分割的组成部分。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第二条 合作期限</h3>
<p style="line-height:1.8;">本协议合作期限自 <strong>${formatDate(f.startDate)}</strong> 起至 <strong>${formatDate(f.endDate)}</strong> 止，共计 壹 年。期限届满前30日，如双方均无书面终止通知，则本协议自动续展壹年，续展次数不限。</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第三条 费用与结算</h3>
<p style="line-height:1.8;">
1. 预计年度合作总金额约为人民币 <strong style="color:#E74C3C;font-size:16px;">${formatAmount(f.amount)}</strong>（大写：${toChineseMoney(f.amount)}元整），具体以各《项目确认单》金额为准；<br/>
2. 结算方式：双方按月/按项目结算，乙方于每月5日前出具上月对账单，甲方收到对账单及等额合法发票后15个工作日内完成付款；<br/>
3. 税费承担：双方因履行本协议产生的税费，由各方依照国家法律法规规定各自承担。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第四条 双方权利义务</h3>
<p style="line-height:1.8;">
（一）甲方<br/>
&nbsp;&nbsp;1. 负责对接终端客户，提供真实、准确的业务需求信息；<br/>
&nbsp;&nbsp;2. 按本协议约定及时向乙方支付合作款项；<br/>
&nbsp;&nbsp;3. 维护乙方品牌与声誉，不得做出损害乙方利益的行为。<br/><br/>
（二）乙方<br/>
&nbsp;&nbsp;1. 按约定标准与期限交付合作成果，确保质量与专业性；<br/>
&nbsp;&nbsp;2. 保护甲方客户信息，未经同意不得直接联系甲方客户；<br/>
&nbsp;&nbsp;3. 配合甲方进行项目进度汇报与客户沟通。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第五条 排他与非竞争</h3>
<p style="line-height:1.8;">
在本协议有效期内，未经对方书面同意，任何一方不得与对方的直接竞争对手开展与本协议合作内容相同或类似的合作；任何一方不得在合作期间及合作终止后2年内，以任何方式招揽对方在职或离职不满6个月的员工。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第六条 保密条款</h3>
<p style="line-height:1.8;">双方对合作过程中知悉的对方商业秘密、客户信息、合作价格等保密信息承担保密义务，保密期限为本协议有效期及终止后5年。具体保密要求参照双方另行签订的《保密协议》执行。</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第七条 协议终止</h3>
<p style="line-height:1.8;">
任何一方严重违约且经对方书面通知后15日内未改正的，守约方有权单方终止本协议。协议终止后，双方应本着诚实信用原则完成未竟项目的结算与交接。
</p>

<p style="margin-top:24px;line-height:1.8;">本协议一式四份，甲乙双方各执两份，自双方签字盖章之日起生效，具有同等法律效力。</p>

<div style="display:flex;justify-content:space-between;margin-top:60px;gap:40px;">
  <div style="flex:1;">
    <p><strong>甲方（盖章）：${f.partyA}</strong></p>
    <p style="margin-top:12px;">授权代表签字：__________________</p>
    <p style="margin-top:12px;">签署日期：${formatDate(f.startDate)}</p>
  </div>
  <div style="flex:1;">
    <p><strong>乙方（盖章）：${f.partyB}</strong></p>
    <p style="margin-top:12px;">授权代表签字：__________________</p>
    <p style="margin-top:12px;">签署日期：${formatDate(f.startDate)}</p>
  </div>
</div>
`,
  },
  {
    id: 'labor_dispatch',
    name: '劳务派遣协议',
    description: '灵活用工、短期外派人员派遣类协议',
    icon: '👥',
    render: (f: ContractFields) => `
<h1 style="text-align:center;font-size:22px;margin-bottom:24px;letter-spacing:4px;">劳务派遣协议</h1>
<p style="text-align:right;color:#666;margin-bottom:32px;">协议编号：LD-${Date.now().toString().slice(-8)}</p>

<p>用工单位（甲方）：<strong>${f.partyA}</strong></p>
<p>派遣单位（乙方）：<strong>${f.partyB}</strong></p>

<p style="margin-top:20px;line-height:1.8;">根据《中华人民共和国劳动合同法》《劳务派遣暂行规定》等法律法规，甲乙双方经平等协商，就乙方为甲方派遣人员从事 <strong>${f.projectContent}</strong> 相关工作事宜，订立本协议。</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第一条 派遣人员与岗位</h3>
<p style="line-height:1.8;">
1. 派遣岗位：${f.projectContent}（临时性/辅助性/替代性岗位）；<br/>
2. 派遣人数：双方以《派遣人员确认单》为准；<br/>
3. 派遣地点：甲方指定工作场所；<br/>
4. 派遣期限：自 <strong>${formatDate(f.startDate)}</strong> 起至 <strong>${formatDate(f.endDate)}</strong> 止。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第二条 派遣费用标准</h3>
<p style="line-height:1.8;">
1. 本次劳务派遣预计总费用人民币 <strong style="color:#E74C3C;font-size:16px;">${formatAmount(f.amount)}</strong>（大写：${toChineseMoney(f.amount)}元整）；<br/>
2. 费用构成：<br/>
&nbsp;&nbsp;(1) 派遣人员工资：按实际出勤与岗位标准核算；<br/>
&nbsp;&nbsp;(2) 社会保险与住房公积金：按国家及当地规定基数缴纳；<br/>
&nbsp;&nbsp;(3) 乙方管理费：按人员工资总额的一定比例收取（10%-15%）；<br/>
&nbsp;&nbsp;(4) 其他法定福利、经济补偿金等法律法规规定的费用；<br/>
3. 甲方应于每月10日前将上月派遣费用支付至乙方指定账户。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第三条 甲方权利义务</h3>
<p style="line-height:1.8;">
1. 对派遣人员进行岗位技能培训、工作指导与日常管理；<br/>
2. 执行国家劳动标准，提供符合规定的劳动条件、劳动保护和职业危害防护；<br/>
3. 告知派遣人员工作要求、规章制度与劳动报酬；<br/>
4. 按约定按时足额支付派遣费用；<br/>
5. 不得将派遣人员再派遣至其他单位；<br/>
6. 连续用工的，应实行正常的工资调整机制。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第四条 乙方权利义务</h3>
<p style="line-height:1.8;">
1. 与派遣人员签订劳动合同（期限不少于2年），建立劳动关系，办理合法用工手续；<br/>
2. 按月支付派遣人员劳动报酬，缴纳社会保险与住房公积金；<br/>
3. 负责派遣人员的入职背景审查、岗前安全教育与离职手续办理；<br/>
4. 协助处理派遣人员工伤、医疗、劳动争议等相关事宜；<br/>
5. 不得克扣甲方按照本协议支付给派遣人员的劳动报酬。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第五条 工伤与争议处理</h3>
<p style="line-height:1.8;">
1. 派遣人员在工作期间发生工伤事故的，由乙方负责申请工伤认定，甲方予以协助；工伤保险基金支付以外的费用，按法律法规规定由双方合理承担；<br/>
2. 甲方与派遣人员发生用工争议的，乙方作为用人单位参与处理；甲乙双方就本协议产生争议的，应友好协商解决，协商不成提交甲方所在地人民法院。
</p>

<h3 style="margin-top:24px;margin-bottom:12px;color:#2C3E50;border-left:4px solid #3498DB;padding-left:10px;">第六条 退回与解除</h3>
<p style="line-height:1.8;">
派遣人员有《劳动合同法》第39条、第40条第1、2项规定情形的，甲方可将其退回乙方，乙方可依法解除劳动合同。协议到期不续签的，甲方应按规定支付经济补偿金或由乙方另行安排派遣。
</p>

<p style="margin-top:24px;line-height:1.8;">本协议一式三份，甲乙双方各执一份，劳务派遣行政主管部门备案一份，自双方签字盖章之日起生效。</p>

<div style="display:flex;justify-content:space-between;margin-top:60px;gap:40px;">
  <div style="flex:1;">
    <p><strong>甲方（盖章）：${f.partyA}</strong></p>
    <p style="margin-top:12px;">授权代表签字：__________________</p>
    <p style="margin-top:12px;">签署日期：${formatDate(f.startDate)}</p>
  </div>
  <div style="flex:1;">
    <p><strong>乙方（盖章）：${f.partyB}</strong></p>
    <p style="margin-top:12px;">授权代表签字：__________________</p>
    <p style="margin-top:12px;">签署日期：${formatDate(f.startDate)}</p>
  </div>
</div>
`,
  },
];

function toChineseMoney(num: number): string {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟', '万', '拾', '佰', '仟', '亿'];
  if (num === 0) return '零';
  const integer = Math.floor(num);
  let result = '';
  const str = integer.toString();
  for (let i = 0; i < str.length; i++) {
    const d = parseInt(str[i]);
    const u = units[str.length - 1 - i];
    if (d !== 0) {
      result += digits[d] + u;
    } else if (result && !result.endsWith('零')) {
      result += '零';
    }
  }
  return result.replace(/零+$/, '');
}

export const getTemplateById = (id: string): TemplateDefinition | undefined =>
  templates.find((t) => t.id === id);
