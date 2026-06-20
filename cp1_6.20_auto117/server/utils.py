import uuid
import os
from io import BytesIO
from PIL import Image
from werkzeug.security import generate_password_hash, check_password_hash


def generate_id():
    return uuid.uuid4().hex


hash_password = generate_password_hash
verify_password = check_password_hash


def compress_image(file, max_size=500 * 1024, max_long_edge=800):
    img = Image.open(file)

    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')

    w, h = img.size
    if max(w, h) > max_long_edge:
        ratio = max_long_edge / max(w, h)
        new_w = int(w * ratio)
        new_h = int(h * ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)

    quality = 85
    buf = BytesIO()
    img.save(buf, format='JPEG', quality=quality)
    while buf.tell() > max_size and quality > 20:
        quality -= 5
        buf = BytesIO()
        img.save(buf, format='JPEG', quality=quality)

    buf.seek(0)
    return buf


def save_uploaded_images(files, upload_folder):
    os.makedirs(upload_folder, exist_ok=True)
    filenames = []
    for f in files:
        if not f or not f.filename:
            continue
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in ('.jpg', '.jpeg', '.png', '.gif', '.webp'):
            continue
        compressed = compress_image(f)
        filename = generate_id() + '.jpg'
        filepath = os.path.join(upload_folder, filename)
        with open(filepath, 'wb') as out:
            out.write(compressed.read())
        filenames.append(filename)
    return filenames
