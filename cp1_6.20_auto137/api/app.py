import os
import uuid
import json
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import requests

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'inspiration_canvas.db')
COLLAGE_DIR = os.path.join(os.path.dirname(__file__), 'data', 'collages')
os.makedirs(os.path.join(os.path.dirname(__file__), 'data'), exist_ok=True)
os.makedirs(COLLAGE_DIR, exist_ok=True)

EMOTION_CONFIG = {
    'happy': {'label': '开心', 'color': '#FFD93D', 'gradient': ['#FFD93D', '#FF9A3C']},
    'sad': {'label': '悲伤', 'color': '#6C5B7B', 'gradient': ['#6C5B7B', '#3D3A50']},
    'anxious': {'label': '焦虑', 'color': '#E84545', 'gradient': ['#E84545', '#C23152']},
    'calm': {'label': '平静', 'color': '#81B29A', 'gradient': ['#81B29A', '#52796F']},
    'excited': {'label': '兴奋', 'color': '#FF6F61', 'gradient': ['#FF6F61', '#FF3F34']},
    'angry': {'label': '愤怒', 'color': '#FF4757', 'gradient': ['#FF4757', '#C0392B']},
    'tired': {'label': '疲惫', 'color': '#A29BFE', 'gradient': ['#A29BFE', '#6C5CE7']},
    'grateful': {'label': '感恩', 'color': '#F8B500', 'gradient': ['#F8B500', '#FF8C00']},
}

