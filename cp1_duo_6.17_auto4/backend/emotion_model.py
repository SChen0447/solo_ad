"""
情感分析模型模块
使用 distilbert-base-uncased-finetuned-sst-2-english 轻量级预训练模型
支持5种情感分类：高兴(happy)、悲伤(sad)、愤怒(angry)、平静(calm)、惊喜(surprised)
具有完整的错误处理和优雅降级机制
"""

import re
import os
import sys
import traceback
from typing import Tuple, Dict, Optional
from datetime import datetime

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

    def __init__(self, model_name: Optional[str] = None):
        self.model_available = False
        self.classifier = None
        self.model_name = model_name or os.environ.get(
            'EMOTION_MODEL',
            'distilbert-base-uncased-finetuned-sst-2-english'
        )
        self.model_load_error = None
        self._init_model()
        self._init_keyword_rules()

    def _init_model(self):
        """
        初始化预训练情感分类模型
        使用 distilbert-base-uncased-finetuned-sst-2-english 轻量级模型
        包含完整的错误处理：ImportError / OOM / 网络超时 / 其他异常
        """
        try:
            try:
                from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
                import torch
            except ImportError as import_err:
                raise RuntimeError(
                    f"transformers库未安装: {import_err}\n"
                    f"请运行: pip install transformers torch"
                ) from import_err

            print(f"[EmotionModel] 正在加载情感分析模型: {self.model_name}")
            load_start = datetime.now()

            try:
                tokenizer = AutoTokenizer.from_pretrained(
                    self.model_name,
                    local_files_only=False,
                    use_fast=True,
                    model_max_length=512
                )
                model = AutoModelForSequenceClassification.from_pretrained(
                    self.model_name,
                    local_files_only=False,
                    torch_dtype=torch.float32
                )
            except Exception as model_err:
                error_msg = str(model_err).lower()

                if any(k in error_msg for k in ['out of memory', 'oom', 'cuda out of memory']):
                    print(f"[EmotionModel] GPU内存不足，尝试使用CPU加载...")
                    try:
                        tokenizer = AutoTokenizer.from_pretrained(
                            self.model_name,
                            local_files_only=False,
                            use_fast=True,
                            model_max_length=512
                        )
                        model = AutoModelForSequenceClassification.from_pretrained(
                            self.model_name,
                            local_files_only=False,
                            torch_dtype=torch.float32
                        )
                    except Exception as cpu_err:
                        raise RuntimeError(
                            f"OOM后CPU加载也失败: {cpu_err}"
                        ) from cpu_err

                elif any(k in error_msg for k in ['connection', 'timeout', 'network', 'huggingface', 'proxy']):
                    print(f"[EmotionModel] 网络连接超时或HuggingFace访问失败: {model_err}")
                    raise RuntimeError(
                        f"模型下载失败(网络问题): {model_err}\n"
                        f"请检查网络连接或设置代理: export HF_ENDPOINT=https://hf-mirror.com"
                    ) from model_err

                elif any(k in error_msg for k in ['404', 'not found', 'repository']):
                    raise RuntimeError(
                        f"模型仓库不存在: {self.model_name}. 错误: {model_err}"
                    ) from model_err

                else:
                    raise RuntimeError(
                        f"模型加载失败: {model_err}"
                    ) from model_err

            device = -1
            if torch.cuda.is_available():
                try:
                    free_mem = torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)
                    if free_mem > 2 * 1024 * 1024 * 1024:
                        device = 0
                        print(f"[EmotionModel] 使用GPU加速 (显存可用: {free_mem/1024/1024:.0f}MB)")
                    else:
                        print("[EmotionModel] GPU显存不足(<2GB)，使用CPU推理")
                except Exception:
                    print("[EmotionModel] GPU检测失败，使用CPU推理")

            self.classifier = pipeline(
                'sentiment-analysis',
                model=model,
                tokenizer=tokenizer,
                device=device,
                truncation=True,
                padding=True,
                max_length=512,
                top_k=None
            )

            load_elapsed = (datetime.now() - load_start).total_seconds()
            self.model_available = True
            self.model_load_error = None
            print(f"[EmotionModel] 模型加载成功! 耗时: {load_elapsed:.2f}s, 设备: {'GPU' if device >= 0 else 'CPU'}")

            if hasattr(self.classifier, 'model') and hasattr(self.classifier.model, 'config'):
                cfg = self.classifier.model.config
                params = sum(p.numel() for p in self.classifier.model.parameters() if p.requires_grad)
                print(f"[EmotionModel] 参数量: {params/1e6:.1f}M, 标签: {cfg.id2label if hasattr(cfg, 'id2label') else 'N/A'}")

        except torch.cuda.OutOfMemoryError as oom_err:
            self.model_available = False
            self.model_load_error = f"CUDA OOM: {oom_err}"
            print(f"[EmotionModel] CUDA显存溢出: {oom_err}")
            print("[EmotionModel] 将使用关键词规则匹配作为降级方案")

        except RuntimeError as runtime_err:
            self.model_available = False
            self.model_load_error = str(runtime_err)
            print(f"[EmotionModel] 运行时错误: {runtime_err}")
            print("[EmotionModel] 将使用关键词规则匹配作为降级方案")

        except Exception as general_err:
            self.model_available = False
            self.model_load_error = f"{type(general_err).__name__}: {general_err}"
            print(f"[EmotionModel] 未知错误: {type(general_err).__name__}: {general_err}")
            traceback.print_exc()
            print("[EmotionModel] 将使用关键词规则匹配作为降级方案")

    def _init_keyword_rules(self):
        """初始化关键词规则库（降级方案）"""
        self.emotion_keywords = {
            'happy': [
                '开心', '高兴', '快乐', '愉快', '喜悦', '兴奋', '幸福', '满足',
                '棒', '好', '喜欢', '爱', '赞', '哈哈', '笑', '阳光', '美好',
                '享受', '太棒了', '真高兴', '好开心', '好开心', '开开心心',
                'happy', 'glad', 'joy', 'great', 'nice', 'love', 'excellent',
                '😊', '😄', '🥰', '😍', '😁', '😆', '😋', '🤗', '👍',
                '❤️', '🌟', '✨', '🎉', '💪', '☀️', '🌈', '🎊', '💖'
            ],
            'sad': [
                '难过', '伤心', '悲伤', '不开心', '失落', '沮丧', '哭',
                '眼泪', '遗憾', '失望', '痛苦', '孤独', '寂寞', '糟糕',
                '不顺', '郁闷', '心碎', '难受', '想哭', '忧伤', '哀伤',
                'sad', 'unhappy', 'sorrow', 'cry', 'depressed', 'down',
                '😢', '😭', '😔', '😞', '😣', '💔', '😓', '☹️', '🙁'
            ],
            'angry': [
                '生气', '愤怒', '烦', '讨厌', '恨', '气', '怒', '恼火',
                '烦躁', '不满', '可恶', '混蛋', '烦死', '气死', '滚',
                '讨厌死了', '可恶', '他妈的', '尼玛', '卧槽', '我去',
                'angry', 'mad', 'hate', 'annoying', 'furious', 'rage',
                '😠', '😡', '🤬', '💢', '😤', '👿'
            ],
            'surprised': [
                '惊讶', '惊喜', '意外', '没想到', '震惊', '哇', '天呐',
                '厉害', '棒极了', '突然', '奇妙', '居然', '竟然', '难以置信',
                '真的吗', '不会吧', '怎么可能', '我的天', '我去',
                'surprise', 'wow', 'amazing', 'incredible', 'unexpected',
                '😮', '😲', '🤯', '😱', '🙀', '⚡', '💫', '🎊', '❓', '❗'
            ],
            'calm': [
                '平静', '安静', '宁静', '放松', '休息', '舒服', '惬意',
                '悠闲', '自在', '和平', '温和', '淡定', '从容', '平常心',
                '安稳', '舒心', '安宁', '沉静', '平稳', '淡然',
                'calm', 'relax', 'peaceful', 'quiet', 'cozy', 'comfortable',
                '😐', '😌', '☕', '📖', '🌸', '🌿', '🍃', '🧘', '🌙', '🛋️'
            ]
        }

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
                if emotion in EMOTION_TYPES and confidence >= 0.3:
                    return emotion, round(confidence, 3)
            except torch.cuda.OutOfMemoryError as oom_err:
                print(f"[EmotionModel] 推理时OOM，降级到关键词匹配: {oom_err}")
            except RuntimeError as runtime_err:
                if 'out of memory' in str(runtime_err).lower():
                    print(f"[EmotionModel] 推理时内存不足，降级到关键词匹配")
                else:
                    print(f"[EmotionModel] 推理错误: {runtime_err}，降级到关键词匹配")
            except Exception as infer_err:
                print(f"[EmotionModel] 推理异常: {infer_err}，降级到关键词匹配")

        return self._analyze_with_keywords(text)

    def _analyze_with_transformer(self, text: str) -> Tuple[str, float]:
        """
        使用 distilbert 预训练模型进行情感分析
        将二分类(NEGATIVE/POSITIVE)结果映射到5种情感
        """
        import torch

        max_length = 512
        truncated_text = text[:max_length * 4]

        try:
            with torch.no_grad():
                result = self.classifier(truncated_text)
        except Exception as infer_e:
            if 'out of memory' in str(infer_e).lower():
                with torch.no_grad():
                    if hasattr(self.classifier, 'device') and self.classifier.device.type == 'cuda':
                        torch.cuda.empty_cache()
                    truncated_text = text[:max_length * 2]
                    result = self.classifier(truncated_text)
            else:
                raise

        if isinstance(result, list) and len(result) > 0:
            if isinstance(result[0], list):
                scores_dict = {}
                for item in result[0]:
                    label = item.get('label', '').upper()
                    score = float(item.get('score', 0))
                    scores_dict[label] = score
            else:
                scores_dict = {}
                for item in result:
                    label = item.get('label', '').upper()
                    score = float(item.get('score', 0))
                    scores_dict[label] = score
        else:
            label = result.get('label', '').upper()
            score = float(result.get('score', 0.5))
            opposite_label = 'NEGATIVE' if label == 'POSITIVE' else 'POSITIVE'
            scores_dict = {label: score, opposite_label: max(1 - score, 0.01)}

        positive_score = max(
            scores_dict.get('POSITIVE', 0),
            scores_dict.get('POS', 0),
            scores_dict.get('正面', 0),
            scores_dict.get('好评', 0),
            scores_dict.get('LABEL_1', 0)
        )
        negative_score = max(
            scores_dict.get('NEGATIVE', 0),
            scores_dict.get('NEG', 0),
            scores_dict.get('负面', 0),
            scores_dict.get('差评', 0),
            scores_dict.get('LABEL_0', 0)
        )

        total = positive_score + negative_score
        if total > 0:
            positive_score /= total
            negative_score /= total

        base_confidence = max(positive_score, negative_score)
        is_positive = positive_score >= negative_score

        keyword_scores = self._calculate_keyword_scores(text)
        max_keyword_emotion = max(keyword_scores, key=keyword_scores.get)
        max_keyword_score = keyword_scores[max_keyword_emotion]

        if is_positive:
            if keyword_scores['surprised'] > 0.25 and keyword_scores['surprised'] >= keyword_scores['happy'] * 0.6:
                final_emotion = 'surprised'
            elif keyword_scores['happy'] > 0.2 or max_keyword_score < 0.15:
                final_emotion = 'happy'
            else:
                final_emotion = 'happy'
            final_confidence = max(
                base_confidence * 0.6 + keyword_scores['happy'] * 0.25 + keyword_scores['surprised'] * 0.15,
                max_keyword_score if max_keyword_score > 0.5 else base_confidence
            )
        else:
            if keyword_scores['angry'] > 0.25 and keyword_scores['angry'] >= keyword_scores['sad'] * 0.8:
                final_emotion = 'angry'
            elif keyword_scores['sad'] > 0.2 or max_keyword_score < 0.15:
                final_emotion = 'sad'
            else:
                final_emotion = 'sad'
            final_confidence = max(
                base_confidence * 0.6 + keyword_scores['sad'] * 0.25 + keyword_scores['angry'] * 0.15,
                max_keyword_score if max_keyword_score > 0.5 else base_confidence
            )

        if max_keyword_score > 0.6 and max_keyword_emotion == 'calm':
            if keyword_scores['calm'] > max(base_confidence, keyword_scores[final_emotion]):
                final_emotion = 'calm'
                final_confidence = max_keyword_score

        if base_confidence < 0.55 and max_keyword_score < 0.25:
            final_emotion = 'calm'
            final_confidence = max(0.55, max_keyword_score * 0.5 + 0.3)

        if base_confidence > 0.9:
            final_confidence = max(final_confidence, base_confidence * 0.85)

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
                    if re.match(r'^[a-zA-Z]+$', keyword):
                        weight = 2.5
                    elif not re.match(r'[\u4e00-\u9fff]', keyword):
                        weight = 3.0
                    elif len(keyword) <= 2:
                        weight = 2.0
                    elif len(keyword) <= 4:
                        weight = 1.5
                    else:
                        weight = 1.0
                    scores[emotion] += count * weight

        if re.search(r'!{2,}|！{2,}', text):
            scores['surprised'] += 1.5
            scores['happy'] += 0.5
            scores['angry'] += 0.5
        if re.search(r'[!！]', text):
            scores['happy'] += 0.3
            scores['surprised'] += 0.2
        if re.search(r'[~～]', text):
            scores['happy'] += 0.6
            scores['calm'] += 0.3
        if re.search(r'[.。]{3,}', text):
            scores['sad'] += 0.5
            scores['calm'] += 0.2
        if re.search(r'[?？]{2,}', text):
            scores['surprised'] += 0.8

        exclamation_count = text.count('!') + text.count('！')
        if exclamation_count >= 4:
            scores['angry'] += 1.0
            scores['surprised'] += 1.2
        elif exclamation_count >= 3:
            scores['surprised'] += 0.8
            scores['angry'] += 0.5

        upper_english = sum(1 for c in text if c.isalpha() and c.isupper())
        if upper_english >= 5:
            scores['angry'] += 0.5
            scores['surprised'] += 0.3

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

        sorted_scores = sorted(scores.values(), reverse=True)
        if len(sorted_scores) >= 2 and sorted_scores[1] > 0:
            ratio = sorted_scores[0] / sorted_scores[1] if sorted_scores[1] > 0 else float('inf')
            if ratio < 1.3:
                confidence = 0.45 + max_score * 0.3

        confidence = min(confidence, 0.9)

        return max_emotion, round(confidence, 3)

    def get_status(self) -> dict:
        """获取模型状态信息"""
        return {
            'model_available': self.model_available,
            'model_name': self.model_name,
            'error': self.model_load_error,
            'fallback_mode': not self.model_available
        }


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
        包含emotion、confidence、emoji、label、method的字典
    """
    analyzer = get_emotion_analyzer()

    before_method = 'transformer' if analyzer.model_available else 'keyword'

    emotion, confidence = analyzer.analyze(text)

    after_method = 'keyword' if (confidence < 0.3) or emotion not in EMOTION_TYPES else before_method

    return {
        'emotion': emotion,
        'confidence': confidence,
        'emoji': EMOTION_EMOJI.get(emotion, '😐'),
        'label': EMOTION_LABELS.get(emotion, '平静'),
        'method': after_method,
        'model_used': analyzer.model_name if analyzer.model_available else 'N/A'
    }


if __name__ == '__main__':
    print("=" * 60)
    print("记忆便签情感分析模块测试")
    print("=" * 60)

    analyzer = get_emotion_analyzer()
    status = analyzer.get_status()

    print(f"\n模型状态: {'✅ 可用' if status['model_available'] else '❌ 不可用 (使用降级方案)'}")
    print(f"模型名称: {status['model_name']}")
    if status['error']:
        print(f"错误信息: {status['error']}")
    print()

    test_texts = [
        ('今天阳光真好，心情特别愉快！在公园散步时看到了一只可爱的小狗。😊', 'expect: happy'),
        ('工作上遇到了一些挫折，有点不开心。但是相信明天会更好的！', 'expect: sad'),
        ('会议效率太低了，浪费了很多时间，有点烦躁！气死我了！！', 'expect: angry'),
        ('下午的咖啡时光，静静地看会儿书，享受这份宁静。☕', 'expect: calm'),
        ('哇！突然想到一个很棒的点子，太惊喜了！！真没想到啊！', 'expect: surprised'),
        ('今天天气一般。', 'expect: calm'),
        ('I am so happy today! Everything is wonderful! �', 'expect: happy'),
        ('This is absolutely terrible and frustrating, I hate it.', 'expect: angry/sad'),
        ('Wow that is amazing and unexpected!', 'expect: surprised'),
        ('Relaxing and peaceful afternoon, just reading a book.', 'expect: calm'),
    ]

    for i, (text, hint) in enumerate(test_texts, 1):
        result = analyze_emotion(text)
        display_text = text[:50] + ('...' if len(text) > 50 else '')
        print(f"[{i}] 文本: {display_text}")
        print(f"    情感: {result['label']} {result['emoji']} "
              f"| 置信度: {result['confidence']:.2%} "
              f"| 方法: {result['method']} "
              f"({hint})")
        print()
