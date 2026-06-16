import uuid
import math
from typing import Dict, List, Any, Optional

PERSONALITY_TRAITS = ['extroversion', 'friendliness', 'humor', 'patience', 'curiosity']

GREETING_TEMPLATES = {
    'high_extroversion': [
        "嘿！见到你真是太棒了！有什么新鲜事吗？",
        "欢迎欢迎！我可是等了好久了，快进来聊聊！",
        "哟！终于来了！我正想找人说话呢！",
    ],
    'low_extroversion': [
        "哦……你好。",
        "嗯，你来了。",
        "……你好。",
    ],
    'high_friendliness': [
        "你好呀！很高兴见到你，有什么我可以帮忙的吗？",
        "欢迎！有什么需要尽管说，我很乐意帮忙！",
    ],
    'low_friendliness': [
        "有什么事就快说吧。",
        "嗯，说吧，我时间不多。",
    ],
    'high_humor': [
        "哈哈哈，你来了！我刚才还在想今天会不会有人来逗我笑呢！",
        "哟，冒险者！你是来听我讲笑话的还是来正经办事的？",
    ],
    'high_curiosity': [
        "你好！你从哪里来？路上有什么有趣的发现吗？",
        "哦，新面孔！你一定有很多故事可以讲吧？",
    ],
    'high_patience': [
        "你好，不用着急，慢慢来就好。",
        "欢迎，慢慢说，我有很多时间听你讲。",
    ],
    'low_patience': [
        "快说，我没太多时间。",
        "有什么事？别磨磨蹭蹭的。",
    ],
    'neutral': [
        "你好，有什么事吗？",
        "嗯，你好。",
        "欢迎。有什么需要的吗？",
    ],
}

BRANCH_TEMPLATES = {
    'extroversion': {
        'high': [
            "那真是太有意思了！你知道吗，我还有更多想法！",
            "嘿，我还想到另一个方向，你有没有考虑过？",
            "说到这个，我突然想起一件超有趣的事！",
            "哦哦哦！还有还有，我差点忘了告诉你！",
        ],
        'low': [
            "嗯……也许是吧。",
            "……还有一种可能。",
        ],
    },
    'friendliness': {
        'high': [
            "我很乐意帮你了解更多！跟我来吧！",
            "你一定会喜欢这个的，让我告诉你更多细节！",
            "别担心，我会一步步帮你搞清楚的！",
        ],
        'low': [
            "这就是你要知道的。",
            "你自己看着办吧。",
        ],
    },
    'humor': {
        'high': [
            "哈哈，你猜怎么着？这里面有个大笑话！",
            "说个秘密给你听——其实这事儿挺搞笑的！",
            "别告诉别人，我偷偷告诉你一个有趣的版本！",
        ],
        'low': [
            "根据实际情况来说……",
            "严格来讲，情况是这样的。",
        ],
    },
    'patience': {
        'high': [
            "我们可以慢慢探索每一种可能性。",
            "别急，让我详细给你解释一下每种选择。",
        ],
        'low': [
            "简单来说就是这几个选项，你快点选吧。",
            "我没时间细说，你快速选一个。",
        ],
    },
    'curiosity': {
        'high': [
            "等等，这让我想到了一个全新的方向！如果我们换个角度呢？",
            "有没有一种可能……这背后还有更深层的故事？",
            "我对这个可能性特别好奇，你想一起探索吗？",
        ],
        'low': [
            "按照常规流程就是这样的。",
            "这就是标准做法。",
        ],
    },
}

DEEP_BRANCH_TEMPLATES = [
    "原来如此！那接下来……",
    "有意思，让我再想想这个方向。",
    "这个选择会带来一些新的变化。",
    "嗯，继续深入的话……",
    "如果沿着这条路走下去……",
    "这样的话，情况就变得更有趣了。",
    "那我们再看看接下来会发生什么。",
    "让我给你展示另一个角度。",
]


def compute_personality_fit(personality: Dict[str, int], text: str) -> float:
    score = 50.0
    text_lower = text.lower()

    if personality['extroversion'] > 60:
        exclamation_count = text_lower.count('！') + text_lower.count('!')
        question_count = text_lower.count('？') + text_lower.count('?')
        score += min(exclamation_count * 5, 15)
        score += min(question_count * 3, 10)
    elif personality['extroversion'] < 40:
        if len(text) < 15:
            score += 10
        exclamation_count = text_lower.count('！') + text_lower.count('!')
        score -= exclamation_count * 3

    if personality['friendliness'] > 60:
        friendly_words = ['帮忙', '乐意', '欢迎', '一起', '喜欢', '高兴']
        for word in friendly_words:
            if word in text:
                score += 5
    elif personality['friendliness'] < 40:
        cold_words = ['快', '别', '没时间', '自己']
        for word in cold_words:
            if word in text:
                score += 5

    if personality['humor'] > 60:
        humor_words = ['哈哈', '笑话', '搞笑', '有趣', '秘密']
        for word in humor_words:
            if word in text:
                score += 8

    if personality['curiosity'] > 60:
        curious_words = ['探索', '发现', '可能', '角度', '故事', '好奇']
        for word in curious_words:
            if word in text:
                score += 5

    if personality['patience'] > 60:
        patient_words = ['慢慢', '详细', '别急', '一步步']
        for word in patient_words:
            if word in text:
                score += 5
    elif personality['patience'] < 40:
        impatient_words = ['快', '赶紧', '别磨']
        for word in impatient_words:
            if word in text:
                score += 5

    return round(max(0, min(100, score)), 1)


