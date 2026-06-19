import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const validateAnnotation = (ann) => {
  if (!ann || typeof ann !== 'object') return false;
  if (typeof ann.id !== 'string' || !ann.id.startsWith('comp-')) return false;
  if (typeof ann.x !== 'number' || ann.x < 0) return false;
  if (typeof ann.y !== 'number' || ann.y < 0) return false;
  if (typeof ann.width !== 'number' || ann.width <= 0) return false;
  if (typeof ann.height !== 'number' || ann.height <= 0) return false;
  if (typeof ann.componentName !== 'string') return false;
  if (typeof ann.parentName !== 'string') return false;
  const validTags = ['div', 'button', 'img', 'nav', 'header', 'section', 'footer', 'article', 'aside'];
  if (ann.tagType && !validTags.includes(ann.tagType)) return false;
  return true;
};

router.post('/', (req, res) => {
  try {
    const { annotations, imageUrl, imageName } = req.body;

    if (!Array.isArray(annotations)) {
      return res.status(400).json({
        success: false,
        error: 'annotations 必须是数组格式'
      });
    }

    const invalidAnnotations = annotations.filter((a, idx) => !validateAnnotation(a));
    if (invalidAnnotations.length > 0) {
      return res.status(400).json({
        success: false,
        error: `存在格式错误的标注项: 第 ${invalidAnnotations.map((_, i) => i + 1).join(', ')} 条`,
        invalidCount: invalidAnnotations.length
      });
    }

    const timestamp = Date.now();
    const exportId = uuidv4().slice(0, 12);
    const filename = `annotations_${timestamp}.json`;

    const payload = {
      exportId,
      timestamp,
      exportedAt: new Date(timestamp).toISOString(),
      image: {
        url: imageUrl || null,
        name: imageName || null
      },
      statistics: {
        totalAnnotations: annotations.length,
        uniqueComponents: new Set(annotations.map(a => a.componentName).filter(Boolean)).size,
        uniqueParents: new Set(annotations.map(a => a.parentName).filter(Boolean)).size
      },
      annotations: annotations.map(a => ({
        id: a.id,
        position: { x: a.x, y: a.y, width: a.width, height: a.y + a.height },
        size: { width: a.width, height: a.height },
        componentName: a.componentName,
        parentName: a.parentName,
        tagType: a.tagType || 'div',
        createdAt: a.createdAt || timestamp
      }))
    };

    res.json({
      success: true,
      filename,
      downloadUrl: `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`,
      data: payload
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '服务器处理导出请求时出错: ' + error.message
    });
  }
});

export default router;
