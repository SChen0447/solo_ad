import json
import hashlib
import random
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from collections import OrderedDict

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

CACHE_MAX_SIZE = 10
_generate_cache = OrderedDict()

EMOTION_LEXICON = {
    "兴奋": {"polarity": 1.0, "arousal": 0.95, "valence": 0.8, "related": ["激动", "欢欣", "热情"]},
    "激动": {"polarity": 1.0, "arousal": 0.9, "valence": 0.75, "related": ["兴奋", "热情"]},
    "快乐": {"polarity": 1.0, "arousal": 0.7, "valence": 0.95, "related": ["愉悦", "欢欣"]},
    "愉悦": {"polarity": 1.0, "arousal": 0.6, "valence": 0.9, "related": ["快乐", "温馨"]},
    "欢欣": {"polarity": 1.0, "arousal": 0.8, "valence": 0.85, "related": ["快乐", "兴奋"]},
    "热情": {"polarity": 1.0, "arousal": 0.85, "valence": 0.7, "related": ["兴奋", "激动"]},
    "浪漫": {"polarity": 1.0, "arousal": 0.5, "valence": 0.9, "related": ["温馨", "甜蜜"]},
    "温馨": {"polarity": 1.0, "arousal": 0.35, "valence": 0.85, "related": ["浪漫", "放松"]},
    "甜蜜": {"polarity": 1.0, "arousal": 0.4, "valence": 0.9, "related": ["浪漫", "温馨"]},
    "放松": {"polarity": 0.05, "arousal": 0.2, "valence": 0.7, "related": ["平静", "安宁"]},
    "平静": {"polarity": 0.0, "arousal": 0.15, "valence": 0.6, "related": ["放松", "安宁"]},
    "安宁": {"polarity": 0.0, "arousal": 0.1, "valence": 0.65, "related": ["放松", "平静"]},
    "慵懒": {"polarity": -0.1, "arousal": 0.15, "valence": 0.5, "related": ["疲惫", "困倦"]},
    "疲惫": {"polarity": -0.3, "arousal": 0.1, "valence": 0.3, "related": ["困倦", "慵懒"]},
    "困倦": {"polarity": -0.2, "arousal": 0.05, "valence": 0.35, "related": ["疲惫", "慵懒"]},
    "焦虑": {"polarity": -0.7, "arousal": 0.8, "valence": 0.2, "related": ["紧张", "不安"]},
    "紧张": {"polarity": -0.6, "arousal": 0.85, "valence": 0.25, "related": ["焦虑", "不安"]},
    "不安": {"polarity": -0.65, "arousal": 0.75, "valence": 0.2, "related": ["焦虑", "担忧"]},
    "担忧": {"polarity": -0.6, "arousal": 0.7, "valence": 0.2, "related": ["焦虑", "不安"]},
    "恐惧": {"polarity": -0.9, "arousal": 0.9, "valence": 0.1, "related": ["害怕"]},
    "害怕": {"polarity": -0.85, "arousal": 0.85, "valence": 0.1, "related": ["恐惧"]},
    "怀旧": {"polarity": -0.1, "arousal": 0.3, "valence": 0.5, "related": ["思念", "感伤"]},
    "思念": {"polarity": -0.4, "arousal": 0.3, "valence": 0.4, "related": ["怀旧", "感伤"]},
    "感伤": {"polarity": -0.5, "arousal": 0.35, "valence": 0.3, "related": ["怀旧", "忧郁"]},
    "忧郁": {"polarity": -0.7, "arousal": 0.3, "valence": 0.2, "related": ["悲伤", "感伤"]},
    "悲伤": {"polarity": -0.9, "arousal": 0.4, "valence": 0.1, "related": ["难过", "忧郁"]},
    "难过": {"polarity": -0.8, "arousal": 0.45, "valence": 0.15, "related": ["悲伤", "忧郁"]},
    "梦幻": {"polarity": 0.2, "arousal": 0.3, "valence": 0.7, "related": ["神秘"]},
    "神秘": {"polarity": 0.0, "arousal": 0.4, "valence": 0.5, "related": ["梦幻", "庄严"]},
    "庄严": {"polarity": 0.1, "arousal": 0.5, "valence": 0.6, "related": ["神秘"]},
}

POSITIVE_WORDS = [
    "好", "美", "爱", "喜欢", "高兴", "开心", "幸福", "希望", "阳光", "温暖",
    "灿烂", "明亮", "轻快", "成功", "胜利", "美好", "欢乐", "甜蜜",
    "happy", "joy", "love", "bright", "sunshine",
]

