from flask import Blueprint, request, jsonify
import re
from collections import Counter

classifier_bp = Blueprint('classifier', __name__)

URGENT_KEYWORDS = [
    '紧急', '立即', '马上', '崩溃', '无法使用', '宕机', '严重', '故障',
    '无法登录', '不能访问', '数据丢失', '安全漏洞', '投诉', '维权',
    '起诉', '报警', '媒体', '曝光', '315', '消协'
]

HIGH_PRIORITY_KEYWORDS = [
    '重要', '尽快', '着急', '影响使用', '很多用户', '大量',
    '频繁', '经常', '重复', '卡顿', '很慢', '太慢',
    '客服', '态度', '响应慢', '没人管', '推诿'
]

CATEGORY_KEYWORDS = {
    '功能建议': [
        '建议', '希望', '需求', '增加', '添加', '新功能', '改进',
        '优化', '提升', '体验', '方便', '效率', '导出', '导入',
        '批量', '自动化', '提醒', '通知', '统计', '报表',
        '深色模式', '主题', '皮肤', '个性化', '自定义'
    ],
    '缺陷报告': [
        'bug', '错误', '异常', '问题', '崩溃', '闪退', '白屏',
        '黑屏', '乱码', '显示', '不显示', '无法', '不能', '失效',
        '失败', '超时', '连接', '网络', '加载', '卡顿', '慢',
        '兼容性', '浏览器', 'safari', 'chrome', 'firefox', 'ie',
        '移动端', '手机', 'app', '小程序', '数据', '丢失', '错误'
    ],
    '服务投诉': [
        '投诉', '不满', '失望', '太差', '垃圾', '客服', '态度',
        '响应', '慢', '没人', '推诿', '扯皮', '不解决', '敷衍',
        '欺骗', '虚假', '承诺', '违约', '赔偿', '退款', '道歉'
    ]
}

DOMAIN_KEYWORDS = [
    '登录', '注册', '密码', '账号', '账户', '用户',
    '支付', '付款', '订单', '购买', '退款', '结算',
    '导出', '导入', '下载', '上传', '文件', '附件',
    '搜索', '筛选', '过滤', '排序', '分页',
    '图表', '报表', '统计', '分析', '数据',
    '通知', '消息', '提醒', '邮件', '短信',
    '权限', '角色', '管理', '设置', '配置',
    '界面', '显示', '样式', '布局', 'ui', 'ux',
    '性能', '速度', '卡顿', '延迟', '加载',
    '安全', '加密', '隐私', '漏洞', '攻击'
]

def extract_keywords(text, max_keywords=3):
    text_lower = text.lower()
    found_keywords = []
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in text_lower:
                found_keywords.append(kw)
    
    for kw in DOMAIN_KEYWORDS:
        if kw.lower() in text_lower and kw not in found_keywords:
            found_keywords.append(kw)
    
    words = re.findall(r'[\u4e00-\u9fa5]{2,}|[a-zA-Z]+', text_lower)
    word_counts = Counter(words)
    common_words = [w for w, _ in word_counts.most_common(10) if len(w) >= 2]
    
    for w in common_words:
        if len(found_keywords) >= max_keywords:
            break
        if w not in found_keywords:
            found_keywords.append(w)
    
    return found_keywords[:max_keywords]

def determine_priority(text, category):
    text_lower = text.lower()
    
    for kw in URGENT_KEYWORDS:
        if kw.lower() in text_lower:
            return '紧急'
    
    if category == '服务投诉':
        return '高'
    
    for kw in HIGH_PRIORITY_KEYWORDS:
        if kw.lower() in text_lower:
            return '高'
    
    if category == '缺陷报告':
        return '中'
    
    if category == '功能建议':
        return '中'
    
    return '低'

def classify_content(content, category):
    priority = determine_priority(content, category)
    keywords = extract_keywords(content)
    
    if len(keywords) < 2:
        default_keywords = {
            '功能建议': ['功能优化', '用户体验'],
            '缺陷报告': ['问题修复', '稳定性'],
            '服务投诉': ['服务质量', '客户满意'],
            '其他': ['反馈', '建议']
        }
        default_kw = default_keywords.get(category, ['反馈'])
        for kw in default_kw:
            if kw not in keywords:
                keywords.append(kw)
    
    return {
        'priority': priority,
        'keywords': keywords[:3]
    }

@classifier_bp.route('/api/classify', methods=['POST'])
def classify_ticket():
    data = request.get_json()
    
    if not data or 'content' not in data:
        return jsonify({'error': '缺少内容字段'}), 400
    
    content = data['content']
    category = data.get('category', '其他')
    
    result = classify_content(content, category)
    
    return jsonify(result), 200
