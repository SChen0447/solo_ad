"""
情感分析模型模块
优先使用transformers预训练模型，失败则降级到关键词规则匹配
支持5种情感分类：高兴(happy)、悲伤(sad)、愤怒(angry)、平静(calm)、惊喜(surprised)
"""

import re
import os
from typing import Tuple, Dict

EMOTION_TYPES = ['happy', 'sad', 'angry', 'calm', 'surprised']

EMOTION_EMOJI = {
    'happy': '😊',
    'sad': '😢',
    'angry': '😠',
    'calm': '😐',
    'surprised': '😮'
}

EMOTION_LABELS = {
    'happy': '高兴',
    'sad': '悲伤',
    'angry': '愤怒',
    'calm': '平静',
    'surprised': '惊喜'
}


class EmotionAnalyzer:
    """情感分析器，支持多级降级策略"""

    def __init__(self):
        self.model_available = False
        self.classifier = None
        self._init_model()

    def _init_model(self):
        """
        初始化预训练模型
        优先使用transformers加载中文情感分类模型
        """
        try:
            from transformers import pipeline
            import torch

            model_name = os.environ.get('EMOTION_MODEL', 'uer/roberta-base-finetuned-dianping-chinese')

            device = 0 if torch.cuda.is_available() else -1

            self.classifier = pipeline(
                'sentiment-analysis',
                model=model_name,
                device=device
            )
            self.model_available = True
            print(f"[EmotionModel] 成功加载预训练模型: {model_name}")
        except Exception as e:
            print(f"[EmotionModel] 加载transformers模型失败，将使用关键词规则匹配: {e}")
            self.model_available = False

        self._init_keyword_rules()

    def _init_keyword_rules(self):
        """初始化关键词规则库（降级方案）"""
        self.emotion_keywords = {
            'happy': [
                '开心', '高兴', '快乐', '愉快', '喜悦', '兴奋', '幸福', '满足',
                '棒', '好', '喜欢', '爱', '赞', '哈哈', '笑', '阳光', '美好',
                '享受', '开心的', '太棒了', '真高兴', '好开心', '好开心',
                '😊', '😄', '🥰', '😍', '😁', '😆', '😋', '🤗', '👍',
                '❤️', '🌟', '✨', '🎉', '💪', '☀️', '🌈'
            ],
            'sad': [
                '难过', '伤心', '悲伤', '不开心', '失落', '沮丧', '哭',
                '眼泪', '遗憾', '失望', '痛苦', '孤独', '寂寞', '糟糕',
                '不顺', '郁闷', '心碎', '难受', '想哭', '忧伤', '哀伤',
                '😢', '😭', '😔', '😞', '😣', '💔', '😓', '☹️', '🙁'
            ],
            'angry': [
                '生气', '愤怒', '烦', '讨厌', '恨', '气', '怒', '恼火',
                '烦躁', '不满', '可恶', '混蛋', '烦死', '气死', '滚',
                '讨厌死了', '可恶', '他妈的', '尼玛', '卧槽', '我去',
                '😠', '😡', '🤬', '💢', '😤'
            ],
            'surprised': [
                '惊讶', '惊喜', '意外', '没想到', '震惊', '哇', '天呐',
                '厉害', '棒极了', '突然', '奇妙', '居然', '竟然', '难以置信',
                '真的吗', '不会吧', '怎么可能', '我的天', '我去',
                '😮', '😲', '🤯', '😱', '🙀', '⚡', '💫', '🎊'
            ],
            'calm': [
                '平静', '安静', '宁静', '放松', '休息', '舒服', '惬意',
                '悠闲', '自在', '和平', '温和', '淡定', '从容', '平常心',
                '安稳', '舒心', '安宁', '沉静', '平稳', '淡然',
                '😐', '😌', '☕', '📖', '🌸', '🌿', '🍃', '🧘'
            ]
        }

        self.emoji_emotion_map = {}
        for emotion, keywords in self.emotion_keywords.items():
            for kw in keywords:
                if len(kw) <= 4 and not re.match(r'[\u4e00-\u9fff]', kw):
                    self.emoji_emotion_map[kw] = emotion

    def analyze(self, text: str) -> Tuple[str, float]:
        """
        分析文本情感

        Args:
            text: 输入文本

        Returns:
            (情感类型, 置信度)
        """
        if not text or not text.strip():
            return 'calm', 0.5

        text = text.strip()

        if self.model_available and self.classifier:
            try:
                emotion, confidence = self._analyze_with_transformer(text)
                if emotion in EMOTION_TYPES:
                    return emotion, confidence
            except Exception as e:
                print(f"[EmotionModel] 模型推理失败，降级到关键词匹配: {e}")

        return self._analyze_with_keywords(text)

    def _analyze_with_transformer(self, text: str) -> Tuple[str, float]:
        """
        使用transformers预训练模型进行情感分析
        将二分类/星级评分结果映射到5种情感
        """
        result = self.classifier(text[:512])[0]
        label = result.get('label', '').lower()
        score = float(result.get('score', 0.5))

        positive_labels = ['positive', 'pos', '正面', '积极', '好评', '1', '2', '3', '4', '5']
        negative_labels = ['negative', 'neg', '负面', '消极', '差评', '0']

        is_positive = False
        base_confidence = score

        if label in positive_labels or any(l in label for l in ['正面', '积极', '好评', 'positive', 'pos']):
            is_positive = True
        elif label.isdigit():
            star = int(label)
            is_positive = star >= 3
            if star == 5:
                base_confidence = max(base_confidence, 0.85)
            elif star == 1:
                base_confidence = max(base_confidence, 0.85)

        keyword_scores = self._calculate_keyword_scores(text)
        max_keyword_emotion = max(keyword_scores, key=keyword_scores.get)
        max_keyword_score = keyword_scores[max_keyword_emotion]

        if is_positive:
            if keyword_scores['happy'] > 0.3 or keyword_scores['surprised'] > 0.3:
                if keyword_scores['surprised'] > keyword_scores['happy'] * 0.8:
                    final_emotion = 'surprised'
                else:
                    final_emotion = 'happy'
            else:
                final_emotion = 'happy'
            final_confidence = max(base_confidence * 0.7, max_keyword_score * 0.3 + base_confidence * 0.4)
        else:
            if keyword_scores['angry'] > 0.3 or keyword_scores['sad'] > 0.3:
                if keyword_scores['angry'] > keyword_scores['sad']:
                    final_emotion = 'angry'
                else:
                    final_emotion = 'sad'
            else:
                final_emotion = 'sad'
            final_confidence = max(base_confidence * 0.7, max_keyword_score * 0.3 + base_confidence * 0.4)

        if max_keyword_score > 0.6 and keyword_scores['calm'] == max_keyword_score and max_keyword_score > base_confidence:
            final_emotion = 'calm'
            final_confidence = max_keyword_score

        if max_keyword_score < 0.2 and base_confidence < 0.6:
            final_emotion = 'calm'
            final_confidence = 0.55

        final_confidence = min(max(final_confidence, 0.3), 0.98)

        return final_emotion, round(final_confidence, 3)

    def _calculate_keyword_scores(self, text: str) -> Dict[str, float]:
        """计算各情感的关键词得分"""
        scores = {emotion: 0.0 for emotion in EMOTION_TYPES}
        text_lower = text.lower()

        for emotion, keywords in self.emotion_keywords.items():
            for keyword in keywords:
                count = text_lower.count(keyword.lower())
                if count > 0:
                    weight = 2.0 if len(keyword) <= 2 else 1.5 if len(keyword) <= 4 else 1.0
                    if not re.match(r'[\u4e00-\u9fff]', keyword):
                        weight = 3.0
                    scores[emotion] += count * weight

        if re.search(r'!{2,}|！{2,}', text):
            scores['surprised'] += 1.5
            scores['happy'] += 0.5
        if re.search(r'[!！]', text):
            scores['happy'] += 0.3
        if re.search(r'[~～]', text):
            scores['happy'] += 0.5
        if re.search(r'[.。]{3,}', text):
            scores['sad'] += 0.5
        if re.search(r'[?？]{2,}', text):
            scores['surprised'] += 0.8

        exclamation_count = text.count('!') + text.count('！')
        if exclamation_count >= 3:
            scores['surprised'] += 1.0
            scores['angry'] += 0.5

        max_score = max(scores.values()) if max(scores.values()) > 0 else 1
        normalized_scores = {e: min(s / max_score, 1.0) for e, s in scores.items()}

        return normalized_scores

    def _analyze_with_keywords(self, text: str) -> Tuple[str, float]:
        """使用关键词规则进行情感分析（降级方案）"""
        scores = self._calculate_keyword_scores(text)

        total_score = sum(scores.values())
        if total_score == 0:
            return 'calm', 0.4

        max_emotion = max(scores, key=scores.get)
        max_score = scores[max_emotion]

        if max_score < 0.2:
            return 'calm', 0.5

        confidence = 0.4 + max_score * 0.5

        second_max = sorted(scores.values(), reverse=True)[1]
        if second_max > 0 and max_score / second_max < 1.3:
            confidence = 0.45 + max_score * 0.35

        confidence = min(confidence, 0.9)

        return max_emotion, round(confidence, 3)


