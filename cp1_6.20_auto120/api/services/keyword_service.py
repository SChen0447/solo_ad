import re
import math
from collections import Counter

STOP_WORDS = set(
    "的 了 是 在 我 有 和 就 不 人 都 一 一个 上 也 很 到 说 要 去 你 会 着 没有 看 好 自己"
    " 这 他 她 它 们 那 些 什么 怎么 可以 因为 所以 如果 但是 而且 或者 以及 对于 通过"
    " 使用 进行 可以 需要 我们 这个 那个 还 中 大 小 多 少".split()
)


def extract_keywords(text, top_n=5):
    words = _tokenize(text)
    filtered = [w for w in words if w not in STOP_WORDS and len(w) > 1]
    if not filtered:
        return {"keywords": [], "highlights": []}
    counter = Counter(filtered)
    total = len(filtered)
    scored = []
    for word, count in counter.items():
        tf = count / total
        idf = math.log(total / (count + 1)) + 1
        scored.append((word, tf * idf, count))
    scored.sort(key=lambda x: -x[2])
    top_keywords = scored[:top_n]
    keywords = [item[0] for item in top_keywords]
    highlights = _find_highlights(text, keywords)
    return {"keywords": keywords, "highlights": highlights}


def _tokenize(text):
    segments = re.split(r"[，。！？；：、\s\-—…（）()【】\[\]{}<>《》\"'·\n\r\t,.;:!?]+", text)
    result = []
    for seg in segments:
        seg = seg.strip()
        if not seg:
            continue
        if len(seg) <= 4:
            result.append(seg)
        else:
            for size in [4, 3, 2]:
                for i in range(len(seg) - size + 1):
                    result.append(seg[i:i + size])
    return result


def _find_highlights(text, keywords):
    highlights = []
    for kw in keywords:
        start = 0
        while True:
            idx = text.find(kw, start)
            if idx == -1:
                break
            highlights.append({
                "start": idx,
                "end": idx + len(kw),
                "text": kw
            })
            start = idx + len(kw)
    return highlights
