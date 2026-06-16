import json
import os
import uuid
import re
import threading
import time
from datetime import datetime, timedelta
from collections import Counter

from flask import Flask, request, jsonify
from flask_cors import CORS
import feedparser
import requests

app = Flask(__name__)
CORS(app)

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")
COLOR_PALETTE = ["#6C63FF", "#FF6584", "#4ECDC4", "#FFD93D", "#6BCB77", "#4D96FF", "#FF6B6B", "#C084FC", "#22D3EE", "#FB923C"]

POSITIVE_WORDS = [
    "good", "great", "excellent", "amazing", "wonderful", "best", "love", "happy",
    "success", "growth", "innovation", "breakthrough", "improve", "benefit", "positive",
    "gain", "win", "boost", "advance", "progress",
    "突破", "增长", "创新", "优秀", "成功", "进步", "提升", "利好"
]

NEGATIVE_WORDS = [
    "bad", "terrible", "awful", "worst", "hate", "fail", "failure", "crisis",
    "decline", "loss", "drop", "risk", "threat", "negative", "damage", "poor", "weak",
    "糟糕", "下跌", "危机", "损失", "风险", "衰退", "下降", "失败"
]

STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might", "shall",
    "can", "this", "that", "these", "those", "it", "its", "i", "me", "my", "we", "our",
    "you", "your", "he", "she", "they", "them", "their", "what", "which", "who", "whom",
    "how", "when", "where", "why", "not", "no", "nor", "as", "if", "then", "than",
    "too", "very", "just", "about", "up", "out", "so", "also", "more", "most", "other",
    "some", "such", "only", "same", "into", "over", "after", "before", "between",
    "through", "during", "each", "few", "all", "any", "both", "every", "many", "much",
    "new", "one", "two", "first", "last", "long", "great", "little", "own", "old",
    "right", "big", "high", "different", "small", "large", "next", "early", "young",
    "important", "still", "back", "way", "well", "here", "there", "now", "s", "t",
    "d", "m", "re", "ll", "ve", "don", "doesn", "didn", "won", "wouldn", "couldn",
    "shouldn", "isn", "aren", "wasn", "weren", "hasn", "haven", "hadn", "am", "get",
    "got", "like", "make", "made", "take", "taken", "come", "came", "go", "went",
    "see", "saw", "know", "knew", "think", "thought", "say", "said", "tell", "told",
    "use", "used", "find", "found", "give", "gave", "tell", "work", "call", "try",
    "ask", "need", "feel", "become", "leave", "put", "mean", "keep", "let", "begin",
    "seem", "help", "show", "hear", "play", "run", "move", "live", "believe", "bring",
    "happen", "write", "provide", "sit", "stand", "lose", "pay", "meet", "include",
    "continue", "set", "learn", "change", "lead", "understand", "watch", "follow",
    "stop", "create", "speak", "read", "allow", "add", "spend", "grow", "open",
    "walk", "win", "offer", "remember", "love", "consider", "appear", "buy", "wait",
    "serve", "die", "send", "expect", "build", "stay", "fall", "cut", "reach", "kill",
    "remain", "suggest", "raise", "pass", "sell", "require", "report", "decide", "pull",
    "de", "la", "le", "les", "un", "une", "des", "du", "et", "en", "est", "que",
    "qui", "dans", "pour", "pas", "sur", "ce", "il", "ne", "se", "son", "au",
    "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "一个",
    "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好",
    "自己", "这", "他", "她", "它", "们", "那", "被", "从", "把", "让", "与", "对",
    "而", "但", "如果", "因为", "所以", "可以", "已经", "还", "又", "再", "只",
    "没", "吧", "呢", "啊", "哦", "嗯", "哈", "呀"
}

DEFAULT_FEEDS = [
    {"name": "Hacker News", "url": "https://hnrss.org/frontpage"},
    {"name": "TechCrunch", "url": "https://techcrunch.com/feed/"},
    {"name": "The Verge", "url": "https://www.theverge.com/rss/index.xml"},
]

feed_sources = []
articles = []
color_index = 0


def get_next_color():
    global color_index
    color = COLOR_PALETTE[color_index % len(COLOR_PALETTE)]
    color_index += 1
    return color