NEGATIVE_WORDS = [
    "坏", "痛", "哭", "难过", "伤心", "绝望", "黑暗", "寒冷", "孤独", "害怕",
    "痛苦", "死亡", "失败", "恐惧", "忧伤", "沉重", "疲惫", "焦虑", "担心", "不安",
    "sad", "pain", "fear", "dark", "cold", "lonely",
]

SCALE_MAJOR = [0, 2, 4, 5, 7, 9, 11]
SCALE_MINOR = [0, 2, 3, 5, 7, 8, 10]
SCALE_DORIAN = [0, 2, 3, 5, 7, 9, 10]
SCALE_LYDIAN = [0, 2, 4, 6, 7, 9, 11]
SCALE_MIXOLYDIAN = [0, 2, 4, 5, 7, 9, 10]
SCALE_PHRYGIAN = [0, 1, 3, 5, 7, 8, 10]

CHORD_PROGRESSIONS = {
    "positive_bright": [
        ["C", "G", "Am", "F"],
        ["C", "Am", "F", "G"],
        ["D", "A", "Bm", "G"],
        ["G", "D", "Em", "C"],
    ],
    "positive_warm": [
        ["C", "Em", "F", "G"],
        ["Am", "F", "C", "G"],
        ["D", "F#m", "G", "A"],
    ],
    "neutral_calm": [
        ["Am", "F", "C", "G"],
        ["Em", "C", "G", "D"],
        ["Dm", "Bb", "F", "C"],
        ["Am", "Dm", "G", "C"],
    ],
    "melancholic": [
        ["Am", "Em", "F", "C"],
        ["Dm", "Am", "Bb", "C"],
        ["Em", "C", "G", "D"],
        ["Bm", "G", "D", "A"],
    ],
    "tense_dark": [
        ["Am", "Dm", "Gm", "Am"],
        ["Em", "Am", "Dm", "Em"],
        ["Bdim", "Gm", "Cm", "Dm"],
    ],
    "mysterious": [
        ["Am", "Dm", "G", "C"],
        ["Dm", "Gm", "C", "F"],
        ["Cm", "Fm", "Bb", "Eb"],
    ],
}

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

CHORD_INTERVALS = {
    "": [0, 4, 7],
    "m": [0, 3, 7],
    "dim": [0, 3, 6],
    "aug": [0, 4, 8],
    "7": [0, 4, 7, 10],
    "m7": [0, 3, 7, 10],
    "maj7": [0, 4, 7, 11],
}

MELOTIC_PATTERNS = {
    "energetic": [
        [0.25, 1.0], [0.25, 1.0], [0.125, 1.0], [0.125, 1.0], [0.25, 1.0], [0.5, 1.0],
        [0.25, 1.0], [0.25, 1.0], [0.25, 1.0], [0.125, 1.0], [0.125, 1.0], [0.25, 1.0],
    ],
    "flowing": [
        [0.5, 1.0], [0.25, 1.0], [0.25, 1.0], [0.5, 1.0], [0.5, 1.0],
        [0.25, 1.0], [0.25, 1.0], [0.5, 1.0], [0.5, 1.0], [0.25, 1.0], [0.25, 1.0], [0.5, 1.0],
    ],
    "calm": [
        [1.0, 1.0], [0.5, 0.7], [0.5, 0.8], [1.0, 1.0],
        [1.0, 0.9], [0.5, 0.8], [0.5, 0.7], [1.0, 1.0],
    ],
    "tense": [
        [0.125, 1.0], [0.125, 1.0], [0.25, 1.0], [0.125, 1.0], [0.125, 1.0], [0.25, 1.0],
        [0.25, 0.9], [0.25, 0.8], [0.5, 1.0],
    ],
    "nostalgic": [
        [0.5, 0.8], [0.25, 0.7], [0.25, 0.8], [0.5, 0.9], [0.5, 1.0],
        [0.5, 0.8], [0.25, 0.7], [0.25, 0.8], [1.0, 0.9], [0.5, 0.8], [0.5, 0.7],
    ],
}


def parse_chord(chord_str):
    root = ""
    suffix = ""
    i = 0
    while i < len(chord_str):
        if chord_str[i].isalpha():
            i += 1
        elif chord_str[i] in ('#', 'b') and i >= 1:
            i += 1
        else:
            break
    root = chord_str[:i]
    suffix = chord_str[i:]
    return root, suffix


