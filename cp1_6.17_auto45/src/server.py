from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import hashlib
import os
import time
import requests
from io import BytesIO
from PIL import Image
import random

app = Flask(__name__)
CORS(app)

CACHE_DIR = os.path.join(os.path.dirname(__file__), 'image_cache')
os.makedirs(CACHE_DIR, exist_ok=True)

FREE_IMAGE_SERVICES = [
    {
        'name': 'placehold_co',
        'url': 'https://placehold.co/512x512/png',
        'params': {'text': 'AI Comic'},
        'headers': {}
    },
    {
        'name': 'picsum',
        'url': 'https://picsum.photos/seed/{seed}/512/512',
        'params': {},
        'headers': {}
    }
]

STABLE_DIFFUSION_API = {
    'enabled': False,
    'url': 'https://stablediffusionapi.com/api/v3/text2img',
    'api_key': os.environ.get('STABLE_DIFFUSION_API_KEY', '')
}


def get_cache_key(prompt: str) -> str:
    return hashlib.md5(prompt.encode('utf-8')).hexdigest()


def get_cached_image(cache_key: str):
    cache_path = os.path.join(CACHE_DIR, f'{cache_key}.png')
    if os.path.exists(cache_path):
        mtime = os.path.getmtime(cache_path)
        with open(cache_path, 'rb') as f:
            return f.read(), mtime
    return None, None


def save_to_cache(cache_key: str, image_data: bytes):
    cache_path = os.path.join(CACHE_DIR, f'{cache_key}.png')
    with open(cache_path, 'wb') as f:
        f.write(image_data)


def generate_comic_style_overlay(image_data: bytes) -> bytes:
    try:
        img = Image.open(BytesIO(image_data)).convert('RGB')
        width, height = img.size

        from PIL import ImageDraw, ImageFont, ImageFilter

        img = img.filter(ImageFilter.SHARPEN)
        img = img.filter(ImageFilter.EDGE_ENHANCE_MORE)

        import numpy as np
        arr = np.array(img)
        arr = np.clip(arr * 1.1 - 20, 0, 255).astype(np.uint8)
        img = Image.fromarray(arr)

        halftone = Image.new('RGB', (width, height), (255, 255, 255))
        draw = ImageDraw.Draw(halftone)
        for x in range(0, width, 6):
            for y in range(0, height, 6):
                r, g, b = img.getpixel((x, y))
                brightness = (r + g + b) / 3
                size = int((1 - brightness / 255) * 3)
                if size > 0:
                    fill = (int(r * 0.7), int(g * 0.7), int(b * 0.7))
                    draw.ellipse([x - size, y - size, x + size, y + size], fill=fill)

        img = Image.blend(img, halftone, 0.15)

        draw = ImageDraw.Draw(img)
        draw.rectangle([2, 2, width - 3, height - 3], outline=(0, 0, 0), width=3)

        output = BytesIO()
        img.save(output, format='PNG')
        return output.getvalue()
    except Exception as e:
        print(f'Error applying comic style: {e}')
        return image_data


def fetch_from_free_service(prompt: str, timeout: int = 8) -> bytes:
    seed = abs(hash(prompt)) % 100000

    for service in FREE_IMAGE_SERVICES:
        try:
            if service['name'] == 'picsum':
                url = service['url'].format(seed=seed)
            else:
                url = service['url']

            display_prompt = prompt[:20] if len(prompt) > 20 else prompt
            params = {**service['params'], 'text': f'Comic: {display_prompt}'}

            response = requests.get(
                url,
                params=params,
                headers=service['headers'],
                timeout=timeout
            )

            if response.status_code == 200 and response.content:
                return generate_comic_style_overlay(response.content)
        except Exception as e:
            print(f'Service {service["name"]} failed: {e}')
            continue

    return generate_placeholder_image(prompt)


