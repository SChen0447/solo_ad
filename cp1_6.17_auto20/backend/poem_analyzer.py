import re
import json
from typing import List, Dict, Tuple


class PoemAnalyzer:
    def __init__(self):
        self.passionate_keywords = ['烈', '豪', '壮', '雄', '风', '雷', '电', '火', '怒', '冲', '霄', '天', '海', '千', '万', '破', '立', '征', '战', '啸']
        self.gentle_keywords = ['柔', '婉', '轻', '细', '温', '软', '香', '花', '月', '梦', '思', '念', '情', '丝', '云', '水', '溪', '燕', '莺', '蝶']
        self.melancholic_keywords = ['愁', '悲', '泪', '伤', '恨', '别', '离', '断', '孤', '独', '寂', '寞', '寒', '冷', '秋', '夜', '残', '落', '哀', '哭']
        self.peaceful_keywords = ['静', '安', '宁', '和', '淡', '远', '空', '山', '林', '泉', '石', '云', '松', '竹', '梅', '兰', '清', '幽', '闲', '睡']
        self.inspiring_keywords = ['志', '远', '高', '飞', '升', '明', '光', '阳', '春', '新', '生', '强', '坚', '挺', '立', '开', '拓', '创', '梦', '想']
        
        self.vowels = ['a', 'o', 'e', 'i', 'u', 'v', 'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 've', 'er', 'an', 'en', 'in', 'un', 'vn', 'ang', 'eng', 'ing', 'ong']
    
    def analyze(self, text: str) -> Dict:
        lines = self._split_lines(text)
        total_lines = len(lines)
        
        if total_lines == 0:
            return self._empty_result()
        
        line_char_counts = [len(line.strip()) for line in lines]
        avg_chars_per_line = sum(line_char_counts) / total_lines
        
        mood = self._analyze_mood(lines)
        bpm = self._get_bpm(mood)
        rhyme_pattern = self._analyze_rhyme(lines)
        
        base_duration_per_char = 60.0 / bpm / 2.0
        duration_per_line = [count * base_duration_per_char for count in line_char_counts]
        total_duration = sum(duration_per_line)
        
        return {
            "totalLines": total_lines,
            "avgCharsPerLine": round(avg_chars_per_line, 2),
            "mood": mood,
            "rhymePattern": rhyme_pattern,
            "lines": [line.strip() for line in lines],
            "lineCharCounts": line_char_counts,
            "bpm": bpm,
            "durationPerLine": [round(d, 2) for d in duration_per_line],
            "totalDuration": round(total_duration, 2)
        }
    
    def _split_lines(self, text: str) -> List[str]:
        lines = re.split(r'[\n\r]+', text)
        lines = [line.strip() for line in lines if line.strip()]
        return lines
    
    def _analyze_mood(self, lines: List[str]) -> str:
        full_text = ''.join(lines)
        
        scores = {
            'passionate': self._calculate_score(full_text, self.passionate_keywords),
            'gentle': self._calculate_score(full_text, self.gentle_keywords),
            'melancholic': self._calculate_score(full_text, self.melancholic_keywords),
            'peaceful': self._calculate_score(full_text, self.peaceful_keywords),
            'inspiring': self._calculate_score(full_text, self.inspiring_keywords)
        }
        
        if all(s == 0 for s in scores.values()):
            avg_chars = sum(len(line) for line in lines) / len(lines)
            if avg_chars <= 5:
                return 'gentle'
            elif avg_chars >= 8:
                return 'passionate'
            else:
                return 'peaceful'
        
        return max(scores, key=scores.get)
    
    def _calculate_score(self, text: str, keywords: List[str]) -> int:
        score = 0
        for keyword in keywords:
            count = text.count(keyword)
            score += count
        return score
    
    def _get_bpm(self, mood: str) -> int:
        bpm_map = {
            'passionate': 120,
            'inspiring': 100,
            'gentle': 80,
            'peaceful': 70,
            'melancholic': 60
        }
        return bpm_map.get(mood, 80)
    
    def _analyze_rhyme(self, lines: List[str]) -> str:
        if len(lines) < 2:
            return "A"
        
        last_chars = [line[-1] if line else '' for line in lines]
        rhyme_groups = []
        
        for i, char in enumerate(last_chars):
            placed = False
            for group in rhyme_groups:
                if self._is_rhyme(char, last_chars[group[0]]):
                    group.append(i)
                    placed = True
                    break
            if not placed:
                rhyme_groups.append([i])
        
        pattern = [''] * len(lines)
        for group_idx, group in enumerate(rhyme_groups):
            letter = chr(ord('A') + group_idx)
            for line_idx in group:
                pattern[line_idx] = letter
        
        return ''.join(pattern)
    
    def _is_rhyme(self, char1: str, char2: str) -> bool:
        if char1 == char2:
            return True
        
        rhyme_pairs = [
            ('一', '七', '夕'),
            ('二', '四', '事'),
            ('三', '山', '关'),
            ('五', '古', '土'),
            ('六', '绿', '竹'),
            ('八', '发', '花'),
            ('九', '酒', '柳'),
            ('十', '石', '日'),
            ('来', '开', '白'),
            ('去', '路', '暮'),
            ('归', '飞', '衣'),
            ('天', '年', '前'),
            ('地', '里', '起'),
            ('人', '春', '云'),
            ('月', '雪', '别'),
            ('风', '中', '红'),
            ('花', '家', '霞'),
            ('山', '间', '还'),
            ('水', '醉', '泪'),
            ('情', '心', '明'),
        ]
        
        for pair in rhyme_pairs:
            if char1 in pair and char2 in pair:
                return True
        
        return False
    
    def _empty_result(self) -> Dict:
        return {
            "totalLines": 0,
            "avgCharsPerLine": 0,
            "mood": "peaceful",
            "rhymePattern": "",
            "lines": [],
            "lineCharCounts": [],
            "bpm": 80,
            "durationPerLine": [],
            "totalDuration": 0
        }