def note_name_to_midi(name, octave=4):
    if name not in NOTE_NAMES:
        return 60
    idx = NOTE_NAMES.index(name)
    return 12 * (octave + 1) + idx


def get_chord_notes(chord_name, octave=3):
    root, suffix = parse_chord(chord_name)
    if suffix not in CHORD_INTERVALS:
        suffix = ""
    root_midi = note_name_to_midi(root, octave)
    intervals = CHORD_INTERVALS[suffix]
    return [root_midi + iv for iv in intervals]


def transpose_chord_to_key(chord_str, target_root_name):
    orig_root, suffix = parse_chord(chord_str)
    if orig_root not in NOTE_NAMES or target_root_name not in NOTE_NAMES:
        return chord_str
    orig_idx = NOTE_NAMES.index(orig_root)
    target_idx = NOTE_NAMES.index(target_root_name)
    shift = (target_idx - orig_idx) % 12
    new_root = NOTE_NAMES[(orig_idx + shift) % 12]
    return new_root + suffix


def polarity_from_text(text):
    score = 0.0
    hits_pos = 0
    hits_neg = 0
    text_lower = text.lower()
    for w in POSITIVE_WORDS:
        if w in text_lower:
            hits_pos += 1
            score += 1.0
    for w in NEGATIVE_WORDS:
        if w in text_lower:
            hits_neg += 1
            score -= 1.0
    total = hits_pos + hits_neg
    if total == 0:
        return 0.0
    normalized = score / max(total, 1)
    return max(-1.0, min(1.0, normalized))


def polarity_badge(score):
    if score > 0.2:
        return "positive", score * 50 + 50
    elif score < -0.2:
        return "negative", (-score) * 50 + 50
    else:
        return "neutral", 50 + score * 50


def emotion_classify(keywords, description, text_polarity):
    avg_pol = 0.0
    avg_arousal = 0.0
    matched_keywords = []
    all_weights = {}
    for kw in keywords:
        if kw in EMOTION_LEXICON:
            matched_keywords.append(kw)
            entry = EMOTION_LEXICON[kw]
            avg_pol += entry["polarity"]
            avg_arousal += entry["arousal"]
            all_weights[kw] = 0.4
            for rel in entry.get("related", []):
                if rel in all_weights:
                    all_weights[rel] = max(all_weights[rel], 0.15)
                else:
                    all_weights[rel] = 0.15
    if len(matched_keywords) == 0:
        combined_pol = text_polarity
        avg_arousal = 0.4 + abs(text_polarity) * 0.5
    else:
        avg_pol = avg_pol / len(matched_keywords)
        avg_arousal = avg_arousal / len(matched_keywords)
        combined_pol = avg_pol * 0.6 + text_polarity * 0.4
    return combined_pol, avg_arousal, matched_keywords, all_weights


def build_emotion_vectors(matched_keywords, all_weights, combined_pol, arousal):
    vectors = []
    seen = set()
    for kw in matched_keywords:
        if kw in EMOTION_LEXICON:
            entry = EMOTION_LEXICON[kw]
            base = 60 + entry["valence"] * 40
            vectors.append({"label": kw, "intensity": round(base, 1)})
            seen.add(kw)
    sorted_related = sorted(all_weights.items(), key=lambda x: -x[1])
    for w, weight in sorted_related:
        if w in seen:
            continue
        if w in EMOTION_LEXICON:
            entry = EMOTION_LEXICON[w]
            base = (40 + entry["valence"] * 30) * (weight / 0.4)
            if base > 25:
                vectors.append({"label": w, "intensity": round(base, 1)})
                seen.add(w)
    if combined_pol > 0.3 and "快乐" not in seen:
        vectors.append({"label": "快乐", "intensity": round(40 + combined_pol * 50)})
    elif combined_pol < -0.3 and "悲伤" not in seen:
        vectors.append({"label": "悲伤", "intensity": round(40 + (-combined_pol) * 50)})
    if not vectors:
        if arousal > 0.6 and combined_pol < 0:
            vectors.append({"label": "紧张", "intensity": round(arousal * 80)})
        elif arousal < 0.3:
            vectors.append({"label": "放松", "intensity": round((1 - arousal) * 80)})
        else:
            vectors.append({"label": "平静", "intensity": 50})
    vectors.sort(key=lambda x: -x["intensity"])
    vectors = vectors[:8]
    if vectors:
        max_int = max(v["intensity"] for v in vectors)
        if max_int > 0:
            scale = min(100.0 / max_int, 1.3)
            for v in vectors:
                v["intensity"] = round(min(100, v["intensity"] * scale), 1)
    dominant = vectors[0]["label"] if vectors else "平静"
    return vectors, dominant