def generate_placeholder_image(prompt: str) -> bytes:
    img = Image.new('RGB', (512, 512), color=(240, 235, 225))
    draw = ImageDraw.Draw(img)

    colors = [(255, 200, 150), (200, 230, 255), (220, 255, 220), (255, 220, 240)]
    for _ in range(15):
        shape_type = random.choice(['circle', 'rect', 'star'])
        color = random.choice(colors)
        x1 = random.randint(0, 450)
        y1 = random.randint(0, 450)
        size = random.randint(30, 80)

        if shape_type == 'circle':
            draw.ellipse([x1, y1, x1 + size, y1 + size], fill=color, outline=(50, 50, 50), width=2)
        elif shape_type == 'rect':
            draw.rectangle([x1, y1, x1 + size, y1 + size], fill=color, outline=(50, 50, 50), width=2)

    try:
        font = ImageFont.truetype('arial.ttf', 16)
    except:
        font = ImageFont.load_default()

    lines = []
    current_line = ''
    words = prompt.split() if ' ' in prompt else list(prompt)
    for word in words:
        test_line = current_line + word + ' '
        if len(test_line) <= 20:
            current_line = test_line
        else:
            lines.append(current_line.strip())
            current_line = word + ' '
    if current_line:
        lines.append(current_line.strip())

    y_offset = 200
    for line in lines[:5]:
        draw.text((256, y_offset), line, fill=(30, 30, 30), font=font, anchor='mm')
        y_offset += 25

    draw.text((256, 450), 'AI Comic Generation', fill=(100, 100, 100), font=font, anchor='mm')
    draw.rectangle([5, 5, 507, 507], outline=(30, 30, 30), width=4)

    output = BytesIO()
    img.save(output, format='PNG')
    return output.getvalue()


def fetch_from_stable_diffusion(prompt: str, timeout: int = 8) -> bytes:
    if not STABLE_DIFFUSION_API['enabled'] or not STABLE_DIFFUSION_API['api_key']:
        return None

    try:
        comic_prompt = f'manga style, comic book illustration, {prompt}, 512x512, high quality'
        payload = {
            'key': STABLE_DIFFUSION_API['api_key'],
            'prompt': comic_prompt,
            'negative_prompt': 'blurry, low quality, photographic',
            'width': '512',
            'height': '512',
            'samples': '1',
            'num_inference_steps': '20',
            'guidance_scale': 7.5,
        }

        response = requests.post(
            STABLE_DIFFUSION_API['url'],
            json=payload,
            timeout=timeout
        )

        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success' and data.get('output'):
                img_url = data['output'][0]
                img_response = requests.get(img_url, timeout=5)
                if img_response.status_code == 200:
                    return img_response.content
    except Exception as e:
        print(f'Stable Diffusion API error: {e}')

    return None


@app.route('/api/generate', methods=['POST'])
def generate_image():
    start_time = time.time()
    data = request.get_json()

    if not data or 'prompt' not in data:
        return jsonify({'error': 'Prompt is required'}), 400

    prompt = data['prompt'].strip()
    if len(prompt) > 300:
        return jsonify({'error': 'Prompt must be less than 300 characters'}), 400

    cache_key = get_cache_key(prompt)

    cached_data, cached_time = get_cached_image(cache_key)
    if cached_data:
        elapsed = time.time() - start_time
        return jsonify({
            'success': True,
            'image': cached_data.hex(),
            'cached': True,
            'generation_time': round(elapsed, 2),
            'prompt': prompt
        })

    for attempt in range(2):
        try:
            remaining_time = max(1, 8 - (time.time() - start_time))

            sd_image = fetch_from_stable_diffusion(prompt, timeout=int(remaining_time))
            if sd_image:
                image_data = sd_image
                break

            image_data = fetch_from_free_service(prompt, timeout=int(remaining_time))
            break

        except Exception as e:
            if attempt == 1:
                image_data = generate_placeholder_image(prompt)
                break
            time.sleep(0.5)
            continue

    try:
        save_to_cache(cache_key, image_data)
    except Exception as e:
        print(f'Cache save error: {e}')

    elapsed = time.time() - start_time

    return jsonify({
        'success': True,
        'image': image_data.hex(),
        'cached': False,
        'generation_time': round(elapsed, 2),
        'prompt': prompt
    })


@app.route('/api/cache/<cache_key>', methods=['GET'])
def get_cached_image_endpoint(cache_key: str):
    cached_data, _ = get_cached_image(cache_key)
    if cached_data:
        return jsonify({
            'success': True,
            'image': cached_data.hex()
        })
    return jsonify({'success': False, 'error': 'Not found'}), 404


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'cache_size': len(os.listdir(CACHE_DIR))
    })


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=False, threaded=True)
