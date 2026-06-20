import os
import io
import base64
from werkzeug.utils import secure_filename
from pypdf import PdfReader
from ebooklib import epub
from PIL import Image

ALLOWED_EXTENSIONS = {'pdf', 'epub'}
MAX_FILE_SIZE = 50 * 1024 * 1024


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_file(file_storage):
    if not file_storage or not file_storage.filename:
        return False, '请选择文件'

    if not allowed_file(file_storage.filename):
        return False, '只支持PDF和EPUB格式'

    file_storage.seek(0, os.SEEK_END)
    size = file_storage.tell()
    file_storage.seek(0)

    if size > MAX_FILE_SIZE:
        return False, '文件大小不能超过50MB'

    return True, None


def get_file_type(filename):
    ext = filename.rsplit('.', 1)[1].lower()
    return ext


def save_uploaded_file(file_storage, upload_dir, book_id):
    book_dir = os.path.join(upload_dir, str(book_id))
    os.makedirs(book_dir, exist_ok=True)

    filename = secure_filename(file_storage.filename)
    file_path = os.path.join(book_dir, filename)
    file_storage.save(file_path)

    return file_path


def extract_pdf_metadata(file_path):
    title = 'Unknown Title'
    author = 'Unknown Author'
    total_pages = 0
    cover_base64 = None

    try:
        reader = PdfReader(file_path)
        total_pages = len(reader.pages)

        if reader.metadata:
            if reader.metadata.get('/Title'):
                title = str(reader.metadata['/Title'])
            if reader.metadata.get('/Author'):
                author = str(reader.metadata['/Author'])

        if total_pages > 0:
            first_page = reader.pages[0]
            images = first_page.images
            if images:
                img = images[0]
                cover_base64 = _image_to_base64(img.data)
            else:
                text = first_page.extract_text()
                if text:
                    lines = [l.strip() for l in text.split('\n') if l.strip()]
                    if lines and title == 'Unknown Title':
                        title = lines[0][:100]

    except Exception as e:
        print(f"Error extracting PDF metadata: {e}")

    if title == 'Unknown Title':
        base_name = os.path.basename(file_path)
        title = os.path.splitext(base_name)[0]

    return title, author, total_pages, cover_base64


def extract_epub_metadata(file_path):
    title = 'Unknown Title'
    author = 'Unknown Author'
    total_pages = 0
    cover_base64 = None

    try:
        book = epub.read_epub(file_path)

        if book.get_metadata('DC', 'title'):
            title = book.get_metadata('DC', 'title')[0][0]
        if book.get_metadata('DC', 'creator'):
            author = book.get_metadata('DC', 'creator')[0][0]

        for item in book.get_items():
            if hasattr(item, 'get_type'):
                if item.get_type() == 9:
                    total_pages += 1

        cover_item = None
        for item in book.get_items():
            if hasattr(item, 'get_type') and item.get_type() == 3:
                if 'cover' in (item.get_name() or '').lower():
                    cover_item = item
                    break

        if cover_item is None:
            for item in book.get_items_of_media_type():
                media_type = getattr(item, 'media_type', '')
                if media_type and 'image' in media_type:
                    cover_item = item
                    break

        if cover_item is None:
            for item in book.get_items():
                if hasattr(item, 'media_type') and 'image' in item.media_type:
                    cover_item = item
                    break

        if cover_item and hasattr(cover_item, 'get_content'):
            cover_data = cover_item.get_content()
            cover_base64 = _image_to_base64(cover_data)

    except Exception as e:
        print(f"Error extracting EPUB metadata: {e}")

    if title == 'Unknown Title':
        base_name = os.path.basename(file_path)
        title = os.path.splitext(base_name)[0]

    if total_pages == 0:
        total_pages = 100

    return title, author, total_pages, cover_base64


def _image_to_base64(image_data):
    try:
        img = Image.open(io.BytesIO(image_data))
        if img.mode in ('RGBA', 'P', 'LA'):
            img = img.convert('RGB')

        max_size = (300, 400)
        img.thumbnail(max_size, Image.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=75)
        buffer.seek(0)
        b64 = base64.b64encode(buffer.read()).decode('utf-8')
        return f'data:image/jpeg;base64,{b64}'
    except Exception as e:
        print(f"Error converting image: {e}")
        return None


def extract_metadata(file_path, file_type):
    if file_type == 'pdf':
        return extract_pdf_metadata(file_path)
    elif file_type == 'epub':
        return extract_epub_metadata(file_path)
    else:
        base_name = os.path.basename(file_path)
        title = os.path.splitext(base_name)[0]
        return title, 'Unknown Author', 0, None