def calc_bpm(arousal, combined_pol, dominant):
    base = 60 + arousal * 100
    if dominant in ("兴奋", "激动", "热情", "紧张", "焦虑", "恐惧"):
        base += 30
    elif dominant in ("疲惫", "困倦", "慵懒", "放松", "平静", "安宁"):
        base -= 25
    elif dominant in ("浪漫", "梦幻", "怀旧", "思念"):
        base -= 10
    return int(max(50, min(200, base)))


def pick_scale_and_chords(combined_pol, arousal, dominant):
    if dominant in ("兴奋", "快乐", "热情", "欢欣", "激动"):
        scale = SCALE_MAJOR
        prog_key = "positive_bright"
        root_key = random.choice(["C", "D", "G", "A"])
    elif dominant in ("浪漫", "温馨", "甜蜜", "愉悦"):
        scale = SCALE_LYDIAN
        prog_key = "positive_warm"
        root_key = random.choice(["C", "G", "F", "D"])
    elif dominant in ("放松", "平静", "安宁"):
        scale = SCALE_MAJOR
        prog_key = "neutral_calm"
        root_key = random.choice(["C", "G", "F", "D"])
    elif dominant in ("怀旧", "思念", "感伤"):
        scale = SCALE_MINOR
        prog_key = "melancholic"
        root_key = random.choice(["A", "D", "E", "B"])
    elif dominant in ("忧郁", "悲伤", "难过"):
        scale = SCALE_MINOR
        prog_key = "melancholic"
        root_key = random.choice(["A", "E", "D", "B"])
    elif dominant in ("焦虑", "紧张", "不安", "恐惧", "担忧", "害怕"):
        scale = SCALE_PHRYGIAN
        prog_key = "tense_dark"
        root_key = random.choice(["A", "E", "D"])
    elif dominant in ("梦幻", "神秘"):
        scale = SCALE_DORIAN
        prog_key = "mysterious"
        root_key = random.choice(["A", "D", "E"])
    elif dominant in ("庄严",):
        scale = SCALE_MIXOLYDIAN
        prog_key = "neutral_calm"
        root_key = random.choice(["C", "G", "D"])
    elif dominant in ("疲惫", "困倦", "慵懒"):
        scale = SCALE_MINOR
        prog_key = "neutral_calm"
        root_key = random.choice(["A", "D", "E"])
    else:
        scale = SCALE_MAJOR if combined_pol >= 0 else SCALE_MINOR
        prog_key = "positive_bright" if combined_pol >= 0 else "melancholic"
        root_key = random.choice(["C", "G", "A", "D"])
    progression = random.choice(CHORD_PROGRESSIONS[prog_key])
    chords = [transpose_chord_to_key(c, root_key) for c in progression]
    return scale, chords, root_key


def pick_pattern(arousal, dominant):
    if dominant in ("兴奋", "激动", "热情", "焦虑", "紧张", "恐惧"):
        return "energetic"
    elif dominant in ("悲伤", "难过", "忧郁"):
        return "nostalgic"
    elif dominant in ("怀旧", "思念", "感伤", "梦幻"):
        return "nostalgic"
    elif dominant in ("放松", "平静", "安宁", "疲惫", "困倦", "慵懒"):
        return "calm"
    elif dominant in ("神秘", "庄严"):
        return "flowing"
    else:
        if arousal > 0.6:
            return "energetic"
        elif arousal < 0.3:
            return "calm"
        return "flowing"


def build_scale_notes(scale, root_note, octave=4):
    base = note_name_to_midi(root_note, octave)
    return [base + interval for interval in scale]