def load_data():
    global feed_sources, articles, color_index
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                feed_sources = data.get("feed_sources", [])
                articles = data.get("articles", [])
                color_index = data.get("color_index", 0)
        except (json.JSONDecodeError, IOError):
            feed_sources = []
            articles = []
            color_index = 0
    if not feed_sources:
        for feed in DEFAULT_FEEDS:
            feed_sources.append({
                "id": str(uuid.uuid4()),
                "name": feed["name"],
                "url": feed["url"],
                "icon": "",
                "lastUpdated": "",
                "color": get_next_color()
            })
        save_data()


def save_data():
    data = {
        "feed_sources": feed_sources,
        "articles": articles,
        "color_index": color_index
    }
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except IOError:
        pass


def analyze_sentiment(text):
    if not text:
        return 0.0, "neutral"
    text_lower = text.lower()
    pos_count = sum(1 for w in POSITIVE_WORDS if w in text_lower)
    neg_count = sum(1 for w in NEGATIVE_WORDS if w in text_lower)
    total = pos_count + neg_count
    if total == 0:
        return 0.0, "neutral"
    score = (pos_count - neg_count) / total
    if score > 0.1:
        sentiment = "positive"
    elif score < -0.1:
        sentiment = "negative"
    else:
        sentiment = "neutral"
    return round(score, 4), sentiment


def extract_keywords(title, summary, top_n=5):
    text = f"{title or ''} {summary or ''}"
    text = re.sub(r"https?://\S+", "", text)
    text = re.sub(r"[^\w\s\u4e00-\u9fff]", " ", text)
    words = re.findall(r"[a-zA-Z]{3,}|[\u4e00-\u9fff]{2,}", text)
    filtered = [w.lower() for w in words if w.lower() not in STOP_WORDS]
    counter = Counter(filtered)
    return [kw for kw, _ in counter.most_common(top_n)]


def fetch_feed(source):
    try:
        resp = requests.get(source["url"], timeout=15, headers={"User-Agent": "RSS-Aggregator/1.0"})
        resp.raise_for_status()
        parsed = feedparser.parse(resp.content)
    except Exception:
        try:
            parsed = feedparser.parse(source["url"])
        except Exception:
            return []

    new_articles = []
    existing_keys = {(a["title"], a["sourceId"]) for a in articles}

    for entry in parsed.entries:
        title = entry.get("title", "").strip()
        if not title:
            continue
        key = (title, source["id"])
        if key in existing_keys:
            continue

        summary = entry.get("summary", entry.get("description", ""))
        if summary:
            summary = re.sub(r"<[^>]+>", "", summary).strip()
        summary = summary[:500] if summary else ""

        published = entry.get("published", entry.get("updated", ""))
        if not published:
            try:
                published = entry.get("published_parsed", None)
                if published:
                    published = datetime(*published[:6]).isoformat()
                else:
                    published = datetime.now().isoformat()
            except Exception:
                published = datetime.now().isoformat()

        link = entry.get("link", "")

        full_text = f"{title} {summary}"
        sentiment_score, sentiment = analyze_sentiment(full_text)
        keywords = extract_keywords(title, summary)

        article = {
            "id": str(uuid.uuid4()),
            "title": title,
            "summary": summary,
            "sourceId": source["id"],
            "sourceName": source["name"],
            "publishedAt": published,
            "link": link,
            "sentimentScore": sentiment_score,
            "sentiment": sentiment,
            "keywords": keywords
        }
        new_articles.append(article)
        existing_keys.add(key)

    return new_articles


def refresh_all_feeds():
    global articles
    all_new = []
    for source in feed_sources:
        new = fetch_feed(source)
        all_new.extend(new)
        source["lastUpdated"] = datetime.now().isoformat()
    articles.extend(all_new)
    articles.sort(key=lambda a: a["publishedAt"], reverse=True)
    articles[:] = articles[:500]
    save_data()


def auto_refresh():
    while True:
        time.sleep(900)
        try:
            refresh_all_feeds()
        except Exception:
            pass


@app.route("/api/feeds", methods=["GET"])
def get_feeds():
    return jsonify(feed_sources)


