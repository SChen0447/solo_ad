import numpy as np
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity
from collections import Counter
from typing import List, Dict, Tuple


def preprocess_texts(texts: List[str]) -> List[str]:
    cleaned = []
    for text in texts:
        text = re.sub(r'[^\w\s\u4e00-\u9fff]', ' ', text.lower())
        text = re.sub(r'\s+', ' ', text).strip()
        cleaned.append(text)
    return cleaned


def extract_keywords(texts: List[str], top_k: int = 5) -> List[str]:
    words = []
    for text in texts:
        tokens = re.findall(r'[\w\u4e00-\u9fff]+', text.lower())
        stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
                      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
                      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
                      'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
                      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
                      'above', 'below', 'between', 'under', 'again', 'further', 'then',
                      'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
                      'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
                      'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and',
                      'but', 'if', 'or', 'because', 'as', 'until', 'while', 'this', 'that',
                      'these', 'those', 'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they',
                      'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
                      '的', '了', '和', '是', '就', '都', '而', '及', '与', '在', '有',
                      '个', '上', '也', '很', '到', '说', '要', '去', '你', '我', '他',
                      '她', '它', '这', '那', '会', '着', '没有', '看', '好', '自己',
                      '这', '那', '什么', '怎么', '为', '以', '等', '把', '被', '让',
                      '给', '向', '从', '对', '得', '着', '过', '来', '请', '所',
                      '可以', '可能', '应该', '需要', '如何', '哪些', '哪个', '能够',
                      '我们', '你们', '他们', '它们', '一个', '一些', '一样', '一种'}
        tokens = [t for t in tokens if t not in stop_words and len(t) > 1]
        words.extend(tokens)
    counter = Counter(words)
    return [word for word, _ in counter.most_common(top_k)]


def simple_embedding(texts: List[str]) -> np.ndarray:
    vectorizer = TfidfVectorizer(max_features=512, ngram_range=(1, 2))
    vectors = vectorizer.fit_transform(texts)
    return vectors.toarray()


def generate_group_names(clusters: List[int], texts: List[str]) -> Dict[int, str]:
    group_texts: Dict[int, List[str]] = {}
    for cluster_id, text in zip(clusters, texts):
        if cluster_id not in group_texts:
            group_texts[cluster_id] = []
        group_texts[cluster_id].append(text)
    
    group_names: Dict[int, str] = {}
    for cluster_id, group in group_texts.items():
        keywords = extract_keywords(group, top_k=3)
        if keywords:
            group_names[cluster_id] = ' · '.join(keywords)
        else:
            group_names[cluster_id] = f'群组 {cluster_id + 1}'
    
    return group_names


def cluster_texts(texts: List[str], method: str = 'similarity', n_clusters: int = None) -> Dict:
    if len(texts) == 0:
        return {
            'clusters': {},
            'group_names': {},
            'group_sizes': {}
        }
    
    if n_clusters is None:
        n_clusters = max(2, min(8, len(texts) // 4))
    
    if method == 'tags':
        clusters = list(range(len(texts)))
        cluster_map = {}
        for i, text in enumerate(texts):
            tags = re.findall(r'#(\w+)', text)
            if tags:
                key = tags[0]
                if key not in cluster_map:
                    cluster_map[key] = len(cluster_map)
                clusters[i] = cluster_map[key]
            else:
                clusters[i] = len(cluster_map) if cluster_map else 0
        n_clusters = len(set(clusters))
    else:
        cleaned_texts = preprocess_texts(texts)
        vectors = simple_embedding(cleaned_texts)
        
        if len(texts) == 1:
            clusters = [0]
            n_clusters = 1
        else:
            actual_clusters = min(n_clusters, len(texts))
            kmeans = KMeans(n_clusters=actual_clusters, random_state=42, n_init=10)
            clusters = kmeans.fit_predict(vectors).tolist()
    
    cluster_mapping = {}
    current_id = 0
    normalized_clusters = []
    for c in clusters:
        if c not in cluster_mapping:
            cluster_mapping[c] = current_id
            current_id += 1
        normalized_clusters.append(cluster_mapping[c])
    
    group_names = generate_group_names(normalized_clusters, texts)
    
    result = {
        'clusters': {},
        'group_names': group_names,
        'group_sizes': {}
    }
    
    for i, cluster_id in enumerate(normalized_clusters):
        result['clusters'][str(i)] = cluster_id
        result['group_sizes'][str(cluster_id)] = result['group_sizes'].get(str(cluster_id), 0) + 1
    
    return result