def generate_sheet_music(bpm, scale_notes, chords, pattern_name, bars=6):
    notes = []
    time_sig = (4, 4)
    beats_per_bar = time_sig[0]
    pattern = MELOTIC_PATTERNS[pattern_name]
    chord_octave = 3
    bass_octave = 2
    bar_duration = float(beats_per_bar)
    current_time = 0.0
    melody_degrees = [0, 2, 4, 2, 3, 5, 4, 2, 0, 4, 5, 7, 6, 5, 4, 2]
    pattern_len = len(pattern)
    for bar_idx in range(bars):
        chord_idx = bar_idx % len(chords)
        chord_name = chords[chord_idx]
        chord_notes_list = get_chord_notes(chord_name, chord_octave)
        bass_note = get_chord_notes(chord_name, bass_octave)[0]
        notes.append({
            "pitch": int(bass_note),
            "duration": bar_duration * 1.0,
            "startTime": current_time,
            "track": "bass",
            "velocity": 0.55,
        })
        for chord_pitch in chord_notes_list:
            notes.append({
                "pitch": int(chord_pitch),
                "duration": bar_duration * 0.95,
                "startTime": current_time + 0.02,
                "track": "chord",
                "velocity": 0.5,
            })
        local_cursor = 0.0
        pat_i = 0
        deg_offset = bar_idx * 3
        while local_cursor < bar_duration - 0.01:
            p_idx = (bar_idx * 3 + pat_i) % pattern_len
            dur_beat, vel_mult = pattern[p_idx]
            if local_cursor + dur_beat > bar_duration:
                dur_beat = bar_duration - local_cursor
            d_idx = (deg_offset + pat_i) % len(melody_degrees)
            degree = melody_degrees[d_idx]
            sn_len = len(scale_notes)
            oct_shift = degree // sn_len
            base_degree = degree % sn_len
            pitch = scale_notes[base_degree] + oct_shift * 12
            if pitch < 67:
                pitch += 12
            pitch = max(60, min(84, pitch))
            if dur_beat > 0:
                notes.append({
                    "pitch": int(pitch),
                    "duration": max(dur_beat * 0.9, 0.08),
                    "startTime": current_time + local_cursor,
                    "track": "melody",
                    "velocity": round(0.7 * vel_mult, 2),
                })
            local_cursor += dur_beat
            pat_i += 1
        current_time += bar_duration
    total_beats = bars * beats_per_bar
    duration = 60.0 / bpm * total_beats
    return {
        "id": f"sheet_{int(time.time() * 1000)}_{random.randint(100, 999)}",
        "bpm": bpm,
        "bars": bars,
        "timeSignature": list(time_sig),
        "notes": notes,
        "chordProgression": chords,
        "duration": round(duration, 2),
    }


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    data = request.get_json(force=True, silent=True) or {}
    keywords = data.get("keywords", []) or []
    description = data.get("description", "") or ""
    text_pol = polarity_from_text(description)
    combined_pol, arousal, matched, weights = emotion_classify(
        keywords, description, text_pol
    )
    vectors, dominant = build_emotion_vectors(matched, weights, combined_pol, arousal)
    polarity_label, polarity_score = polarity_badge(combined_pol)
    return jsonify({
        "polarity": polarity_label,
        "polarityScore": round(polarity_score, 2),
        "emotions": vectors,
        "dominantEmotion": dominant,
    })


@app.route("/api/generate", methods=["POST"])
def api_generate():
    data = request.get_json(force=True, silent=True) or {}
    emotions = data.get("emotions", []) or []
    dominant = data.get("dominant_emotion") or (emotions[0]["label"] if emotions else "平静")
    cache_key = hashlib.md5(
        json.dumps([emotions, dominant], sort_keys=True).encode()
    ).hexdigest()
    if cache_key in _generate_cache:
        _generate_cache.move_to_end(cache_key)
        return jsonify(_generate_cache[cache_key])
    combined_pol = 0.0
    arousal = 0.4
    total_w = 0
    for e in emotions:
        w = float(e.get("intensity", 50)) / 100.0
        label = e.get("label", "")
        if label in EMOTION_LEXICON:
            entry = EMOTION_LEXICON[label]
            combined_pol += entry["polarity"] * w
            arousal += entry["arousal"] * w
            total_w += w
    if total_w > 0:
        combined_pol /= total_w
        arousal /= total_w
    bpm = calc_bpm(arousal, combined_pol, dominant)
    scale, chords, root_key = pick_scale_and_chords(combined_pol, arousal, dominant)
    pattern_name = pick_pattern(arousal, dominant)
    if arousal > 0.7:
        bars = 6
    elif arousal < 0.3:
        bars = 8
    else:
        bars = random.choice([4, 6, 8])
    scale_notes = build_scale_notes(scale, root_key, 4)
    sheet = generate_sheet_music(bpm, scale_notes, chords, pattern_name, bars)
    _generate_cache[cache_key] = sheet
    if len(_generate_cache) > CACHE_MAX_SIZE:
        _generate_cache.popitem(last=False)
    return jsonify(sheet)


@app.route("/api/health", methods=["GET"])
def api_health():
    return jsonify({"status": "ok", "cache_size": len(_generate_cache)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