@app.route("/api/feeds", methods=["POST"])
def add_feed():
    data = request.get_json()
    if not data or not data.get("url"):
        return jsonify({"error": "url is required"}), 400
    url = data["url"].strip()
    name = data.get("name", "").strip()
    if not name:
        try:
            parsed = feedparser.parse(url)
            name = parsed.feed.get("title", url)
        except Exception:
            name = url
    for s in feed_sources:
        if s["url"] == url:
            return jsonify({"error": "feed already exists"}), 409
    source = {
        "id": str(uuid.uuid4()),
        "name": name,
        "url": url,
        "icon": "",
        "lastUpdated": "",
        "color": get_next_color()
    }
    feed_sources.append(source)
    new_articles = fetch_feed(source)
    source["lastUpdated"] = datetime.now().isoformat()
    articles.extend(new_articles)
    save_data()
    return jsonify(source), 201


@app.route("/api/feeds/<feed_id>", methods=["DELETE"])
def delete_feed(feed_id):
    global articles
    source = next((s for s in feed_sources if s["id"] == feed_id), None)
    if not source:
        return jsonify({"error": "feed not found"}), 404
    feed_sources.remove(source)
    articles = [a for a in articles if a["sourceId"] != feed_id]
    save_data()
    return jsonify({"message": "deleted"}), 200


@app.route("/api/fetch-feeds", methods=["GET"])
def fetch_feeds():
    source_id = request.args.get("sourceId", "")
    keyword = request.args.get("keyword", "")
    sentiment = request.args.get("sentiment", "")

    filtered = articles[:]

    if source_id:
        filtered = [a for a in filtered if a["sourceId"] == source_id]
    if keyword:
        kw_lower = keyword.lower()
        filtered = [a for a in filtered if kw_lower in a["title"].lower() or kw_lower in a["summary"].lower()]
    if sentiment:
        filtered = [a for a in filtered if a["sentiment"] == sentiment]

    filtered = filtered[:50]

    scores = [a["sentimentScore"] for a in filtered]
    avg_sentiment = round(sum(scores) / len(scores), 4) if scores else 0.0

    return jsonify({
        "articles": filtered,
        "totalArticles": len(articles),
        "sourceCount": len(feed_sources),
        "avgSentiment": avg_sentiment
    })


@app.route("/api/refresh", methods=["POST"])
def manual_refresh():
    refresh_all_feeds()
    return jsonify({"message": "refreshed", "totalArticles": len(articles)})


@app.route("/api/compare", methods=["GET"])
def compare():
    now = datetime.now()
    days = []
    for i in range(6, -1, -1):
        d = now - timedelta(days=i)
        days.append(d.strftime("%Y-%m-%d"))

    volume_trend = {d: {} for d in days}
    keyword_trend = {d: Counter() for d in days}
    sentiment_dist = {}

    for article in articles:
        try:
            art_date = article["publishedAt"][:10]
        except (TypeError, IndexError):
            continue
        if art_date not in volume_trend:
            continue

        source_name = article["sourceName"]
        volume_trend[art_date][source_name] = volume_trend[art_date].get(source_name, 0) + 1

        for kw in article.get("keywords", []):
            keyword_trend[art_date][kw] += 1

        if source_name not in sentiment_dist:
            sentiment_dist[source_name] = {"positive": 0, "neutral": 0, "negative": 0}
        sentiment_dist[source_name][article["sentiment"]] = sentiment_dist[source_name].get(article["sentiment"], 0) + 1

    volume_result = []
    for d in days:
        entry = {"date": d}
        for source in feed_sources:
            entry[source["name"]] = volume_trend[d].get(source["name"], 0)
        volume_result.append(entry)

    all_keywords = Counter()
    for d in days:
        all_keywords.update(keyword_trend[d])
    top5 = [kw for kw, _ in all_keywords.most_common(5)]

    keyword_result = []
    for d in days:
        entry = {"date": d}
        for kw in top5:
            entry[kw] = keyword_trend[d].get(kw, 0)
        keyword_result.append(entry)

    sentiment_result = []
    for source in feed_sources:
        dist = sentiment_dist.get(source["name"], {"positive": 0, "neutral": 0, "negative": 0})
        sentiment_result.append({
            "source": source["name"],
            "positive": dist["positive"],
            "neutral": dist["neutral"],
            "negative": dist["negative"]
        })

    return jsonify({
        "volumeTrend": volume_result,
        "keywordTrend": keyword_result,
        "sentimentDist": sentiment_result
    })


load_data()

refresh_thread = threading.Thread(target=auto_refresh, daemon=True)
refresh_thread.start()

try:
    refresh_all_feeds()
except Exception:
    pass

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