_emotion_analyzer = None


def get_emotion_analyzer() -> EmotionAnalyzer:
    """获取单例情感分析器"""
    global _emotion_analyzer
    if _emotion_analyzer is None:
        _emotion_analyzer = EmotionAnalyzer()
    return _emotion_analyzer


def analyze_emotion(text: str) -> dict:
    """
    便捷函数：分析文本情感

    Args:
        text: 输入文本

    Returns:
        包含emotion和confidence的字典
    """
    analyzer = get_emotion_analyzer()
    emotion, confidence = analyzer.analyze(text)
    return {
        'emotion': emotion,
        'confidence': confidence,
        'emoji': EMOTION_EMOJI[emotion],
        'label': EMOTION_LABELS[emotion]
    }


if __name__ == '__main__':
    test_texts = [
        '今天阳光真好，心情特别愉快！',
        '工作上遇到了一些挫折，有点不开心。',
        '会议效率太低了，浪费了很多时间，有点烦躁！',
        '下午的咖啡时光，静静地看会儿书，享受这份宁静。',
        '哇！突然想到一个很棒的点子，太惊喜了！',
        '今天天气一般。',
        '😊 好开心呀！',
        '气死我了，怎么能这样！！！'
    ]

    for text in test_texts:
        result = analyze_emotion(text)
        print(f"文本: {text}")
        print(f"情感: {result['label']} {result['emoji']} (置信度: {result['confidence']:.2%})")
        print()
