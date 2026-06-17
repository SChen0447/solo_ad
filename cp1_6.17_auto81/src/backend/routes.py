import os
import uuid
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from imageProcessor import extract_component_properties

api_bp = Blueprint('api', __name__)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
MAX_CONTENT_LENGTH = 5 * 1024 * 1024

annotations_storage = {}
uploaded_images = {}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename: str) -> bool:
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@api_bp.route('/upload', methods=['POST'])
def upload_design():
    """
    处理设计稿文件上传
    
    数据流向：接收前端请求 → 保存文件 → 返回文件信息
    """
    if 'file' not in request.files:
        return jsonify({'error': '没有上传文件'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
    
    if file.content_length > MAX_CONTENT_LENGTH:
        return jsonify({'error': '文件大小不能超过5MB'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_id = str(uuid.uuid4())
        
        filepath = os.path.join(UPLOAD_FOLDER, f"{file_id}_{filename}")
        file.save(filepath)
        
        try:
            from PIL import Image
            with Image.open(filepath) as img:
                width, height = img.size
        except Exception:
            width, height = 0, 0
        
        uploaded_images[file_id] = {
            'id': file_id,
            'filename': filename,
            'filepath': filepath,
            'width': width,
            'height': height
        }
        
        return jsonify({
            'success': True,
            'fileId': file_id,
            'filename': filename,
            'width': width,
            'height': height
        })
    
    return jsonify({'error': '不支持的文件格式，请上传PNG或JPG文件'}), 400

@api_bp.route('/extract', methods=['POST'])
def extract_component():
    """
    模拟图像分割和组件属性提取
    
    数据流向：接收前端框选数据 → 调用imageProcessor → 返回模拟属性
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': '请求数据为空'}), 400
    
    required_fields = ['imageBase64', 'bbox']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'缺少必填字段: {field}'}), 400
    
    image_base64 = data['imageBase64']
    bbox = data['bbox']
    
    if len(bbox) != 4:
        return jsonify({'error': 'bbox格式错误，需要[x, y, width, height]'}), 400
    
    properties = extract_component_properties(image_base64, tuple(bbox))
    
    component_id = str(uuid.uuid4())
    properties['id'] = component_id
    
    return jsonify({
        'success': True,
        'component': properties
    })

@api_bp.route('/save', methods=['POST'])
def save_annotations():
    """
    保存最终注解数据到内存字典中
    
    数据流向：接收前端注解数据 → 保存到内存 → 返回保存结果
    """
    data = request.get_json()
    
    if not data or 'components' not in data:
        return jsonify({'error': '请求数据格式错误'}), 400
    
    annotation_id = str(uuid.uuid4())
    annotations_storage[annotation_id] = {
        'id': annotation_id,
        'components': data['components'],
        'createdAt': data.get('createdAt')
    }
    
    return jsonify({
        'success': True,
        'annotationId': annotation_id,
        'componentCount': len(data['components'])
    })

@api_bp.route('/annotations/<annotation_id>', methods=['GET'])
def get_annotation(annotation_id: str):
    """获取保存的注解数据"""
    if annotation_id not in annotations_storage:
        return jsonify({'error': '注解不存在'}), 404
    
    return jsonify(annotations_storage[annotation_id])