def determine_avatar_expression(personality: Dict[str, int]) -> str:
    p = personality
    extrovert = p['extroversion'] > 60
    friendly = p['friendliness'] > 60
    humorous = p['humor'] > 60
    patient = p['patience'] > 60
    curious = p['curiosity'] > 60

    if extrovert and friendly and humorous:
        return '😄'
    elif extrovert and friendly:
        return '😊'
    elif extrovert and curious:
        return '🤩'
    elif extrovert:
        return '😃'
    elif not patient and curious:
        return '😤'
    elif not patient and not friendly:
        return '😠'
    elif not patient:
        return '😒'
    elif curious and friendly:
        return '🤔'
    elif curious:
        return '🧐'
    elif friendly:
        return '🙂'
    elif humorous:
        return '😏'
    elif not extrovert and not friendly:
        return '😐'
    else:
        return '🤨'


def _pick_greeting(personality: Dict[str, int]) -> str:
    candidates = list(GREETING_TEMPLATES['neutral'])

    for trait, threshold in [('extroversion', 65), ('friendliness', 65),
                              ('humor', 65), ('curiosity', 65), ('patience', 65)]:
        key_high = f'high_{trait}'
        key_low = f'low_{trait}'
        if personality[trait] >= threshold and key_high in GREETING_TEMPLATES:
            candidates.extend(GREETING_TEMPLATES[key_high])
        elif personality[trait] <= 35 and key_low in GREETING_TEMPLATES:
            candidates.extend(GREETING_TEMPLATES[key_low])

    import random
    return random.choice(candidates)


def generate_root_node(personality: Dict[str, int]) -> Dict[str, Any]:
    greeting = _pick_greeting(personality)
    fit = compute_personality_fit(personality, greeting)
    return {
        'id': str(uuid.uuid4()),
        'text': greeting,
        'personalityFit': fit,
        'nodeType': 'root',
        'children': [],
    }


def _determine_branch_count(personality: Dict[str, int]) -> int:
    base = 3
    if personality['extroversion'] > 60:
        base += 1
    if personality['curiosity'] > 60:
        base += 1
    if personality['extroversion'] < 40 and personality['curiosity'] < 40:
        base -= 1
    return max(3, min(5, base))


def _pick_branch_text(personality: Dict[str, int], trait_key: str) -> str:
    import random
    value = personality[trait_key]
    level = 'high' if value >= 55 else 'low'
    templates = BRANCH_TEMPLATES.get(trait_key, {}).get(level, BRANCH_TEMPLATES['extroversion']['low'])
    return random.choice(templates)


def generate_initial_branches(personality: Dict[str, int], root_node: Dict[str, Any]) -> List[Dict[str, Any]]:
    count = _determine_branch_count(personality)
    import random

    dominant_traits = sorted(PERSONALITY_TRAITS, key=lambda t: personality[t], reverse=True)
    selected_traits = dominant_traits[:count]

    branches = []
    for i, trait in enumerate(selected_traits):
        text = _pick_branch_text(personality, trait)
        fit = compute_personality_fit(personality, text)
        node = {
            'id': str(uuid.uuid4()),
            'text': text,
            'personalityFit': fit,
            'nodeType': 'branch',
            'children': [],
        }
        branches.append(node)

    return branches


def generate_child_suggestion(personality: Dict[str, int], parent_text: str) -> Dict[str, Any]:
    import random
    text = random.choice(DEEP_BRANCH_TEMPLATES)
    fit = compute_personality_fit(personality, text)
    return {
        'id': str(uuid.uuid4()),
        'text': text,
        'personalityFit': fit,
        'nodeType': 'branch',
        'children': [],
    }


def compute_layout(nodes: List[Dict[str, Any]], root_id: str) -> Dict[str, Dict[str, float]]:
    positions = {}
    h_gap = 250
    v_gap = 120

    children_map: Dict[str, List[str]] = {}
    for node in nodes:
        children_map[node['id']] = []

    edges = []
    for node in nodes:
        if node.get('parentId'):
            children_map[node['parentId']].append(node['id'])
            edges.append({'source': node['parentId'], 'target': node['id']})

    def _layout(node_id: str, x: float, y: float, width: float):
        positions[node_id] = {'x': x, 'y': y}
        children = children_map.get(node_id, [])
        if not children:
            return
        total_width = len(children) * h_gap
        start_x = x + width / 2 - total_width / 2
        for i, child_id in enumerate(children):
            child_x = start_x + i * h_gap
            _layout(child_id, child_x, y + v_gap, h_gap)

    _layout(root_id, 400, 50, 0)
    return positions
