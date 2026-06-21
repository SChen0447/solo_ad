const conflictRules = [
  { id: 1, keywordsA: ['增加成本', '提高成本', '成本上升'], keywordsB: ['降低成本', '减少成本', '成本下降', '节省成本'] },
  { id: 2, keywordsA: ['加班', '延长工作时间', '996'], keywordsB: ['准时下班', '按时下班', '不加班', 'work life balance', '工作生活平衡'] },
  { id: 3, keywordsA: ['扩张', '扩张规模', '扩大团队', '扩招'], keywordsB: ['收缩', '缩减规模', '裁员', '精简团队'] },
  { id: 4, keywordsA: ['提高质量', '提升品质', '高质量'], keywordsB: ['降低质量', '牺牲质量', '简化质量'] },
  { id: 5, keywordsA: ['增加功能', '扩展功能', '更多功能'], keywordsB: ['精简功能', '减少功能', '功能瘦身'] },
  { id: 6, keywordsA: ['快速上线', '赶进度', '加速', '尽快发布'], keywordsB: ['慢工出细活', '仔细打磨', '充分测试', '确保质量'] },
  { id: 7, keywordsA: ['集中决策', '集权', '自上而下'], keywordsB: ['分散决策', '分权', '自下而上', '民主决策'] },
  { id: 8, keywordsA: ['高风险', '冒险', '激进'], keywordsB: ['低风险', '保守', '稳健', '稳妥'] },
  { id: 9, keywordsA: ['自主研发', '自研', '自建'], keywordsB: ['外包', '采购', '第三方', '使用现成方案'] },
  { id: 10, keywordsA: ['开源', '免费', 'freemium'], keywordsB: ['收费', '商业化', '付费模式', '闭源'] },
  { id: 11, keywordsA: ['问题', '困难', '挑战', '障碍'], keywordsB: ['方案', '解决', '对策', '方法'] },
  { id: 12, keywordsA: ['风险', '隐患', '危机'], keywordsB: ['机会', '机遇', '优势'] },
];

function detectConflicts(nodes, links) {
  const conflicts = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  for (const link of links) {
    const sourceNode = nodeMap.get(link.source);
    const targetNode = nodeMap.get(link.target);

    if (!sourceNode || !targetNode) continue;

    const sourceText = `${sourceNode.title} ${sourceNode.description} ${sourceNode.tags ? sourceNode.tags.join(' ') : ''}`;
    const targetText = `${targetNode.title} ${targetNode.description} ${targetNode.tags ? targetNode.tags.join(' ') : ''}`;

    for (const rule of conflictRules) {
      const sourceHasA = rule.keywordsA.some(kw => sourceText.includes(kw));
      const targetHasB = rule.keywordsB.some(kw => targetText.includes(kw));
      const sourceHasB = rule.keywordsB.some(kw => sourceText.includes(kw));
      const targetHasA = rule.keywordsA.some(kw => targetText.includes(kw));

      if ((sourceHasA && targetHasB) || (sourceHasB && targetHasA)) {
        conflicts.push({
          id: `conflict_${link.id}_${rule.id}`,
          linkId: link.id,
          sourceId: link.source,
          targetId: link.target,
          ruleId: rule.id,
          description: `冲突规则 #${rule.id}: ${rule.keywordsA[0]} ↔ ${rule.keywordsB[0]}`,
        });
        break;
      }
    }
  }

  return conflicts;
}

module.exports = {
  conflictRules,
  detectConflicts,
};
