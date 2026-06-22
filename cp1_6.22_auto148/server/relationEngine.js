function extractKeywords(text) {
  if (!text) return [];
  const words = text.toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
  return [...new Set(words)];
}

function jaccardSimilarity(setA, setB) {
  const a = new Set(setA);
  const b = new Set(setB);
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export function computeRelations(notes) {
  const nodes = notes.map(note => ({
    id: note.id,
    title: note.title,
    content: note.content,
    tags: note.tags || [],
    wordCount: (note.content || '').length + (note.title || '').length,
    imageUrl: note.imageUrl || null,
    createdAt: note.createdAt
  }));

  const links = [];

  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const noteA = notes[i];
      const noteB = notes[j];

      const tagsA = (noteA.tags || []).map(t => t.toLowerCase());
      const tagsB = (noteB.tags || []).map(t => t.toLowerCase());
      const tagSimilarity = jaccardSimilarity(tagsA, tagsB);

      const keywordsA = [
        ...extractKeywords(noteA.title || ''),
        ...extractKeywords(noteA.content || '')
      ];
      const keywordsB = [
        ...extractKeywords(noteB.title || ''),
        ...extractKeywords(noteB.content || '')
      ];
      const keywordSimilarity = jaccardSimilarity(keywordsA, keywordsB);

      const finalSimilarity = tagSimilarity * 0.6 + keywordSimilarity * 0.4;

      if (finalSimilarity > 0.3) {
        links.push({
          source: noteA.id,
          target: noteB.id,
          similarity: parseFloat(finalSimilarity.toFixed(3)),
          tagSimilarity: parseFloat(tagSimilarity.toFixed(3)),
          keywordSimilarity: parseFloat(keywordSimilarity.toFixed(3))
        });
      }
    }
  }

  const tagClusters = {};
  let clusterId = 0;
  const tagColors = [
    '#6366f1', '#38bdf8', '#a855f7', '#ec4899', '#f97316',
    '#22c55e', '#eab308', '#ef4444', '#14b8a6', '#f43f5e',
    '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#84cc16'
  ];

  nodes.forEach(node => {
    const tags = node.tags;
    if (tags.length > 0) {
      const primaryTag = tags[0];
      if (tagClusters[primaryTag] === undefined) {
        tagClusters[primaryTag] = clusterId % tagColors.length;
        clusterId++;
      }
      node.cluster = tagClusters[primaryTag];
      node.color = tagColors[tagClusters[primaryTag]];
    } else {
      node.cluster = -1;
      node.color = '#64748b';
    }
  });

  return { nodes, links, tagClusters: Object.keys(tagClusters) };
}

export default { computeRelations };
