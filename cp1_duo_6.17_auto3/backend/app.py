import io
import base64
import uuid
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np

app = Flask(__name__)
CORS(app)

code_submissions = {}
annotations = {}


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def parse_base64_image(b64_string):
    if b64_string.startswith('data:image'):
        b64_string = b64_string.split(',')[1]
    image_data = base64.b64decode(b64_string)
    image = Image.open(io.BytesIO(image_data)).convert('RGB')
    return image


def image_to_base64(image, format='PNG'):
    buffer = io.BytesIO()
    image.save(buffer, format=format)
    b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f'data:image/{format.lower()};base64,{b64}'


def find_diff_regions(diff_mask, min_region_size=100):
    diff_pixels = np.argwhere(diff_mask)
    if len(diff_pixels) == 0:
        return []

    visited = set()
    regions = []

    for y, x in diff_pixels:
        if (y, x) in visited:
            continue

        stack = [(y, x)]
        region_pixels = []
        while stack:
            cy, cx = stack.pop()
            if (cy, cx) in visited:
                continue
            if not (0 <= cy < diff_mask.shape[0] and 0 <= cx < diff_mask.shape[1]):
                continue
            if not diff_mask[cy, cx]:
                continue

            visited.add((cy, cx))
            region_pixels.append((cy, cx))

            for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                stack.append((cy + dy, cx + dx))

        if len(region_pixels) >= min_region_size:
            ys = [p[0] for p in region_pixels]
            xs = [p[1] for p in region_pixels]
            regions.append({
                'x': int(min(xs)),
                'y': int(min(ys)),
                'width': int(max(xs) - min(xs) + 1),
                'height': int(max(ys) - min(ys) + 1)
            })

    return regions


def create_striped_overlay(width, height, diff_mask):
    base_img = Image.new('RGB', (width, height), (255, 255, 255))
    base_array = np.array(base_img, dtype=np.uint8)

    stripe_pattern = np.zeros((height, width, 3), dtype=np.uint8)
    stripe_pattern[:, :, :] = [255, 0, 0]

    stripe_mask = np.zeros((height, width), dtype=bool)
    for y in range(height):
        for x in range(width):
            if (x + y) % 10 < 5:
                stripe_mask[y, x] = True

    alpha = 0.5
    result = base_array.copy()

    for c in range(3):
        diff_stripe = diff_mask & stripe_mask
        result[:, :, c] = np.where(
            diff_stripe,
            (base_array[:, :, c].astype(float) * (1 - alpha) + stripe_pattern[:, :, c].astype(float) * alpha).astype(np.uint8),
            base_array[:, :, c]
        )

    return Image.fromarray(result)


@app.route('/upload', methods=['POST'])
def upload_code():
    data = request.get_json()
    if not data or 'code' not in data:
        return jsonify({'error': 'No code provided'}), 400

    submission_id = str(uuid.uuid4())
    code = data['code']
    filename = data.get('filename', 'submission.html')

    submission = {
        'id': submission_id,
        'code': code,
        'filename': filename,
        'createdAt': utc_now()
    }

    code_submissions[submission_id] = submission
    annotations[submission_id] = []

    return jsonify(submission), 201


@app.route('/code/<submission_id>', methods=['GET'])
def get_code(submission_id):
    submission = code_submissions.get(submission_id)
    if not submission:
        return jsonify({'error': 'Submission not found'}), 404
    return jsonify(submission)


@app.route('/annotations', methods=['GET'])
def get_annotations():
    submission_id = request.args.get('submissionId')
    if not submission_id:
        return jsonify({'error': 'submissionId is required'}), 400

    anns = annotations.get(submission_id, [])
    return jsonify(anns)


@app.route('/annotations', methods=['POST'])
def create_annotation():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    submission_id = data.get('submissionId')
    if not submission_id:
        return jsonify({'error': 'submissionId is required'}), 400

    annotation_id = str(uuid.uuid4())
    annotation = {
        'id': annotation_id,
        'type': data.get('type', 'suggestion'),
        'text': data.get('text', ''),
        'selection': data.get('selection', {}),
        'codeSnippet': data.get('codeSnippet', ''),
        'submissionId': submission_id,
        'createdAt': utc_now()
    }

    if submission_id not in annotations:
        annotations[submission_id] = []
    annotations[submission_id].append(annotation)

    return jsonify(annotation), 201


@app.route('/annotations/<annotation_id>', methods=['DELETE'])
def delete_annotation_route(annotation_id):
    for submission_id, anns in annotations.items():
        for i, ann in enumerate(anns):
            if ann['id'] == annotation_id:
                anns.pop(i)
                return jsonify({'message': 'Annotation deleted'}), 200
    return jsonify({'error': 'Annotation not found'}), 404


@app.route('/diff', methods=['POST'])
def compute_diff():
    data = request.get_json()
    if not data or 'originalImage' not in data or 'modifiedImage' not in data:
        return jsonify({'error': 'Both originalImage and modifiedImage are required'}), 400

    try:
        original_img = parse_base64_image(data['originalImage'])
        modified_img = parse_base64_image(data['modifiedImage'])

        width = max(original_img.width, modified_img.width)
        height = max(original_img.height, modified_img.height)

        original_resized = original_img.resize((width, height), Image.LANCZOS)
        modified_resized = modified_img.resize((width, height), Image.LANCZOS)

        original_arr = np.array(original_resized, dtype=np.int16)
        modified_arr = np.array(modified_resized, dtype=np.int16)

        diff = np.abs(original_arr - modified_arr)
        diff_gray = np.mean(diff, axis=2)

        threshold = 20
        diff_mask = diff_gray > threshold

        diff_pixels = int(np.sum(diff_mask))

        diff_regions = find_diff_regions(diff_mask, min_region_size=50)

        diff_overlay = create_striped_overlay(width, height, diff_mask)

        diff_image_b64 = image_to_base64(diff_overlay)

        return jsonify({
            'diffImage': diff_image_b64,
            'diffPixels': diff_pixels,
            'diffRegions': diff_regions,
            'imageWidth': width,
            'imageHeight': height
        })

    except Exception as e:
        return jsonify({'error': f'Diff computation failed: {str(e)}'}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': utc_now()})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