EMOTION_KEYWORDS = {
    'happy': ['happy', 'joy', 'smile', 'sunshine', 'laugh', 'celebration', 'nature', 'flowers'],
    'sad': ['rain', 'clouds', 'melancholy', 'lonely', 'tears', 'autumn', 'grey'],
    'anxious': ['storm', 'tension', 'rush', 'chaos', 'nervous', 'fire', 'red'],
    'calm': ['ocean', 'peace', 'zen', 'meditation', 'forest', 'lake', 'gentle'],
    'excited': ['energy', 'fireworks', 'party', 'sparkle', 'vibrant', 'festival', 'dance'],
    'angry': ['fire', 'explosion', 'thunder', 'intense', 'dramatic', 'volcano'],
    'tired': ['night', 'moon', 'sleep', 'dreamy', 'clouds', 'soft', 'stars'],
    'grateful': ['warm', 'heart', 'sunrise', 'gold', 'thankful', 'blessing', 'light'],
}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS diaries (
            id TEXT PRIMARY KEY,
            emotion TEXT NOT NULL,
            text TEXT NOT NULL,
            emojis_json TEXT NOT NULL DEFAULT '[]',
            collage_url TEXT,
            template TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    ''')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_diaries_created_at ON diaries(created_at)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_diaries_emotion ON diaries(emotion)')
    conn.commit()
    conn.close()


init_db()


def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def create_gradient(width, height, color1, color2):
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    r1, g1, b1 = hex_to_rgb(color1)
    r2, g2, b2 = hex_to_rgb(color2)
    for y in range(height):
        ratio = y / height
        r = int(r1 + (r2 - r1) * ratio)
        g = int(g1 + (g2 - g1) * ratio)
        b = int(b1 + (b2 - b1) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    return img


def fetch_unsplash_image(keyword, width=800, height=600):
    try:
        url = f"https://source.unsplash.com/{width}x{height}/?{keyword}"
        resp = requests.get(url, timeout=10, allow_redirects=True)
        if resp.status_code == 200:
            img = Image.open(__import__('io').BytesIO(resp.content))
            return img.convert('RGBA')
    except Exception:
        pass
    img = Image.new('RGBA', (width, height), (200, 200, 200, 80))
    draw = ImageDraw.Draw(img)
    draw.text((width//4, height//2), keyword, fill=(150, 150, 150, 120))
    return img


def apply_color_filter(img, color, opacity=0.3):
    overlay = Image.new('RGBA', img.size, (*hex_to_rgb(color), int(255 * opacity)))
    return Image.alpha_composite(img.convert('RGBA'), overlay)


def generate_collage(emotion, text, emojis, template):
    config = EMOTION_CONFIG.get(emotion, EMOTION_CONFIG['calm'])
    width, height = 1920, 1080

    base = create_gradient(width, height, config['gradient'][0], config['gradient'][1]).convert('RGBA')

    keywords = EMOTION_KEYWORDS.get(emotion, ['abstract'])
    keyword = keywords[0]

    photo = fetch_unsplash_image(keyword, 800, 600)
    photo = apply_color_filter(photo, config['color'], 0.25)

    if template == 'movie_poster':
        photo = photo.resize((width, height), Image.LANCZOS)
        photo = apply_color_filter(photo, config['color'], 0.4)
        base = Image.alpha_composite(base, photo)
        overlay = Image.new('RGBA', (width, height), (0, 0, 0, 100))
        base = Image.alpha_composite(base, overlay)
        draw = ImageDraw.Draw(base)
        try:
            font_title = ImageFont.truetype("arial.ttf", 72)
            font_body = ImageFont.truetype("arial.ttf", 36)
        except Exception:
            font_title = ImageFont.load_default()
            font_body = ImageFont.load_default()
        draw.text((100, height - 250), config['label'], fill=(255, 255, 255, 230), font=font_title)
        display_text = text[:50] + ('...' if len(text) > 50 else '')
        draw.text((100, height - 150), display_text, fill=(255, 255, 255, 180), font=font_body)

    elif template == 'vintage_stamp':
        photo = photo.resize((700, 500), Image.LANCZOS)
        photo = photo.filter(ImageFilter.Sepia)
        photo = apply_color_filter(photo, '#D4A574', 0.15)
        stamp_border = Image.new('RGBA', (740, 540), (255, 255, 240, 200))
        base = Image.alpha_composite(base, stamp_border)
        base.paste(photo, (20, 20), photo)
        draw = ImageDraw.Draw(base)
        for offset in range(0, 740, 20):
            draw.ellipse([offset, 530, offset+15, 545], fill=(200, 180, 150, 150))
            draw.ellipse([offset, -5, offset+15, 10], fill=(200, 180, 150, 150))
        try:
            font_v = ImageFont.truetype("arial.ttf", 32)
        except Exception:
            font_v = ImageFont.load_default()
        draw.text((800, 200), config['label'], fill=(100, 80, 60, 200), font=font_v)
        draw.text((800, 260), text[:80], fill=(80, 60, 40, 160), font=font_v)

    elif template == 'minimal_geo':
        draw = ImageDraw.Draw(base)
        c = hex_to_rgb(config['color'])
        draw.rectangle([100, 100, 600, 500], fill=(*c, 40), outline=(*c, 80), width=2)
        draw.rectangle([700, 300, 1200, 700], fill=(255, 255, 255, 50), outline=(*c, 60), width=1)
        draw.line([(100, 500), (600, 500)], fill=(*c, 100), width=3)
        draw.line([(100, 100), (100, 500)], fill=(*c, 100), width=3)
        try:
            font_m = ImageFont.truetype("arial.ttf", 48)
        except Exception:
            font_m = ImageFont.load_default()
        draw.text((130, 520), config['label'], fill=(*c, 200), font=font_m)
        draw.text((130, 590), text[:60], fill=(80, 80, 80, 160), font=ImageFont.load_default())

    elif template == 'watercolor':
        for i in range(12):
            cx = int(width * (0.1 + 0.8 * (i / 12)))
            cy = int(height * (0.2 + 0.6 * ((i * 7) % 12 / 12)))
            blob_size = 150 + (i * 30)
            blob = Image.new('RGBA', (blob_size * 2, blob_size * 2), (0, 0, 0, 0))
            blob_draw = ImageDraw.Draw(blob)
            alpha = max(20, 60 - i * 3)
            blob_draw.ellipse([0, 0, blob_size * 2, blob_size * 2], fill=(*hex_to_rgb(config['color']), alpha))
            blob = blob.filter(ImageFilter.GaussianBlur(radius=40))
            base = Image.alpha_composite(base, blob)
        photo = photo.resize((500, 350), Image.LANCZOS)
        photo = photo.filter(ImageFilter.GaussianBlur(radius=2))
        photo = apply_color_filter(photo, config['color'], 0.2)
        base.paste(photo, (width // 2 - 250, height // 2 - 175), photo)
        draw = ImageDraw.Draw(base)
        try:
            font_w = ImageFont.truetype("arial.ttf", 42)
        except Exception:
            font_w = ImageFont.load_default()
        draw.text((150, 150), config['label'], fill=(255, 255, 255, 200), font=font_w)
        draw.text((150, 210), text[:60], fill=(255, 255, 255, 150), font=font_w)

    elif template == 'pixel_mosaic':
        pixel_size = 20
        draw = ImageDraw.Draw(base)
        c = hex_to_rgb(config['color'])
        import random
        random.seed(hash(text) % 1000)
        for x in range(0, width, pixel_size):
            for y in range(0, height, pixel_size):
                if random.random() < 0.3:
                    alpha = random.randint(20, 80)
                    draw.rectangle([x, y, x + pixel_size, y + pixel_size], fill=(*c, alpha))
        try:
            font_p = ImageFont.truetype("arial.ttf", 56)
        except Exception:
            font_p = ImageFont.load_default()
        draw.text((100, 100), config['label'], fill=(255, 255, 255, 220), font=font_p)
        draw.text((100, 180), text[:60], fill=(255, 255, 255, 160), font=font_p)

    emoji_y = height // 2
    emoji_x_start = width // 2 - len(emojis) * 60
    for idx, emoji_char in enumerate(emojis):
        try:
            emoji_img = Image.new('RGBA', (120, 120), (0, 0, 0, 0))
            emoji_draw = ImageDraw.Draw(emoji_img)
            emoji_draw.text((10, 10), emoji_char, fill=(255, 255, 255, 220))
            pos_x = emoji_x_start + idx * 120
            pos_y = emoji_y + int(40 * ((idx % 2) * 2 - 1))
            base.paste(emoji_img, (pos_x, pos_y), emoji_img)
        except Exception:
            pass

    filename = f"{uuid.uuid4().hex}.png"
    filepath = os.path.join(COLLAGE_DIR, filename)
    base.convert('RGB').save(filepath, 'PNG', quality=95)

    return f"/api/collage/{filename}"


@app.route('/api/diaries', methods=['GET'])
def get_diaries():
    month = request.args.get('month', '')
    conn = get_db()
    if month:
        start = f"{month}-01"
        if len(month.split('-')) == 2:
            y, m = month.split('-')
            if int(m) == 12:
                end = f"{int(y)+1}-01-01"
            else:
                end = f"{y}-{int(m)+1:02d}-01"
        else:
            end = f"{month}-32"
        rows = conn.execute(
            'SELECT * FROM diaries WHERE created_at >= ? AND created_at < ? ORDER BY created_at DESC',
            (start, end)
        ).fetchall()
    else:
        rows = conn.execute('SELECT * FROM diaries ORDER BY created_at DESC').fetchall()
    conn.close()
    result = []
    for row in rows:
        result.append({
            'id': row['id'],
            'emotion': row['emotion'],
            'text': row['text'],
            'emojis': json.loads(row['emojis_json']),
            'collageUrl': row['collage_url'],
            'template': row['template'],
            'createdAt': row['created_at'],
        })
    return jsonify(result)


@app.route('/api/diaries/<diary_id>', methods=['GET'])
def get_diary(diary_id):
    conn = get_db()
    row = conn.execute('SELECT * FROM diaries WHERE id = ?', (diary_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({
        'id': row['id'],
        'emotion': row['emotion'],
        'text': row['text'],
        'emojis': json.loads(row['emojis_json']),
        'collageUrl': row['collage_url'],
        'template': row['template'],
        'createdAt': row['created_at'],
    })


@app.route('/api/diaries', methods=['POST'])
def create_diary():
    data = request.json
    if not data or 'emotion' not in data or 'text' not in data:
        return jsonify({'error': 'Missing required fields'}), 400

    diary_id = str(uuid.uuid4())
    emojis = data.get('emojis', [])
    template = data.get('template', 'watercolor')
    now = datetime.now().isoformat()

    conn = get_db()
    conn.execute(
        'INSERT INTO diaries (id, emotion, text, emojis_json, template, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        (diary_id, data['emotion'], data['text'], json.dumps(emojis), template, now)
    )
    conn.commit()
    conn.close()

    return jsonify({
        'id': diary_id,
        'emotion': data['emotion'],
        'text': data['text'],
        'emojis': emojis,
        'collageUrl': None,
        'template': template,
        'createdAt': now,
    }), 201


@app.route('/api/diaries/<diary_id>', methods=['DELETE'])
def delete_diary(diary_id):
    conn = get_db()
    row = conn.execute('SELECT collage_url FROM diaries WHERE id = ?', (diary_id,)).fetchone()
    if row and row['collage_url']:
        filename = row['collage_url'].split('/')[-1]
        filepath = os.path.join(COLLAGE_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
    conn.execute('DELETE FROM diaries WHERE id = ?', (diary_id,))
    conn.commit()
    conn.close()
    return '', 204


@app.route('/api/collage/generate', methods=['POST'])
def generate_collage_api():
    data = request.json
    if not data or 'emotion' not in data:
        return jsonify({'error': 'Missing emotion'}), 400

    emotion = data['emotion']
    text = data.get('text', '')
    emojis = data.get('emojis', [])
    template = data.get('template', 'watercolor')

    collage_url = generate_collage(emotion, text, emojis, template)

    return jsonify({
        'collageUrl': collage_url,
        'template': template,
    })


@app.route('/api/collage/<filename>')
def serve_collage(filename):
    return send_from_directory(COLLAGE_DIR, filename)


@app.route('/api/stats', methods=['GET'])
def get_stats():
    month = request.args.get('month', '')
    conn = get_db()
    if month:
        start = f"{month}-01"
        y, m = month.split('-')
        if int(m) == 12:
            end = f"{int(y)+1}-01-01"
        else:
            end = f"{y}-{int(m)+1:02d}-01"
        rows = conn.execute(
            'SELECT emotion, created_at FROM diaries WHERE created_at >= ? AND created_at < ?',
            (start, end)
        ).fetchall()
    else:
        rows = conn.execute('SELECT emotion, created_at FROM diaries').fetchall()
    conn.close()
    result = [{'date': row['created_at'][:10], 'emotion': row['emotion']} for row in rows]
    return jsonify(result)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
